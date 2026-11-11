export type MicroCMSImage = { url: string; width?: number; height?: number };

export type MicroCMSMeta = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  revisedAt?: string;
};

/** API: ovs-regulations（海外法規制：規制マスタ） */
export type Regulation = MicroCMSMeta & {
  name: string; // 包装規則（PPWR）
  nameEn?: string;
  officialName?: string; // Regulation (EU) 2025/40
  region: string[]; // セレクト（単一でも配列で返る）
  field: string[];
  status: string[];
  statusNote?: string; // 適用中 2026.08.12〜
  overview?: string;
  keyDates?: string; // リッチエディタ（表）
  requirements?: string; // リッチエディタ
  obligations?: string; // リッチエディタ
  support?: string; // リッチエディタ
  isFeatured?: boolean;
  sortOrder?: number;
};

/** API: ovs-articles（海外法規制：記事） */
export type Article = MicroCMSMeta & {
  title: string;
  type: string[];
  regions?: string[];
  fields?: string[];
  date: string;
  summary?: string;
  eyecatch?: MicroCMSImage;
  body?: string;
  regulations?: Regulation[];
  isPickup?: boolean;
  eventDate?: string;
  eventEndDate?: string;
  eventPlace?: string;
  eventUrl?: string;
  downloadUrl?: string;
  sourceUrl?: string;
};

export type ListResponse<T> = {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
};
