export function fmtDate(t: number, span?: number) {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const yStr = y < 1000 ? String(y) : String(y);
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (span != null && span > 50 * 365 * 86400000) return yStr;
  if (span != null && span > 3 * 365 * 86400000) return `${mon} ${yStr}`;
  if (span != null && span < 3 * 86400000) return `${mon} ${d.getUTCDate()}, ${yStr} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return `${mon} ${d.getUTCDate()}, ${yStr}`;
}

export function fmtNum(n: number) {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(0) + "K";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function fmtDuration(ms: number) {
  const d = ms / 86400000;
  if (d >= 365 * 2) return `${(d / 365).toFixed(0)} years`;
  if (d >= 60) return `${(d / 30).toFixed(0)} months`;
  if (d >= 2) return `${d.toFixed(0)} days`;
  if (ms >= 2 * 3600000) return `${(ms / 3600000).toFixed(0)} hours`;
  return `${(ms / 60000).toFixed(0)} min`;
}
