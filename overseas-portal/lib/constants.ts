// microCMS のセレクトフィールドの選択肢と一致させること（microcms/*.json と同期）
export const ARTICLE_TYPES = [
  { value: "法改正情報", slug: "update", short: "法改正" },
  { value: "解説コラム", slug: "column", short: "解説" },
  { value: "ウェビナー・セミナー", slug: "seminar", short: "セミナー" },
  { value: "お役立ち資料", slug: "download", short: "資料" },
  { value: "規制動向ウォッチ", slug: "watch", short: "ウォッチ" },
  { value: "お知らせ", slug: "info", short: "お知らせ" },
] as const;

export const REGIONS = [
  { value: "EU", code: "EU", label: "欧州連合", group: "欧州" },
  { value: "英国", code: "UK", label: "英国", group: "欧州" },
  { value: "米国", code: "US", label: "米国", group: "米州" },
  { value: "中国", code: "CN", label: "中国", group: "アジア" },
  { value: "韓国", code: "KR", label: "韓国", group: "アジア" },
  { value: "台湾", code: "TW", label: "台湾", group: "アジア" },
  { value: "ASEAN", code: "ASEAN", label: "東南アジアほか", group: "アジア" },
  { value: "国際", code: "INTL", label: "条約・国際枠組み", group: "国際" },
] as const;

export const FIELDS = [
  "化学物質",
  "製品・包装",
  "サステナビリティ",
  "環境・通商",
] as const;

export const REG_STATUSES = ["適用中", "適用予定", "審議中", "改正中"] as const;

export const typeBySlug = (slug?: string) => ARTICLE_TYPES.find((t) => t.slug === slug);
export const typeByValue = (v?: string) => ARTICLE_TYPES.find((t) => t.value === v);
export const regionByCode = (code?: string) =>
  REGIONS.find((r) => r.code.toLowerCase() === code?.toLowerCase());
export const regionByValue = (v?: string) => REGIONS.find((r) => r.value === v);

export const SITE = {
  name: "Cayzen EHS Research｜海外法規制",
  title: "海外法規制ポータル",
  description:
    "欧州・米国・英国・アジアの製品・化学物質・サステナビリティ規制の改正情報、解説、ウェビナー情報を日本語でお届けします。",
  serviceUrl: "https://eitoss.com/service/cayzen-ai/ehs-reseach",
  contactUrl: "https://eitoss.com/contact",
  tel: "050-8881-9881",
  telHours: "平日10:00〜19:00",
  mail: "cayzen-customer@eitoss.com",
};
