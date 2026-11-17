import { promises as fs } from "node:fs";
import path from "node:path";
import type { Appendix } from "./terms";

// Executed agreements: the appendix as JSON and the PDF, kept beside the
// datasets (Blob in production, .data locally).
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN || (!!process.env.BLOB_STORE_ID && !!process.env.VERCEL);
const DIR = path.join(process.cwd(), ".data", "safe");
const PREFIX = "aigis/safe";

export async function saveAgreement(id: string, appendix: Appendix, pdf: Buffer): Promise<void> {
  const json = JSON.stringify(appendix);
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    await put(`${PREFIX}/${id}.json`, json, { access: "public", contentType: "application/json", addRandomSuffix: false });
    await put(`${PREFIX}/${id}.pdf`, pdf, { access: "public", contentType: "application/pdf", addRandomSuffix: false });
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${id}.json`), json);
  await fs.writeFile(path.join(DIR, `${id}.pdf`), pdf);
}
