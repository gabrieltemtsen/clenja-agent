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
  beneficiary: {
    country: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  otp: string;
};
