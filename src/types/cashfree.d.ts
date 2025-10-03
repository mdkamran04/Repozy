// src/types/cashfree.d.ts (Recommended content)

// Declare the main interface for the Cashfree checkout object
interface CashfreeCheckout {
  checkout(options: { paymentSessionId: string; redirectTarget: '_self' | '_blank' }): void;
  // Add other methods (like components) if you use them
}

// Declare the load function
declare function load(options: { mode: 'sandbox' | 'production' }): Promise<CashfreeCheckout | null>;

// Declare the entire module
declare module '@cashfreepayments/cashfree-js' {
  export { load };
}