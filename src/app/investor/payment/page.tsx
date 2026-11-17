import Link from "next/link";
import { SAFE } from "@/lib/safe/terms";
import { paymentRails } from "../config";

export const dynamic = "force-dynamic";

// Funding instructions: ACH and wire from the bank details PDF. Other
// options go out with the agreement email only.
export default function PaymentPage() {
  const rails = paymentRails();
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-4">
      <div className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "#fbbf24" }}>
        Payment
      </div>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Fund your commitment</h1>
      <p className="mt-4 max-w-2xl text-lg text-mist">
        Fund after the <Link href="/investor/safe" className="text-glow hover:underline">agreement</Link> is signed. Use the same legal name on the payment as on the agreement so it can be matched.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-ink-2 p-6">
          <div className="text-xl font-semibold">ACH or wire</div>
          <p className="mt-2 text-base text-mist">Bank details for {SAFE.mailCompany} are in the PDF. Put your legal name in the reference.</p>
          <a href={SAFE.wirePdf} download={SAFE.wirePdfName} className="mt-5 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-ink hover:opacity-90" style={{ background: "#fbbf24" }}>
            Download bank details (PDF)
          </a>
        </div>
        {rails.checkout && (
          <div className="rounded-2xl border border-line bg-ink-2 p-6">
            <div className="text-xl font-semibold">Card</div>
            <p className="mt-2 text-base text-mist">Hosted checkout with a receipt by email.</p>
            <a href={rails.checkout} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full border border-fog/60 px-6 py-3 text-sm font-semibold text-fog hover:bg-fog/10">
              Pay by card
            </a>
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-dim">
        Your agreement email lists any additional ways to pay. After paying, reply to your agreement email with the confirmation. You will receive an acknowledgment within one business day.
      </p>
    </section>
  );
}
