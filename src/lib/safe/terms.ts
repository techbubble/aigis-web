// The SAFE: a post-money Simple Agreement for Future Equity with a discount,
// for a California corporation. Everything here is fixed for every
// investor; only Appendix A (name, address, amount, date, email, signature)
// changes. The web page and the PDF both render from this one source.

export const SAFE = {
  company: "Xibit Corporation",
  entity: "a California corporation",
  address: "1601 Morgan St, Mountain View, CA 94043",
  signer: { name: "Nik Kalyani", title: "Chief Executive Officer" },
  // Deal terms. Fixed for the round; change here, never per investor.
  discountRate: "20%",
  // Default purchase amount shown in the form, whole US dollars.
  defaultAmount: "2500",
  // The email that carries the executed copy.
  mailCompany: "Xibit Corporation",
  cc: "nik@kalyani.ventures",
  subject: "AIGIS SAFE Agreement",
  // How to fund: ACH and wire from the bank details PDF. Other options are
  // sent only in the agreement email, never shown on the site.
  wirePdf: "/investor/xibit-wire-details.pdf",
  wirePdfName: "Xibit-Corporation-Wire-Details.pdf",
} as const;

export const LEGEND =
  "This instrument and the securities issuable upon its conversion have not been registered under the Securities Act of 1933, as amended (the \"Securities Act\"), or the securities laws of any state. They are being offered and sold in reliance on exemptions from registration, including Rule 506(c) of Regulation D and Section 25102(f) of the California Corporate Securities Law of 1968, and may not be offered, sold, pledged or otherwise transferred except pursuant to an effective registration statement or an available exemption, and in compliance with the restrictions set forth herein.";

export const PREAMBLE = `THIS CERTIFIES THAT in exchange for the payment by the investor identified in Appendix A (the "Investor") of the purchase amount set forth in Appendix A (the "Purchase Amount") on or about the date set forth in Appendix A (the "Date of Agreement"), ${SAFE.company}, ${SAFE.entity} (the "Company"), issues to the Investor the right to certain shares of the Company's Capital Stock, subject to the terms described below. The Discount Rate is ${SAFE.discountRate}. This Safe is one of the forms available at ycombinator.com/documents, modified for the Company, and the Company and the Investor agree that it is a post-money Safe with a discount and no valuation cap.`;

export type Clause = { label?: string; text: string };
export type Section = { title: string; clauses: Clause[] };

export const SECTIONS: Section[] = [
  {
    title: "1. Events",
    clauses: [
      { label: "Equity Financing.", text: "If there is an Equity Financing before the termination of this Safe, on the initial closing of such Equity Financing, this Safe will automatically convert into the number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Discount Price. In connection with the automatic conversion of this Safe into shares of Safe Preferred Stock, the Investor will execute and deliver to the Company all of the transaction documents related to the Equity Financing; provided, that such documents (i) are the same documents to be entered into with the purchasers of Standard Preferred Stock, with appropriate variations for the Safe Preferred Stock if applicable, and (ii) have customary exceptions to any drag-along applicable to the Investor, including (without limitation) limited representations, warranties, liability and indemnification obligations for the Investor." },
      { label: "Liquidity Event.", text: "If there is a Liquidity Event before the termination of this Safe, this Safe will automatically be entitled (subject to the liquidation priority set forth in Section 1(d) below) to receive a portion of Proceeds, due and payable to the Investor immediately prior to, or concurrent with, the consummation of such Liquidity Event, equal to the greater of (i) the Purchase Amount (the \"Cash-Out Amount\") or (ii) the amount payable on the number of shares of Common Stock equal to the Purchase Amount divided by the Liquidity Price (the \"Conversion Amount\"). If any of the Company's securityholders are given a choice as to the form and amount of Proceeds to be received in a Liquidity Event, the Investor will be given the same choice, provided that the Investor may not choose to receive a form of consideration that the Investor would be ineligible to receive as a result of the Investor's failure to satisfy any requirement or limitation generally applicable to the Company's securityholders, or under any applicable laws. Notwithstanding the foregoing, in connection with a Change of Control intended to qualify as a tax-free reorganization, the Company may reduce the cash portion of Proceeds payable to the Investor by the amount determined by its board of directors in good faith to be advisable for such Change of Control to qualify as a tax-free reorganization for U.S. federal income tax purposes, provided that such reduction (A) does not reduce the total Proceeds payable to the Investor and (B) is applied in the same manner and on a pro rata basis to all securityholders who have equal priority to the Investor under Section 1(d)." },
      { label: "Dissolution Event.", text: "If there is a Dissolution Event before the termination of this Safe, the Investor will automatically be entitled (subject to the liquidation priority set forth in Section 1(d) below) to receive a portion of Proceeds equal to the Cash-Out Amount, due and payable to the Investor immediately prior to the consummation of the Dissolution Event." },
      { label: "Liquidation Priority.", text: "In a Liquidity Event or Dissolution Event, this Safe is intended to operate like standard non-participating Preferred Stock. The Investor's right to receive its Cash-Out Amount is: (i) junior to payment of outstanding indebtedness and creditor claims, including contractual claims for payment and convertible promissory notes (to the extent such convertible promissory notes are not actually or notionally converted into Capital Stock); (ii) on par with payments for other Safes and/or Preferred Stock, and if the applicable Proceeds are insufficient to permit full payments to the Investor and such other Safes and/or Preferred Stock, the applicable Proceeds will be distributed pro rata to the Investor and such other Safes and/or Preferred Stock in proportion to the full payments that would otherwise be due; and (iii) senior to payments for Common Stock. The Investor's right to receive its Conversion Amount is (A) on par with payments for Common Stock and other Safes and/or Preferred Stock who are also receiving Conversion Amounts or Proceeds on a similar as-converted to Common Stock basis, and (B) junior to payments described in clauses (i) and (ii) above (in the latter case, to the extent such payments are Cash-Out Amounts or similar liquidation preferences)." },
      { label: "Termination.", text: "This Safe will automatically terminate (without relieving the Company of any obligations arising from a prior breach of or non-compliance with this Safe) immediately following the earliest to occur of: (i) the issuance of Capital Stock to the Investor pursuant to the automatic conversion of this Safe under Section 1(a); or (ii) the payment, or setting aside for payment, of amounts due the Investor pursuant to Section 1(b) or Section 1(c)." },
    ],
  },
  {
    title: "2. Definitions",
    clauses: [
      { label: "\"Capital Stock\"", text: "means the capital stock of the Company, including, without limitation, the \"Common Stock\" and the \"Preferred Stock.\"" },
      { label: "\"Change of Control\"", text: "means (i) a transaction or series of related transactions in which any \"person\" or \"group\" (within the meaning of Section 13(d) and 14(d) of the Securities Exchange Act of 1934, as amended), becomes the \"beneficial owner\" (as defined in Rule 13d-3 under the Securities Exchange Act of 1934, as amended), directly or indirectly, of more than 50% of the outstanding voting securities of the Company having the right to vote for the election of members of the Company's board of directors, (ii) any reorganization, merger or consolidation of the Company, other than a transaction or series of related transactions in which the holders of the voting securities of the Company outstanding immediately prior to such transaction or series of related transactions retain, immediately after such transaction or series of related transactions, at least a majority of the total voting power represented by the outstanding voting securities of the Company or such other surviving or resulting entity, or (iii) a sale, lease or other disposition of all or substantially all of the assets of the Company." },
      { label: "\"Direct Listing\"", text: "means the Company's initial listing of its Common Stock (other than shares of Common Stock not eligible for resale under Rule 144 under the Securities Act) on a national securities exchange by means of an effective registration statement on Form S-1 filed by the Company with the SEC that registers shares of existing capital stock of the Company for resale, as approved by the Company's board of directors. For the avoidance of doubt, a Direct Listing will not be deemed to be an underwritten offering and will not involve any underwriting services." },
      { label: "\"Discount Price\"", text: `means the price per share of the Standard Preferred Stock sold in the Equity Financing multiplied by (100% minus the Discount Rate), the Discount Rate being ${SAFE.discountRate}.` },
      { label: "\"Dissolution Event\"", text: "means (i) a voluntary termination of operations, (ii) a general assignment for the benefit of the Company's creditors or (iii) any other liquidation, dissolution or winding up of the Company (excluding a Liquidity Event), whether voluntary or involuntary." },
      { label: "\"Dividend Amount\"", text: "means, with respect to any date on which the Company pays a dividend on its outstanding Common Stock, the amount of such dividend that is paid per share of Common Stock multiplied by the number of shares of Common Stock equal to the Purchase Amount divided by the Liquidity Price (treating the dividend date as a Liquidity Event solely for purposes of calculating such Liquidity Price)." },
      { label: "\"Equity Financing\"", text: "means a bona fide transaction or series of transactions with the principal purpose of raising capital, pursuant to which the Company issues and sells Preferred Stock at a fixed valuation, including but not limited to, a pre-money or post-money valuation." },
      { label: "\"Initial Public Offering\"", text: "means the closing of the Company's first firm commitment underwritten initial public offering of Common Stock pursuant to a registration statement filed under the Securities Act." },
      { label: "\"Liquidity Capitalization\"", text: "is calculated as of immediately prior to the Liquidity Event, and (without double-counting, in each case calculated on an as-converted to Common Stock basis): includes all shares of Capital Stock issued and outstanding; includes all (i) issued and outstanding options and (ii) Promised Options; includes all Converting Securities, other than any Safes and other convertible securities (including without limitation shares of Preferred Stock) where the holders of such securities are receiving Cash-Out Amounts or similar liquidation preference payments in lieu of Conversion Amounts or similar \"as-converted\" payments; and excludes the Unissued Option Pool." },
      { label: "\"Liquidity Event\"", text: "means a Change of Control, a Direct Listing or an Initial Public Offering." },
      { label: "\"Liquidity Price\"", text: "means the fair market value of the Common Stock at the time of the Liquidity Event, as determined by reference to the purchase price payable in connection with such Liquidity Event, multiplied by (100% minus the Discount Rate)." },
      { label: "\"Proceeds\"", text: "means cash and other assets (including without limitation stock consideration) that are proceeds from the Liquidity Event or the Dissolution Event, as applicable, and legally available for distribution." },
      { label: "\"Safe\"", text: "means an instrument containing a future right to shares of Capital Stock, similar in form and content to this instrument, purchased by investors for the purpose of funding the Company's business operations. References to \"this Safe\" mean this specific instrument." },
      { label: "\"Safe Preferred Stock\"", text: "means the shares of the series of Preferred Stock issued to the Investor in an Equity Financing, having the identical rights, privileges, preferences, seniority, liquidation multiple and restrictions as the shares of Standard Preferred Stock, except that any price-based preferences (such as the per share liquidation preference and the initial conversion price used for price-based anti-dilution protection) will be based on the Discount Price." },
      { label: "\"Standard Preferred Stock\"", text: "means the shares of the series of Preferred Stock issued to the investors investing new money in the Company in connection with the initial closing of the Equity Financing." },
    ],
  },
  {
    title: "3. Company Representations",
    clauses: [
      { text: "The Company is a corporation duly organized, validly existing and in good standing under the laws of the State of California, and has the power and authority to own, lease and operate its properties and carry on its business as now conducted." },
      { text: "The execution, delivery and performance by the Company of this Safe is within the power of the Company and has been duly authorized by all necessary actions on the part of the Company (subject to Section 3(d)). This Safe constitutes a legal, valid and binding obligation of the Company, enforceable against the Company in accordance with its terms, except as limited by bankruptcy, insolvency or other laws of general application relating to or affecting the enforcement of creditors' rights generally and general principles of equity. To its knowledge, the Company is not in violation of (i) its current certificate of incorporation or bylaws, (ii) any material statute, rule or regulation applicable to the Company or (iii) any material debt or contract to which the Company is a party or by which it is bound, where, in each case, such violation or default, individually, or together with all such violations or defaults, could reasonably be expected to have a material adverse effect on the Company." },
      { text: "The performance and consummation of the transactions contemplated by this Safe do not and will not: (i) violate any material judgment, statute, rule or regulation applicable to the Company; (ii) result in the acceleration of any material debt or contract to which the Company is a party or by which it is bound; or (iii) result in the creation or imposition of any lien on any property, asset or revenue of the Company or the suspension, forfeiture, or nonrenewal of any material permit, license or authorization applicable to the Company, its business or operations." },
      { text: "No consents or approvals are required in connection with the performance of this Safe, other than: (i) the Company's corporate approvals; (ii) any qualifications or filings under applicable securities laws; and (iii) necessary corporate approvals for the authorization of Capital Stock issuable pursuant to Section 1." },
      { text: "To its knowledge, the Company owns or possesses (or can obtain on commercially reasonable terms) sufficient legal rights to all patents, trademarks, service marks, trade names, copyrights, trade secrets, licenses, information, processes and other intellectual property rights necessary for its business as now conducted and as currently proposed to be conducted, without any conflict with, or infringement of the rights of, others." },
    ],
  },
  {
    title: "4. Investor Representations",
    clauses: [
      { text: "The Investor has full legal capacity, power and authority to execute and deliver this Safe and to perform its obligations hereunder. This Safe constitutes a valid and binding obligation of the Investor, enforceable in accordance with its terms, except as limited by bankruptcy, insolvency or other laws of general application relating to or affecting the enforcement of creditors' rights generally and general principles of equity." },
      { text: "The Investor is an accredited investor as such term is defined in Rule 501 of Regulation D under the Securities Act, and acknowledges and agrees that if not an accredited investor at the time of an Equity Financing, the Company may void this Safe and return the Purchase Amount. The Investor will provide documentation reasonably requested by the Company to verify such status. The Investor has been advised that this Safe and the underlying securities have not been registered under the Securities Act, or any state securities laws and, therefore, cannot be resold unless they are registered under the Securities Act and applicable state securities laws or unless an exemption from such registration requirements is available. The Investor is purchasing this Safe and the securities to be acquired by the Investor hereunder for its own account for investment, not as a nominee or agent, and not with a view to, or for resale in connection with, the distribution thereof, and the Investor has no present intention of selling, granting any participation in, or otherwise distributing the same. The Investor has such knowledge and experience in financial and business matters that the Investor is capable of evaluating the merits and risks of such investment, is able to incur a complete loss of such investment without impairing the Investor's financial condition and is able to bear the economic risk of such investment for an indefinite period of time." },
    ],
  },
  {
    title: "5. Miscellaneous",
    clauses: [
      { text: "Any provision of this Safe may be amended, waived or modified by written consent of the Company and either (i) the Investor or (ii) the majority-in-interest of all then-outstanding Safes with the same Discount Rate as this Safe, provided that with respect to clause (ii), the Purchase Amount may not be amended, waived or modified in this manner." },
      { text: `Any notice required or permitted by this Safe will be deemed sufficient when delivered personally or by overnight courier or sent by email to the relevant address listed in Appendix A, or 48 hours after being deposited in the U.S. mail as certified or registered mail with postage prepaid, addressed to the party to be notified at such party's address listed in Appendix A, as subsequently modified by written notice. Notices to the Company will be addressed to ${SAFE.company}, ${SAFE.address}.` },
      { text: "The Investor is not entitled, as a holder of this Safe, to vote or be deemed a holder of Capital Stock for any purpose other than tax purposes, nor will anything in this Safe be construed to confer on the Investor, as such, any rights of a stockholder of the Company or any right to vote for the election of directors or on any matter submitted to stockholders of the Company, or to give or withhold consent to any corporate action or to receive notice of meetings, until shares have been issued on the terms described in Section 1. However, if the Company pays a dividend on outstanding shares of Common Stock (that is not payable in shares of Common Stock) while this Safe is outstanding, the Company will pay the Dividend Amount to the Investor at the same time." },
      { text: "Neither this Safe nor the rights in this Safe are transferable or assignable, by operation of law or otherwise, by either party without the prior written consent of the other; provided, however, that this Safe and/or its rights may be assigned without the Company's consent by the Investor to any other entity who directly or indirectly, controls, is controlled by or is under common control with the Investor, including, without limitation, any general partner, managing member, officer or director of the Investor, or any venture capital fund now or hereafter existing which is controlled by one or more general partners or managing members of, or shares the same management company with, the Investor; and provided, further, that the Company may assign this Safe in whole, without the consent of the Investor, in connection with a reincorporation to change the Company's domicile." },
      { text: "In the event any one or more of the provisions of this Safe is for any reason held to be invalid, illegal or unenforceable, in whole or in part or in any respect, or in the event that any one or more of the provisions of this Safe operate or would prospectively operate to invalidate this Safe, then and in any such event, such provision(s) only will be deemed null and void and will not affect any other provision of this Safe and the remaining provisions of this Safe will remain operative and in full force and effect and will not be affected, prejudiced, or disturbed thereby." },
      { text: "All rights and obligations hereunder will be governed by the laws of the State of California, without regard to the conflicts of law provisions of such jurisdiction. The parties consent to the exclusive jurisdiction of the state and federal courts located in Santa Clara County, California, for any dispute arising out of this Safe." },
      { text: "The parties acknowledge and agree that for United States federal and state income tax purposes this Safe is, and at all times has been, intended to be characterized as stock, and more particularly as common stock for purposes of Sections 304, 305, 306, 354, 368, 1036 and 1202 of the Internal Revenue Code of 1986, as amended. Accordingly, the parties agree to treat this Safe consistent with the foregoing intent for all United States federal and state income tax purposes (including, without limitation, on their respective tax returns or other informational statements)." },
      { text: "The parties agree that this Safe may be executed by electronic signature through the Company's website, that such signature is the legal equivalent of a manual signature, and that the completed Appendix A, together with this instrument, constitutes the entire executed agreement. This Safe may be executed in counterparts, each of which will be deemed an original and all of which together constitute one instrument." },
    ],
  },
];

export const WITNESS = "IN WITNESS WHEREOF, the undersigned have caused this Safe to be duly executed and delivered as of the Date of Agreement set forth in Appendix A.";

// What the investor supplies. Nothing else varies.
export type Appendix = {
  name: string;
  address: string;
  amount: string; // whole US dollars, digits only
  date: string; // YYYY-MM-DD
  email: string;
  signature: string; // typed full name
  signedAt: string; // ISO timestamp, set by the server
  ip?: string;
};

export function fmtAmount(digits: string): string {
  const n = Number(digits.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? `$${n.toLocaleString("en-US")} USD` : "";
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
