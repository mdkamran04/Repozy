"use client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { api } from "@/trpc/react";
import { Info } from "lucide-react";
import React, { useState, useEffect, useRef } from "react"; 
import { createCashfreeCheckoutSession } from "@/lib/cashfree"; 
import { load } from "@cashfreepayments/cashfree-js"; 
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const BillingPage = () => {
  const { data: user, refetch } = api.project.getMyCredits.useQuery();
  const utils = api.useUtils();
  const [creditsToBuy, setCreditsToBuy] = React.useState<number[]>([100]);
  const [isLoading, setIsLoading] = useState(false); 
  const [isVerifying, setIsVerifying] = useState(false);
  const searchParams = useSearchParams();
  const verificationAttemptedRef = useRef(false);

  const creditsToBuyAmount = creditsToBuy[0]!;
  const price = ((creditsToBuyAmount * 2) - 1).toFixed(0);

  // Handle return from Cashfree payment
  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const orderStatus = searchParams.get("order_status");

    // Prevent multiple verification attempts
    if (orderId && orderStatus && !verificationAttemptedRef.current) {
      verificationAttemptedRef.current = true;
      
      const verifyPayment = async () => {
        setIsVerifying(true);
        try {
          const response = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });

          const data = await response.json();

          if (data.success) {
            toast.success(
              data.alreadyProcessed 
                ? "Payment already processed!" 
                : `Payment successful! ${data.credits} credits added.`
            );
            
            // Invalidate and refetch to ensure fresh data
            await utils.project.getMyCredits.invalidate();
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for DB to settle
            await refetch();
          } else {
            toast.error(data.message || "Payment verification failed");
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          toast.error("Failed to verify payment. Please contact support.");
        } finally {
          setIsVerifying(false);
          // Clean up URL params after verification
          window.history.replaceState({}, "", "/billing");
        }
      };

      verifyPayment();
    }
  }, [searchParams, refetch, utils]);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
     
      const orderData = await createCashfreeCheckoutSession(creditsToBuyAmount);

      if (orderData.success) {
        const cashfree = await load({
          mode: 'sandbox', // IMPORTANT: Match this to your server's Cashfree.XEnvironment
        });

        if (cashfree) {
          cashfree.checkout({
            paymentSessionId: orderData.paymentSessionId,
            redirectTarget: '_self', 
          });
        }
      } else {
        alert("Failed to create payment session. Please check server logs.");
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      alert("An unexpected error occurred during checkout.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold">Billing</h1>
      <div className="h-2"></div>
      {isVerifying && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">
          <p className="text-sm">Verifying your payment...</p>
        </div>
      )}
      <p className="text-sm text-gray-500">
        You currently have <b>{user?.credits}</b> Repozy credits.
      </p>
      <div className="h-2"></div>
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-blue-600">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <p className="text-sm">
            Each credit allows you to index 1 file in a repository.
          </p>
        </div>
        <p className="text-sm">
          Eg. If you have 10 credits, you can index 10 files in a repository.
        </p>
      </div>
      <div className="h-4"></div>
      <Slider
        defaultValue={[100]}
        max={1000}
        min={25}
        step={25}
        onValueChange={(value) => setCreditsToBuy(value)}
        value={creditsToBuy}
      ></Slider>
      <div className="h-4"></div>
      <Button 
        onClick={handlePayment} 
        disabled={isLoading}    
      >
        {isLoading
          ? "Processing Payment..."
          : `Buy ${creditsToBuyAmount} credits for ₹${price}/-`}
      </Button>
    </div>
  );
};

export default BillingPage;