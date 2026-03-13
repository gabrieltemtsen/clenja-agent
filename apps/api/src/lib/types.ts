export type CashoutQuoteRequest = {
  userId: string;
  fromToken: "cUSD" | "CELO" | "USDC";
  amount: string;
  country: "NG" | "KE" | "GH" | "UG" | "TZ" | "MW" | "BR" | "BJ" | "CI" | "IN";
  currency: "NGN" | "KES" | "GHS" | "UGX" | "TZS" | "MWK" | "BRL" | "XOF" | "INR";
};

export type CashoutQuoteResponse = {
  quoteId: string;
  rate: string;
  fee: string;
  receiveAmount: string;
  eta: string;
  expiresAt?: number;
};

export type CreatePayoutRequest = {
  userId: string;
  quoteId: string;
  fromToken?: "cUSD" | "CELO" | "USDC";
  amount?: string;
  beneficiary: {
    country: string;
    bankName: string;
    /** Paycrest institution code e.g. "ABNGNGLA" (required for live Paycrest orders) */
    bankCode: string;
    accountName: string;
    accountNumber: string;
  };
  otp: string;
};
