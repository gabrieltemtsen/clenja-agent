"use client";

import { useState, useEffect } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { postJson } from "./lib/api";

export type TxStep = {
    stepId: string;
    description: string;
    to: string;
    data: string;
    value: string;
    chainId: number;
    gasLimit: number | string;
};

interface TxSigningModalProps {
    userId: string;
    steps: TxStep[];
    onComplete: (txHash: string) => void;
    onCancel: () => void;
}

export function TxSigningModal({ userId, steps, onComplete, onCancel }: TxSigningModalProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [currentHash, setCurrentHash] = useState<`0x${string}` | undefined>(undefined);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const step = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;

    const { sendTransactionAsync } = useSendTransaction();

    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
        hash: currentHash,
    });

    useEffect(() => {
        if (isConfirmed && currentHash) {
            handleStepSuccess(currentHash);
        }
    }, [isConfirmed, currentHash]);

    async function handleSign() {
        setIsSigning(true);
        setError(null);
        try {
            const hash = await sendTransactionAsync({
                to: step.to as `0x${string}`,
                data: step.data as `0x${string}`,
                value: BigInt(step.value),
                chainId: step.chainId,
                // Let wallet estimate gas, or use suggested limit if needed
            });
            setCurrentHash(hash);
        } catch (e: any) {
            console.error(e);
            setError(e.details || e.message || "User rejected request");
            setIsSigning(false);
        }
    }

    async function handleStepSuccess(txHash: string) {
        // Record the tx in backend
        try {
            const kind = step.stepId.includes("swap") ? "swap" : "send";

            // Record receipt
            // Note: using /v1/ prefix
            await postJson("/v1/chat/record-tx", {
                userId,
                kind,
                txHash,
                amount: "0", // metadata, backend handles actual accounting via indexer ideally
                token: "CELO",
            });

            if (isLastStep) {
                onComplete(txHash);
            } else {
                // Next step
                setCurrentHash(undefined);
                setIsSigning(false);
                setCurrentStepIndex((i) => i + 1);
            }
        } catch (e) {
            console.error("Failed to record tx:", e);
            // If recording fails, still proceed so user isn't stuck
            if (isLastStep) {
                onComplete(txHash);
            } else {
                // Next step force advance
                setCurrentHash(undefined);
                setIsSigning(false);
                setCurrentStepIndex((i) => i + 1);
            }
        }
    }

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)"
        }}>
            <div style={{
                width: "100%", maxWidth: "420px",
                background: "#0F1218", border: "1px solid rgba(53, 208, 127, 0.2)",
                borderRadius: "16px", padding: "24px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                        Sign Transaction ({currentStepIndex + 1}/{steps.length})
                    </h3>
                    {currentHash && (
                        <a href={`https://celoscan.io/tx/${currentHash}`} target="_blank" rel="noreferrer"
                            style={{ fontSize: "12px", color: "var(--brand)", textDecoration: "none" }}>
                            View on Explorer ↗
                        </a>
                    )}
                </div>

                <div style={{ marginBottom: "24px", color: "#A0A5B0", fontSize: "14px", lineHeight: "1.5" }}>
                    {step.description}
                </div>

                {(error || isConfirmError) && (
                    <div style={{
                        marginBottom: "16px", padding: "12px",
                        background: "rgba(255, 77, 77, 0.1)", border: "1px solid rgba(255, 77, 77, 0.3)",
                        borderRadius: "8px", color: "#FF4D4D", fontSize: "13px", wordBreak: "break-word"
                    }}>
                        ❌ {error || confirmError?.message || "Transaction failed"}
                        {(isConfirmError) && (
                            <div style={{ marginTop: "8px" }}>
                                <button
                                    onClick={() => { setCurrentHash(undefined); setIsSigning(false); }}
                                    style={{
                                        background: "rgba(255, 255, 255, 0.1)", border: "none", color: "#fff",
                                        padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px"
                                    }}
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    {!currentHash && (
                        <button
                            onClick={onCancel}
                            style={{
                                padding: "10px 16px", background: "transparent", border: "1px solid #2D3340",
                                color: "#A0A5B0", borderRadius: "10px", cursor: "pointer", fontSize: "14px"
                            }}
                        >
                            Cancel
                        </button>
                    )}

                    <button
                        onClick={handleSign}
                        disabled={isSigning || !!currentHash}
                        style={{
                            flex: 1, padding: "10px 16px",
                            background: "var(--brand)", border: "none",
                            color: "#000", borderRadius: "10px", cursor: "pointer",
                            fontWeight: 600, fontSize: "14px",
                            opacity: (isSigning || currentHash) ? 0.7 : 1,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                        }}
                    >
                        {isConfirming ? (
                            <>
                                <span className="spinner" style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                                {isHashPending(currentHash) ? "Broadcasting..." : "Confirming..."}
                            </>
                        ) : isSigning ? (
                            "Check Wallet..."
                        ) : (
                            "Confirm & Sign"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function isHashPending(hash: string | undefined): boolean {
    return !!hash && hash.length === 66;
}
