// app/payment/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { getCheckoutSessionStatus } from "@/lib/payment";

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");
  const [fired, setFired] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["checkout-session", sessionId],
    queryFn: () => getCheckoutSessionStatus(sessionId as string),
    enabled: !!sessionId,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 1500 : false),
  });

  useEffect(() => {
    if (data?.status === "succeeded" && !fired) {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 }, colors: ["#8B5CF6", "#16A34A", "#FACC15", "#FB7185", "#38BDF8"] });
      setFired(true);
    }
  }, [data?.status, fired]);

  return (
    <div className="min-h-screen bg-[#F1ECFF] grid place-items-center px-5">
      <div
        className="rounded-3xl border-2 border-[#EDE4FF] p-10 max-w-[520px] w-full text-center"
        style={{ background: "linear-gradient(160deg,#F6F2FF,#EDE9FE)" }}
      >
        {!sessionId ? (
          <>
            <div className="text-[64px]">⚠️</div>
            <h2 className="font-display text-2xl font-extrabold mt-2.5 mb-1.5 text-[#3B0764]">Missing session</h2>
            <p className="font-bold text-[#7C6BA8] mb-4">No checkout session was found in the URL.</p>
          </>
        ) : isLoading ? (
          <>
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-[#DDD1FF] border-t-[#8B5CF6] animate-spin" />
            <p className="font-bold text-[#7C6BA8] mt-4">Confirming your payment…</p>
          </>
        ) : isError || data?.status === "failed" ? (
          <>
            <div className="text-[64px]">😕</div>
            <h2 className="font-display text-2xl font-extrabold mt-2.5 mb-1.5 text-[#3B0764]">
              We couldn't confirm your payment
            </h2>
            <p className="font-bold text-[#7C6BA8] mb-4">
              If you were charged, it will be refunded automatically. Otherwise, please try again.
            </p>
            <button
              onClick={() => router.push("/plus?tab=checkout")}
              className="px-8 py-3 rounded-2xl font-display font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="text-[80px]">🎉</div>
            <h2 className="font-display text-2xl font-extrabold mt-2.5 mb-1.5 text-[#3B0764]">
              Welcome to Kidora Plus!
            </h2>
            <p className="font-bold text-[#7C6BA8] mb-4">
              Your subscription is active. Every premium world, game and reward is unlocked.
            </p>
            <button
              onClick={() => router.push("/plus?tab=sub")}
              className="px-8 py-3 rounded-2xl font-display font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}
            >
              Go to my subscription →
            </button>
          </>
        )}
      </div>
    </div>
  );
}