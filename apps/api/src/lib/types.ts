export type CashoutQuoteRequest = {
  userId: string;
  fromToken: "cUSD" | "CELO";
  amount: string;
  country: "NG" | "KE" | "GH" | "ZA";
  currency: "NGN" | "KES" | "GHS" | "ZAR";
};

export type CashoutQuoteResponse = {
  quoteId: string;
  rate: string;
  fee: string;
  receiveAmount: string;
  eta: string;
};

export type CreatePayoutRequest = {
  userId: string;
  quoteId: string;
  fromToken?: "cUSD" | "CELO";
  amount?: string;
  beneficiary: {
    country: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    bankCode?: string;
  };
  otp: string;
};
