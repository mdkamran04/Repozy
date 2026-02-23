import { Cashfree, CFEnvironment } from "cashfree-pg";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db"; 
import { createHmac, timingSafeEqual } from "crypto";

const cashfreeInstance = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID!,
  process.env.CASHFREE_SECRET_KEY!
);

const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const ALLOW_WEBHOOK_BYPASS = process.env.ALLOW_WEBHOOK_BYPASS === "true";

/**
 * Safe constant-time equality that tolerates different length inputs.
 */
function safeEquals(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a || "", "utf8");
    const bufB = Buffer.from(b || "", "utf8");

    // timingSafeEqual requires equal length; compare hashes if lengths differ
    if (bufA.length !== bufB.length) {
      const hashA = createHmac("sha256", "fixed-key").update(bufA).digest();
      const hashB = createHmac("sha256", "fixed-key").update(bufB).digest();
      return timingSafeEqual(hashA, hashB);
    }
    return timingSafeEqual(bufA, bufB);
  } catch (e) {
    console.error("safeEquals error", e);
    return false;
  }
}

function computeHmacBase64(secret: string, input: string) {
  return createHmac("sha256", secret).update(input).digest("base64");
}

/**
 * Try two common verification strategies:
 * 1) concatenated sorted values of webhookData (documented approach)
 * 2) rawBody HMAC (fallback)
 *
 * Returns { valid, method } for logging/debugging.
 */
function verifyCashfreeSignatureFlexible(
  receivedSignature: string,
  webhookData: any,
  rawBody: string,
  secret: string
): { valid: boolean; method?: "sorted-values" | "raw-body" } {
  try {
    // strategy 1: sorted-values from webhookData
    if (webhookData && typeof webhookData === "object") {
      const sortedKeys = Object.keys(webhookData).sort();
      let postDataString = "";
      for (const key of sortedKeys) {
        postDataString += String(webhookData[key] ?? "");
      }
      const computed1 = computeHmacBase64(secret, postDataString);
      if (safeEquals(computed1, receivedSignature)) {
        console.log("Signature verified with sorted-values method.");
        return { valid: true, method: "sorted-values" };
      }
    }

    // strategy 2: raw body
    if (rawBody) {
      const computed2 = computeHmacBase64(secret, rawBody);
      if (safeEquals(computed2, receivedSignature)) {
        console.log("Signature verified with raw-body method.");
        return { valid: true, method: "raw-body" };
      }
    }

    console.warn("Signature verification failed for both methods.");
    return { valid: false };
  } catch (err) {
    console.error("verifyCashfreeSignatureFlexible error", err);
    return { valid: false };
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Quick reachability log (be careful with logs in prod)
  console.log("--- Cashfree Webhook Received RAW BODY ---");

  if (!CASHFREE_SECRET_KEY) {
    console.error("CASHFREE_SECRET_KEY not set.");
    return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch (error) {
    console.error("Invalid JSON body", error);
    // Return 200 to avoid retries for malformed payloads, but alert separately in logs/monitoring.
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 200 });
  }

  // --- Determine webhook type
  const webhookType = data?.type;
  const FULFILLMENT_WEBHOOK_TYPES = [
    "PAYMENT_SUCCESS_WEBHOOK",
    "ORDER_PAID",
    "PAYMENT_FAILED_WEBHOOK",
    "PAYMENT_FAILED",
    "SUCCESS_PAYMENT", // some event naming variations
  ];
  const requiresFulfillment = FULFILLMENT_WEBHOOK_TYPES.includes(webhookType);

  if (!requiresFulfillment) {
    console.log(`Webhook type ${webhookType} ignored (no fulfillment).`);
    return NextResponse.json({ message: `Webhook type ${webhookType} ignored.` }, { status: 200 });
  }

  // Read signature header
  const signature = req.headers.get("x-cf-signature");

  // Dev bypass: only if explicit env var set
  if (!signature && ALLOW_WEBHOOK_BYPASS) {
    console.warn(`WARNING: ALLOW_WEBHOOK_BYPASS enabled: skipping signature check for ${webhookType}`);
  } else if (!signature) {
    console.error(`Missing x-cf-signature for required webhook type: ${webhookType}.`);
    return NextResponse.json({ message: "Missing Signature" }, { status: 400 });
  } else {
    const verification = verifyCashfreeSignatureFlexible(signature, data.data, rawBody, CASHFREE_SECRET_KEY);
    if (!verification.valid) {
      console.error("Invalid signature: Verification failed.");
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }
    // optionally: log verification.method if you want analytics on which method matches
  }

  // --- Extract order/payment data
  const orderData = data?.data?.order ?? data?.data; // be tolerant if event shape vary
  const paymentObj = data?.data?.payment ?? data?.data; // fallback spots
  const paymentStatus = (orderData?.order_status ?? paymentObj?.payment_status ?? "").toString();
  const orderId = orderData?.order_id ?? data?.data?.orderId ?? data?.data?.order_id;
  const orderNote = orderData?.order_note;

  // attempt to extract cf payment id from several possible fields
  const cfPaymentId =
    paymentObj?.cf_payment_id ??
    paymentObj?.payment_id ??
    data?.data?.cf_payment_id ??
    data?.data?.payment_id ??
    (data?.data?.cfPaymentId ?? undefined);

  // Additional metadata: new custom_data field or order_note
  const customDataString = orderData?.order_meta?.custom_data ?? undefined;

  console.log(`Fulfillment started: Order ID ${orderId}, Payment ID ${cfPaymentId}, Status ${paymentStatus}`);

  // Parse metadata: order_note takes precedence, fallback to custom_data
  let metadata: { creditsToPurchase?: number; userId?: string } = {};
  try {
    const hasOrderNote = orderNote && typeof orderNote === "string" && orderNote !== "{}";
    const metadataString = hasOrderNote ? orderNote : customDataString;
    metadata = JSON.parse(metadataString && typeof metadataString === "string" ? metadataString : "{}");
  } catch (e) {
    console.error(`Invalid metadata in order for ${orderId}`, e);
    return NextResponse.json({ message: "Error parsing order metadata" }, { status: 200 });
  }

  const credits = Number(metadata?.creditsToPurchase);
  const userId = metadata?.userId;
  if (!userId || !credits || isNaN(credits)) {
    console.error(`🔴 METADATA ERROR: Missing userId or credits in metadata for order ${orderId}`, metadata);
    return NextResponse.json({ message: "Missing userId or credits in metadata" }, { status: 200 });
  }

  // Normalize statuses and success set
  const SUCCESS_STATUSES = ["PAID", "SUCCESS", "ORDER_PAID"];
  const normalizedPaymentStatus = paymentStatus?.toUpperCase();

  // Verify user exists
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existingUser) {
    console.error(`🔴 DB ERROR: User ID ${userId} does not exist. Aborting.`);
    return NextResponse.json({ message: "User not found for fulfillment" }, { status: 200 });
  }

  // Ensure we have a payment attempt id (cfPaymentId) for idempotency
  if (!cfPaymentId || typeof cfPaymentId !== "string" || cfPaymentId.trim() === "") {
    console.error("Missing cfPaymentId (payment attempt id) in webhook payload. Cannot guarantee idempotency.");
    // We still store the event as best-effort, but do not proceed to fulfill without unique attempt id.
    return NextResponse.json({ message: "Missing payment attempt id (cfPaymentId)" }, { status: 200 });
  }

  // --- Fulfillment transaction using cfPaymentId uniqueness + order-level fulfillment check
  try {
    await db.$transaction(async (tx) => {
      // 1) create attempt record; cfPaymentId is unique in DB schema
      await tx.cashfreeTransaction.create({
        data: {
          orderId: orderId ?? "unknown",
          cfPaymentId,
          status: paymentStatus ?? "",
          rawPayload: data,
          userId,
          credits,
        },
      });

      // 2) if payment successful and order not already fulfilled -> fulfill
      if (normalizedPaymentStatus && SUCCESS_STATUSES.includes(normalizedPaymentStatus)) {
        // Upsert order row (CashfreeOrder) and check previous fulfilled state
        const existingOrder = await tx.cashfreeOrder.findUnique({
          where: { orderId },
          select: { orderId: true, isFulfilled: true },
        });

        if (!existingOrder || !existingOrder.isFulfilled) {
          // increment user credits
          await tx.user.update({
            where: { id: userId },
            data: { credits: { increment: credits } },
          });
          // mark order as fulfilled
          await tx.cashfreeOrder.upsert({
            where: { orderId },
            create: { orderId, isFulfilled: true, fulfilledAt: new Date(), userId },
            update: { isFulfilled: true, fulfilledAt: new Date() },
          });
          console.log(`[SUCCESS] Credits updated: +${credits} for user ${userId} [FULFILLMENT COMPLETE for order ${orderId}]`);
        } else {
          console.log(`Order ${orderId} already fulfilled; skipping credit increment.`);
        }
      } else {
        console.warn(`WARNING: Payment status "${paymentStatus}" did not match success criteria. Fulfillment skipped.`);
      }
    });

    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });
  } catch (dbError: any) {
    // Unique constraint violation on cfPaymentId -> already processed
    if (dbError?.code === "P2002" || (dbError?.message && dbError.message.includes("unique constraint"))) {
      console.warn(`🟡 Duplicate webhook for payment ${cfPaymentId} detected. Already processed.`);
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    console.error("🛑 Unexpected Database error during fulfillment:", dbError);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
