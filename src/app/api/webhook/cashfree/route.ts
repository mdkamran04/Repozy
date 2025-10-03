import { Cashfree, CFEnvironment } from "cashfree-pg";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createHmac } from "crypto";
// import { isNativeError } from "util/types"; // Not used, can be removed

// NOTE: The Cashfree documentation states the signature is computed on the
// sorted, concatenated values of the webhook payload, not the raw body.
// We must implement that specific logic.

// Initialize Cashfree client (kept as is, for consistency with your working file)
const cashfreeInstance = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID!,
  process.env.CASHFREE_SECRET_KEY!
);

// We use the SECRET_KEY for webhook verification as per the Cashfree docs
// (often referred to as 'clientSecret').
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  
  // CRITICAL LOG: Check if the webhook request reached the server
  console.log("--- Cashfree Webhook Received RAW BODY ---", rawBody); 

  if (!CASHFREE_SECRET_KEY) {
    console.error("CASHFREE_SECRET_KEY not set.");
    return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch (error) {
    console.error("Invalid JSON body", error);
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 200 });
  }
  
  // --- Determine Webhook Type for Conditional Logic ---
  const webhookType = data?.type;
  
  // Define which webhooks require signature verification and fulfillment
  const FULFILLMENT_WEBHOOK_TYPES = [
      "ORDER_PAID", // Primary event for successful payment
      "PAYMENT_SUCCESS",
      "PAYMENT_FAILED",
      // Add other transaction-status webhooks here if needed
  ];
  
  const requiresFulfillment = FULFILLMENT_WEBHOOK_TYPES.includes(webhookType);
  
  if (requiresFulfillment) {
      // FIX: Access headers directly from the req object
      const signature = req.headers.get("x-cf-signature");
      
      if (!signature) {
          console.error(`Missing x-cf-signature for required webhook type: ${webhookType}. Discarding request.`);
          // Mandatory signature check failed
          return NextResponse.json({ message: "Missing Signature" }, { status: 400 });
      }

      // ---- Manual signature verification check (CORRECTED) ----
      // Signature is calculated on the 'data' field of the payload.
      const isSignatureValid = verifyCashfreeSignature(signature, data.data, CASHFREE_SECRET_KEY);
      if (!isSignatureValid) {
          console.error("Invalid signature: Verification failed. Secret Mismatch LIKELY.");
          // Return 401 Unauthorized to trigger Cashfree retries for security reasons
          return NextResponse.json({ message: "Invalid signature" }, { status: 401 }); 
      }
      // Signature is valid, proceed with processing.
  } else {
      // Skip processing for non-transaction webhooks (like PAYMENT_CHARGES_WEBHOOK)
      console.log(`Webhook type ${webhookType} received but does not require fulfillment/signature check. Responding 200.`);
      return NextResponse.json({ message: `Webhook type ${webhookType} ignored.` }, { status: 200 });
  }

  // --- Data Extraction (Only runs if requiresFulfillment is true) ---
  const orderData = data?.data?.order;
  const paymentStatus = orderData?.order_status;
  const orderId = orderData?.order_id;
  const orderNote = orderData?.order_note;

  console.log(`Fulfillment started: Order ID ${orderId}, Status ${paymentStatus}`);
  

  let metadata: { creditsToPurchase?: number; userId?: string } = {};
  try {
    // Ensure orderNote is a string before parsing
    metadata = JSON.parse(orderNote && typeof orderNote === 'string' ? orderNote : "{}"); 
  } catch (e) {
    console.error(`Invalid metadata in order_note for ${orderId}`, e);
    return NextResponse.json({ message: "Error parsing order metadata" }, { status: 200 });
  }

  const credits = Number(metadata?.creditsToPurchase);
  const userId = metadata?.userId;
  if (!userId || !credits || isNaN(credits)) {
    console.error(`Invalid metadata for order ${orderId}`, metadata);
    // Return 200 to prevent retries for non-retryable application errors
    return NextResponse.json({ message: "Missing userId or credits in metadata" }, { status: 200 }); 
  }

  // --- Fulfillment using Database Unique Constraint for Idempotency ---
  try {
    // We now rely purely on the unique 'orderId' constraint (P2002) for idempotency.
    await db.$transaction(async (tx) => {
      
      // 1. Create the transaction record first
      await tx.cashfreeTransaction.create({
        data: {
          orderId,
          status: paymentStatus,
          rawPayload: data, // Store the full parsed data
          userId,
          credits,
        },
      });

      // 2. Fulfill credits only if payment is PAID
      if (paymentStatus === "PAID") {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: credits } },
        });
        console.log(`Credits updated: +${credits} for user ${userId}`);
      }
    });

    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });
    
  } catch (dbError: any) {
    if (dbError.code === "P2002") {
      // P2002 is the unique constraint violation: transaction already exists.
      console.warn(`Duplicate webhook for order ${orderId} caught by DB unique constraint.`);
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }
    
    // Log unexpected DB errors
    console.error("Database error during fulfillment (Likely connection issue or missing user):", dbError);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// -------------------------------------------------------------
//                ✅ CORRECTED SIGNATURE LOGIC ✅
// -------------------------------------------------------------

/**
 * **Correct** Cashfree webhook signature verification.
 * * Logic: 
 * 1. Sort the object keys.
 * 2. Concatenate the values (postData).
 * 3. HMAC-SHA256 postData using the secret key, then Base64 encode.
 * * @param signature The signature received in the 'x-cf-signature' header.
 * @param webhookData The 'data' object *inside* the webhook payload.
 * @param secret The Cashfree Secret Key (clientSecret).
 * @returns boolean True if the computed signature matches the received signature.
 */
function verifyCashfreeSignature(signature: string, webhookData: any, secret: string): boolean {
  try {
    // 1. Sort keys
    const sortedKeys = Object.keys(webhookData).sort();
    
    // 2. Concatenate values
    let postDataString = "";
    for (const key of sortedKeys) {
        // Cashfree always converts values to string for concatenation
        postDataString += String(webhookData[key] ?? "");
    }
    
    // 3. HMAC-SHA256 and Base64 encode
    const computedSignature = createHmac("sha256", secret)
      .update(postDataString)
      .digest("base64");
    
    // 🛑 CRITICAL DEBUGGING STEP 🛑
    console.log("--- Webhook Signature Debug ---");
    console.log(`PostData: ${postDataString}`); // Log the concatenated string
    console.log(`Computed: ${computedSignature}`);
    console.log(`Received: ${signature}`);
    console.log("-------------------------------");
    
    return computedSignature === signature;
  } catch (error) {
    console.error("Error verifying signature", error);
    return false;
  }
}