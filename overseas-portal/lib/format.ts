export const fmtDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  // 日本時間で表示
  const j = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${j.getUTCFullYear()}.${p(j.getUTCMonth() + 1)}.${p(j.getUTCDate())}`;
};
const WD = ["日", "月", "火", "水", "木", "金", "土"];
export const fmtEvent = (start?: string, end?: string) => {
  if (!start) return "";
  const s = new Date(new Date(start).getTime() + 9 * 3600 * 1000);
  const t = (d: Date) => `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  let out = `${s.getUTCFullYear()}年${s.getUTCMonth() + 1}月${s.getUTCDate()}日（${WD[s.getUTCDay()]}）${t(s)}`;
  if (end) out += `〜${t(new Date(new Date(end).getTime() + 9 * 3600 * 1000))}`;
  return out;
};
export const isUpcoming = (iso?: string) => !!iso && new Date(iso).getTime() > Date.now();
