import { readFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { renderSafePdf } from "@/lib/safe/pdf";
import { saveAgreement } from "@/lib/safe/store";
import { SAFE, fmtAmount, fmtDate, type Appendix } from "@/lib/safe/terms";
import { sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

// Shared only by email with a signed investor; never rendered on the site.
const ZELLE = "202.468.5463";
export const maxDuration = 60;

// GET: the SAFE as a PDF with a blank Appendix A, for download. In
// development, ?sample=1 renders a completed appendix for checking the layout.
export async function GET(req: Request) {
  const sample = process.env.NODE_ENV !== "production" && new URL(req.url).searchParams.get("sample") === "1";
  const pdf = await renderSafePdf(
    sample ? { name: "Jane Q. Investor", address: "100 Market St, San Francisco, CA 94105", amount: "25000", date: "2026-11-16", email: "jane@example.com", signature: "Jane Q. Investor", signedAt: new Date().toISOString(), ip: "203.0.113.5" } : null,
  );
  return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="AIGIS-SAFE.pdf"', "cache-control": "no-store" } });
}

// POST: a completed Appendix A. Renders the executed agreement, stores it,
// and emails the PDF to the investor with a copy to the company.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<Record<keyof Appendix | "consent", unknown>> | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });
  const str = (k: keyof Appendix, max: number) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = str("name", 120);
  const address = str("address", 300);
  const email = str("email", 200);
  const signature = str("signature", 120);
  const date = str("date", 10);
  const amount = str("amount", 15).replace(/[^0-9]/g, "");
  const problems: string[] = [];
  if (name.length < 2) problems.push("Enter the investor's full legal name.");
  if (address.length < 8) problems.push("Enter a mailing address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("Enter a valid email address.");
  if (!amount || Number(amount) < 1) problems.push("Enter the purchase amount in whole US dollars.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) problems.push("Enter the date.");
  if (signature.length < 2) problems.push("Type your full name as your signature.");
  if (signature && name && signature.toLowerCase() !== name.toLowerCase()) problems.push("The signature must match the investor's name exactly.");
  if (body.consent !== true) problems.push("Consent to electronic signature is required.");
  if (problems.length) return Response.json({ error: problems.join(" ") }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  const appendix: Appendix = { name, address, amount, date, email, signature, signedAt: new Date().toISOString(), ip };
  const id = `${date}-${nanoid(8)}`;
  const pdf = await renderSafePdf(appendix);
  await saveAgreement(id, appendix, pdf);

  const text = `${name},

Thank you for investing in AIGIS. Attached is your executed Simple Agreement for Future Equity (SAFE) with ${SAFE.company} as a PDF.

Purchase Amount: ${fmtAmount(amount)}
Date of Agreement: ${fmtDate(date)}
Discount Rate: ${SAFE.discountRate}

To fund your purchase, send ${fmtAmount(amount)} by Zelle to ${ZELLE}, or by ACH or wire using the bank details in the attached ${SAFE.wirePdfName}. Please use the same name on the payment as on the agreement.

With thanks,

${SAFE.signer.name}
${SAFE.signer.title}, ${SAFE.mailCompany}
${SAFE.address}
`;
  try {
    const wire = await readFile(path.join(process.cwd(), "public", SAFE.wirePdf));
    await sendMail(email, SAFE.subject, text, {
      cc: SAFE.cc,
      attachments: [
        { filename: "AIGIS-SAFE.pdf", content: pdf, contentType: "application/pdf" },
        { filename: SAFE.wirePdfName, content: wire, contentType: "application/pdf" },
      ],
    });
  } catch (err) {
    console.error("[safe] mail failed", err);
    return Response.json({ error: "The agreement was recorded but the email could not be sent. We will send it manually." }, { status: 502 });
  }
  return Response.json({ ok: true, id });
}
