import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// microCMS の Webhook（カスタム通知）に
// https://<サイト>/api/revalidate?secret=<REVALIDATE_SECRET> を設定すると、公開・更新時に即時反映されます。
export async function POST(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  revalidateTag("ovs-articles");
  revalidateTag("ovs-regulations");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
