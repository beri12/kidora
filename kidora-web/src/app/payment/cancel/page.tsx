// app/payment/cancel/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F1ECFF] grid place-items-center px-5">
      <div
        className="rounded-3xl border-2 border-[#EDE4FF] p-10 max-w-[520px] w-full text-center"
        style={{ background: "linear-gradient(160deg,#FFF7ED,#FFEDD5)" }}
      >
        <div className="text-[64px]">🙁</div>
        <h2 className="font-display text-2xl font-extrabold mt-2.5 mb-1.5 text-[#3B0764]">
          Checkout canceled
        </h2>
        <p className="font-bold text-[#7C6BA8] mb-4">
          No charge was made. You can pick up right where you left off whenever you're ready.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push("/plus?tab=pricing")}
            className="px-6 py-3 rounded-2xl font-display font-extrabold text-[#6D28D9] bg-[#EDE4FF]"
          >
            View plans
          </button>
          <button
            onClick={() => router.push("/plus?tab=checkout")}
            className="px-6 py-3 rounded-2xl font-display font-extrabold text-white"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}