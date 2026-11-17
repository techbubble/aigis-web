import { existsSync } from "node:fs";
import { join } from "node:path";

// The investor folder's contents. Documents are files dropped into
// public/investor; payment rails come from the environment so nothing
// sensitive is committed.
export const DOCS = {
  deck: { file: "deck.pdf", label: "Deck" },
} as const;

export function hasDoc(key: keyof typeof DOCS): boolean {
  return existsSync(join(process.cwd(), "public", "investor", DOCS[key].file));
}

export function docUrl(key: keyof typeof DOCS): string {
  return `/investor/${DOCS[key].file}`;
}

export type PaymentRails = {
  // A Stripe Payment Link (or any hosted checkout) for card and bank debit.
  checkout: string | null;
  // Where to send proof of payment and signed documents.
  contact: string | null;
};

export function paymentRails(): PaymentRails {
  return {
    checkout: process.env.INVESTOR_CHECKOUT_URL || null,
    contact: process.env.INVESTOR_CONTACT || null,
  };
}
