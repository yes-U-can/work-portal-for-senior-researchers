import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";
import { callBandApi, getBandAccessTokenForTenant } from "@/lib/integrations/band-service";

type BandCommentsResponse = {
  result_code: number;
  result_data?: {
    items?: Array<{
      comment_key: string;
      body?: string;
      created_at?: string;
      author?: {
        name?: string;
      };
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
  const postKey = request.nextUrl.searchParams.get("postKey");
  if (!bandKey || !postKey) {
    return NextResponse.json({ error: "bandKey and postKey are required." }, { status: 400 });
  }

  const accessToken = await getBandAccessTokenForTenant(access.tenantId);
  if (!accessToken) {
    return NextResponse.json({ error: "BAND account is not connected." }, { status: 400 });
  }

  try {
    const data = await callBandApi<BandCommentsResponse>(accessToken, "/v2/band/post/comments", {
      band_key: bandKey,
      post_key: postKey
    });
    return NextResponse.json({
      comments: data.result_data?.items ?? [],
      resultCode: data.result_code
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load comments." },
      { status: 502 }
    );
  }
}
