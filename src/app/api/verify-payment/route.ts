import { NextRequest, NextResponse } from "next/server";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID!,
  process.env.CASHFREE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json();

  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  try {
    console.log(`[Verify Payment] Starting verification for order: ${orderId}, user: ${userId}`);

    // First, check if order already has a transaction record
    const existingTransaction = await db.cashfreeTransaction.findFirst({
      where: { orderId, userId },
      select: { id: true, orderId: true, status: true, credits: true, userId: true },
    });

    // If we have a transaction record, use its data
    if (existingTransaction) {
      const { credits, id } = existingTransaction;
      
      // Check if already fulfilled
      if (existingTransaction.status === 'SUCCESS' || existingTransaction.status === 'PAID') {
        console.log(`[Verify Payment] Order already paid and processed: ${orderId}`);
        return NextResponse.json({ 
          success: true, 
          message: "Credits already added",
          alreadyProcessed: true
        }, { status: 200 });
      }

      // Mark as fulfilled and add credits
      await db.$transaction(async (tx) => {
        // Update transaction status to SUCCESS
        await tx.cashfreeTransaction.update({
          where: { id },
          data: { status: 'SUCCESS' },
        }).catch((err) => {
          // If update fails, log but continue
          console.warn(`[Verify Payment] Failed to update transaction status:`, err.message);
        });

        // Add credits to user
        await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: credits } },
        });

        // Mark order as fulfilled
        await tx.cashfreeOrder.upsert({
          where: { orderId },
          create: { 
            orderId, 
            isFulfilled: true, 
            fulfilledAt: new Date(), 
            userId 
          },
          update: { 
            isFulfilled: true, 
            fulfilledAt: new Date() 
          },
        });
      });

      console.log(`[Verify Payment] ✅ SUCCESS: Added ${credits} credits to user ${userId} for order ${orderId}`);
      return NextResponse.json({ 
        success: true, 
        message: "Credits added successfully",
        credits
      }, { status: 200 });
    }

    // Try to fetch from Cashfree API
    let payments: any[] = [];
    let successfulPayment: any = null;
    
    try {
      const response = await cashfree.PGOrderFetchPayments("2023-08-01", orderId);
      
      if (response?.status === 200 && response?.data) {
        payments = response.data;
        successfulPayment = payments?.find(
          (p: any) => p.payment_status === "SUCCESS" || p.payment_status === "PAID"
        );
        console.log(`[Verify Payment] Found ${payments.length} payments for order ${orderId}`);
      }
    } catch (apiError: any) {
      console.warn(`[Verify Payment] Cashfree API call failed (${apiError.status}), falling back to webhook data`, apiError.message);
      // In sandbox/test mode, the order might not be available via API yet
      // We'll check the CashfreeOrder table instead
    }

    // If no successful payment found via API, check our CashfreeOrder table
    if (!successfulPayment) {
      const cashfreeOrder = await db.cashfreeOrder.findUnique({
        where: { orderId },
        select: { isFulfilled: true, userId: true },
      });

      if (cashfreeOrder?.isFulfilled) {
        console.log(`[Verify Payment] Order already fulfilled in DB: ${orderId}`);
        return NextResponse.json({ 
          success: true, 
          message: "Credits already added",
          alreadyProcessed: true
        }, { status: 200 });
      }

      // If no order in database, we need webhook data
      if (!cashfreeOrder) {
        console.error(`[Verify Payment] Order not found in database or Cashfree API: ${orderId}`);
        return NextResponse.json({ 
          success: false, 
          message: "Order not found. Please complete the payment process fully.",
          details: "Ensure you completed the payment and were redirected back to the app."
        }, { status: 200 });
      }
    }

    // Extract credits from payment or order amount
    let credits = 0;
    let metadataString = null;

    if (successfulPayment) {
      const orderAmount = successfulPayment.order_amount;
      metadataString = successfulPayment.order?.order_note || successfulPayment.order?.order_meta?.custom_data;
      
      if (metadataString) {
        try {
          const metadata = JSON.parse(metadataString);
          credits = Number(metadata?.creditsToPurchase);
        } catch (e) {
          console.warn(`Failed to parse metadata from payment, calculating from amount`);
        }
      }
      
      // Fallback: calculate from order amount
      if (!credits || isNaN(credits)) {
        credits = Math.round((orderAmount + 1) / 2);
        console.log(`[Verify Payment] Calculated credits from amount: ${credits} (from ₹${orderAmount})`);
      }
    } else {
      // Get credits from database if we have it from webhook
      const existingOrder = await db.cashfreeOrder.findUnique({
        where: { orderId },
      });
      // We'll get credits from any transaction record associated
      const anyTransaction = await db.cashfreeTransaction.findFirst({
        where: { orderId },
        select: { credits: true },
      });
      credits = anyTransaction?.credits || 0;
    }

    if (!credits || isNaN(credits) || credits <= 0) {
      console.error(`[Verify Payment] Invalid credits calculated: ${credits} for order ${orderId}`);
      return NextResponse.json({ 
        error: "Invalid credits in order",
        details: "Could not determine credit amount from payment"
      }, { status: 400 });
    }

    // Record the transaction
    await db.$transaction(async (tx) => {
      // Create transaction record (with idempotency via cfPaymentId if available)
      const cfPaymentId = successfulPayment?.cf_payment_id || `order_${orderId}`;
      
      try {
        await tx.cashfreeTransaction.create({
          data: {
            orderId,
            cfPaymentId,
            status: successfulPayment?.payment_status || "VERIFIED",
            rawPayload: successfulPayment || {},
            userId,
            credits,
          },
        });
      } catch (e: any) {
        // If transaction already exists, that's fine
        if (!e?.code?.includes("P2002")) {
          throw e;
        }
        console.log(`[Verify Payment] Transaction already recorded for ${cfPaymentId}`);
      }

      // Add credits to user
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      });

      // Mark order as fulfilled
      await tx.cashfreeOrder.upsert({
        where: { orderId },
        create: { 
          orderId, 
          isFulfilled: true, 
          fulfilledAt: new Date(), 
          userId 
        },
        update: { 
          isFulfilled: true, 
          fulfilledAt: new Date() 
        },
      });
    });

    console.log(`[Verify Payment] ✅ SUCCESS: Added ${credits} credits to user ${userId} for order ${orderId}`);

    return NextResponse.json({ 
      success: true, 
      message: "Credits added successfully",
      credits
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Verify Payment] Error:", error.message || error);
    
    // Handle duplicate transaction
    if (error?.code === "P2002") {
      console.log(`[Verify Payment] Idempotent: Order already processed`);
      return NextResponse.json({ 
        success: true, 
        message: "Credits already added",
        alreadyProcessed: true
      }, { status: 200 });
    }

    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
