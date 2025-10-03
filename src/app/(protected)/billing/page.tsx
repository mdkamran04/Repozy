"use client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { api } from "@/trpc/react";
import { Info } from "lucide-react";
import React, { useState } from "react"; 
import { createCashfreeCheckoutSession } from "@/lib/cashfree"; 
import { load } from "@cashfreepayments/cashfree-js"; 

const BillingPage = () => {
  const { data: user } = api.project.getMyCredits.useQuery();
  const [creditsToBuy, setCreditsToBuy] = React.useState<number[]>([100]);
  const [isLoading, setIsLoading] = useState(false); 

  const creditsToBuyAmount = creditsToBuy[0]!;
  const price = ((creditsToBuyAmount * 2) - 1).toFixed(0);

  // 2. Add the Payment Handler function
  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // 2a. Call the Server Action to get the paymentSessionId
      const orderData = await createCashfreeCheckoutSession(creditsToBuyAmount);

      if (orderData.success) {
        // 2b. Load the Cashfree JS SDK
        const cashfree = await load({
          mode: 'sandbox', // IMPORTANT: Match this to your server's Cashfree.XEnvironment
        });

        if (cashfree) {
          // 2c. Initiate the payment redirect
          cashfree.checkout({
            paymentSessionId: orderData.paymentSessionId,
            redirectTarget: '_self', // Opens in the same window
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
        onClick={handlePayment} // 👈 3. Attach the handler
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