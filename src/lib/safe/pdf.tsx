import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { LEGEND, PREAMBLE, SAFE, SECTIONS, WITNESS, fmtAmount, fmtDate, type Appendix } from "./terms";

// The SAFE as a PDF: the fixed instrument, then Appendix A, blank for the
// download or completed for the executed copy.
const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 64, paddingHorizontal: 72, fontFamily: "Times-Roman", fontSize: 11, lineHeight: 1.4, color: "#111" },
  legend: { fontSize: 8.5, borderWidth: 1, borderColor: "#111", padding: 8, marginBottom: 16, textTransform: "uppercase", lineHeight: 1.3 },
  h1: { fontFamily: "Times-Bold", fontSize: 15, textAlign: "center", letterSpacing: 1, marginBottom: 4 },
  co: { textAlign: "center", fontSize: 10.5, marginBottom: 16 },
  p: { marginBottom: 8, textAlign: "justify" },
  h2: { fontFamily: "Times-Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 14, marginBottom: 6 },
  clause: { flexDirection: "row", marginBottom: 6 },
  letter: { width: 18 },
  body: { flex: 1, textAlign: "justify" },
  b: { fontFamily: "Times-Bold" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111" },
  cellK: { width: "32%", padding: 6, fontFamily: "Times-Bold", borderRightWidth: 1, borderRightColor: "#111" },
  cellV: { flex: 1, padding: 6 },
  table: { borderWidth: 1, borderColor: "#111", borderBottomWidth: 0, marginBottom: 14 },
  sigs: { flexDirection: "row", gap: 36, marginTop: 20 },
  sig: { flex: 1 },
  sigLine: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 34, paddingTop: 4, fontSize: 10 },
  script: { fontFamily: "Times-Italic", fontSize: 14, marginTop: 10 },
  small: { fontSize: 8.5, color: "#555", marginTop: 14 },
  footer: { position: "absolute", bottom: 32, left: 72, right: 72, fontSize: 8.5, color: "#555", flexDirection: "row", justifyContent: "space-between" },
});

const letters = "abcdefghijklmnopqrstuvwxyz";

function Footer({ label }: { label: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{SAFE.company} · Simple Agreement for Future Equity · {label}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

export function SafeDocument({ appendix }: { appendix: Appendix | null }) {
  const label = appendix ? `Executed ${fmtDate(appendix.date)}` : "Form";
  return (
    <Document title={`${SAFE.company} SAFE${appendix ? ` - ${appendix.name}` : ""}`} author={SAFE.company}>
      <Page size="LETTER" style={s.page}>
        <Text style={s.legend}>{LEGEND}</Text>
        <Text style={s.h1}>SIMPLE AGREEMENT FOR FUTURE EQUITY</Text>
        <Text style={s.co}>
          {SAFE.company}
          {"\n"}
          {SAFE.address}
        </Text>
        <Text style={s.p}>{PREAMBLE}</Text>
        {SECTIONS.map((sec) => (
          <View key={sec.title}>
            <Text style={s.h2}>{sec.title}</Text>
            {sec.clauses.map((c, i) => (
              <View key={i} style={s.clause}>
                <Text style={s.letter}>{letters[i]}.</Text>
                <Text style={s.body}>
                  {c.label ? <Text style={s.b}>{c.label} </Text> : null}
                  {c.text}
                </Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={[s.p, { marginTop: 8 }]}>{WITNESS}</Text>
        <Footer label={label} />
      </Page>

      <Page size="LETTER" style={s.page}>
        <Text style={s.h1}>APPENDIX A</Text>
        <Text style={s.co}>Investor information, purchase amount and signatures</Text>
        <View style={s.table}>
          {[
            ["Investor", appendix?.name ?? ""],
            ["Address", appendix?.address ?? ""],
            ["Email", appendix?.email ?? ""],
            ["Purchase Amount", appendix ? fmtAmount(appendix.amount) : ""],
            ["Date of Agreement", appendix ? fmtDate(appendix.date) : ""],
            ["Discount Rate", SAFE.discountRate],
          ].map(([k, v]) => (
            <View key={k} style={s.row}>
              <Text style={s.cellK}>{k}</Text>
              <Text style={s.cellV}>{v || " "}</Text>
            </View>
          ))}
        </View>
        <Text style={s.p}>The undersigned Investor has read the Simple Agreement for Future Equity to which this Appendix A is attached, makes the representations in Section 4, and agrees to be bound by its terms. The Company accepts the Investor&apos;s subscription on the Date of Agreement.</Text>
        <View style={s.sigs}>
          <View style={s.sig}>
            <Text style={s.b}>{SAFE.company.toUpperCase()}</Text>
            {appendix ? <Text style={s.script}>/s/ {SAFE.signer.name}</Text> : null}
            <View style={s.sigLine}>
              <Text>By: {SAFE.signer.name}</Text>
              <Text>Title: {SAFE.signer.title}</Text>
              <Text>Address: {SAFE.address}</Text>
              {appendix ? <Text>Date: {fmtDate(appendix.date)}</Text> : <Text>Date:</Text>}
            </View>
          </View>
          <View style={s.sig}>
            <Text style={s.b}>INVESTOR</Text>
            {appendix ? <Text style={s.script}>/s/ {appendix.signature}</Text> : null}
            <View style={s.sigLine}>
              <Text>Name: {appendix?.name ?? ""}</Text>
              <Text>Address: {appendix?.address ?? ""}</Text>
              <Text>Email: {appendix?.email ?? ""}</Text>
              <Text>Date: {appendix ? fmtDate(appendix.date) : ""}</Text>
            </View>
          </View>
        </View>
        {appendix ? (
          <Text style={s.small}>
            Signed electronically at aigis.studio/investor/safe on {new Date(appendix.signedAt).toUTCString()}
            {appendix.ip ? ` from ${appendix.ip}` : ""}. The Investor consented to electronic signature and delivery.
          </Text>
        ) : (
          <Text style={s.small}>Complete and sign this Appendix online at aigis.studio/investor/safe. The executed agreement is delivered by email as a PDF.</Text>
        )}
        <Footer label={label} />
      </Page>
    </Document>
  );
}

export async function renderSafePdf(appendix: Appendix | null): Promise<Buffer> {
  return renderToBuffer(<SafeDocument appendix={appendix} />);
}
