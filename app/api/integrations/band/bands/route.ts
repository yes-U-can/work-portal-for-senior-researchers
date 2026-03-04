import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";
import { callBandApi, getBandAccessTokenForTenant } from "@/lib/integrations/band-service";

type BandListResponse = {
  result_code: number;
  result_data?: {
    bands?: Array<{
      band_key: string;
      name: string;
      cover?: string;
    }>;
  };
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access) {
    return NextResponse.json({ error: "Tenant access not found." }, { status: 403 });
  }

  const accessToken = await getBandAccessTokenForTenant(access.tenantId);
  if (!accessToken) {
    return NextResponse.json({ error: "BAND account is not connected." }, { status: 400 });
  }

  try {
    const data = await callBandApi<BandListResponse>(accessToken, "/v2/bands");
    return NextResponse.json({
      bands: data.result_data?.bands ?? [],
      resultCode: data.result_code
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load bands." },
      { status: 502 }
    );
  }
}
