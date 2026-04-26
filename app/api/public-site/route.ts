import { NextResponse } from "next/server";
import { getPublicSiteContent } from "@/lib/site-admin/public-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getPublicSiteContent();

  return NextResponse.json(content, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    }
  });
}
