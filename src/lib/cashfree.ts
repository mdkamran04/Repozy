'use server';

import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID!,
  process.env.CASHFREE_SECRET_KEY!
);

const generateUniqueOrderId = (userId: string): string => {
  // Use a hash of the userId and timestamp for uniqueness
  return `${userId.substring(0, 8)}_${Date.now()}`;
};

export async function createCashfreeCheckoutSession(credits: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  // Logic for amount calculation (e.g., Rs2 per credit minus Rs 1 discount)
  const amount = (credits * 2) - 1; 
  const orderId = generateUniqueOrderId(userId);

  const customerEmail = 'customer@example.com';
  const customerPhone = '9999999999';

  // Metadata containing fulfillment data
  const metadataPayload = {
    creditsToPurchase: credits,
    userId: userId,
  };
  const metadataJsonString = JSON.stringify(metadataPayload);

  const request = {
    order_amount: amount,
    order_currency: 'INR',
    order_id: orderId,
    customer_details: {
      customer_id: userId,
      customer_phone: customerPhone,
      customer_email: customerEmail,
    },
    order_meta: {
      return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?order_id={order_id}&order_status={order_status}`,
      notify_url: `${process.env.NEXT_PUBLIC_URL}/api/webhook/cashfree`,
      // ✅ FIX: Use a redundant custom field in order_meta for better webhook reliability
      custom_data: metadataJsonString, 
    },
    // Keep order_note as well, as this is the standard location
    order_note: metadataJsonString, 
  };

  try {
    const response = await cashfree.PGCreateOrder(request);
    if (response.status === 200 && response.data?.payment_session_id) {
      return {
        success: true,
        paymentSessionId: response.data.payment_session_id,
        orderId: orderId,
      };
    } else {
      console.error('Cashfree Order Creation Failed:', response.data);
      throw new Error('Failed to create Cashfree order.');
    }
  } catch (error) {
    console.error('Error creating Cashfree session:', error);
    return redirect(`${process.env.NEXT_PUBLIC_URL}/billing?error=payment_failed`);
  }
}