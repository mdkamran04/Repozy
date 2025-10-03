import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';

const cashfreeInstance = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID!,
  process.env.CASHFREE_SECRET_KEY!
);

const WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get('x-cf-signature');
  const signatureVersion = req.headers.get('x-cf-signature-version') || '2023-08-01';

  if (!WEBHOOK_SECRET) {
    console.error('CASHFREE_WEBHOOK_SECRET not set.');
    return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
  }

  if (!signature) {
    console.error('Missing signature header');
    return NextResponse.json({ message: 'Missing Signature' }, { status: 400 });
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch (error) {
    console.error('Invalid JSON body', error);
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const orderData = data?.data?.order;
  const paymentStatus = orderData?.order_status;
  const orderId = orderData?.order_id;
  const orderNote = orderData?.order_note;

  console.log(`Webhook received: Order ID ${orderId}, Status ${paymentStatus}`);

  // Idempotency check
  const existing = await db.cashfreeTransaction.findUnique({ where: { orderId } });
  if (existing) {
    console.warn(`Order ${orderId} already processed`);
    return NextResponse.json({ message: 'Already processed' }, { status: 200 });
  }

  // Signature verification
  let isSignatureValid = false;
  try {
    const WebhooksUtil = (cashfreeInstance as any).Webhooks;
    if (!WebhooksUtil?.verifySignature) {
      console.error('Cashfree Webhooks utility missing.');
      return NextResponse.json({ message: 'Verification utility missing' }, { status: 500 });
    }
    isSignatureValid = WebhooksUtil.verifySignature(signature!, rawBody, WEBHOOK_SECRET, signatureVersion);
  } catch (err) {
    console.error('Signature verification failed', err);
    return NextResponse.json({ message: 'Verification failed' }, { status: 401 });
  }

  if (!isSignatureValid) {
    console.error('Invalid signature');
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  // Parse order metadata
  let metadata: { creditsToPurchase?: number; userId?: string } = {};
  try {
    metadata = JSON.parse(orderNote || '{}');
  } catch (e) {
    console.error(`Could not parse order_note for ${orderId}`);
    return NextResponse.json({ message: 'Error parsing order metadata' }, { status: 200 });
  }

  const credits = Number(metadata?.creditsToPurchase);
  const userId = metadata?.userId;
  if (!userId || !credits || isNaN(credits)) {
    console.error(`Invalid metadata for order ${orderId}`, metadata);
    return NextResponse.json({ message: 'Missing userId or credits in metadata' }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.cashfreeTransaction.create({
        data: {
          orderId,
          status: paymentStatus,
          rawPayload: data,
          userId,
          credits,
        },
      });

      if (paymentStatus === 'PAID') {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: credits } },
        });
        console.log(`Credits updated: +${credits} for user ${userId}`);
      }
    });

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (dbError: any) {
    if (dbError.code === 'P2002') {
      console.warn(`Duplicate webhook for order ${orderId}`);
      return NextResponse.json({ message: 'Already processed' }, { status: 200 });
    }
    console.error('Database error', dbError);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
