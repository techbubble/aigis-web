import nodemailer from "nodemailer";

// Outbound mail over SMTP. Without SMTP_HOST (local development) the message
// is printed to the server log instead of sent.
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[mail] to=${to} subject=${subject}\n${text}`);
    return;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASS } : undefined,
  });
  const from = process.env.SMTP_FROM ?? user;
  try {
    await transport.sendMail({ from, to, subject, text });
  } catch (err) {
    // Microsoft 365 refuses a From address the mailbox has no "Send As"
    // right for (554 5.2.252). Fall back to the mailbox itself so sign-in
    // still works; the sender identity is fixed in the tenant, not here.
    const msg = String((err as Error).message ?? "");
    if (user && from !== user && /SendAsDenied|5\.2\.252/.test(msg)) {
      console.warn(`[mail] ${from} is not allowed to send as; falling back to ${user}`);
      await transport.sendMail({ from: user, to, subject, text });
      return;
    }
    throw err;
  }
}
