import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";
import { callBandApi, getBandAccessTokenForTenant } from "@/lib/integrations/band-service";

type BandPostsResponse = {
  result_code: number;
  result_data?: {
    items?: Array<{
      post_key: string;
      content?: string;
      created_at?: string;
      writer?: {
        name?: string;
      };
      comment_count?: number;
      photos?: Array<{ url?: string }>;
    }>;
  };
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access) {
    return NextResponse.json({ error: "Tenant access not found." }, { status: 403 });
  }

  const bandKey = request.nextUrl.searchParams.get("bandKey");
  if (!bandKey) {
    return NextResponse.json({ error: "bandKey is required." }, { status: 400 });
  }

  const accessToken = await getBandAccessTokenForTenant(access.tenantId);
  if (!accessToken) {
    return NextResponse.json({ error: "BAND account is not connected." }, { status: 400 });
  }

  try {
    const data = await callBandApi<BandPostsResponse>(accessToken, "/v2/band/posts", {
      band_key: bandKey
    });
    return NextResponse.json({
      posts: data.result_data?.items ?? [],
      resultCode: data.result_code
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load posts." },
      { status: 502 }
    );
  }
}
