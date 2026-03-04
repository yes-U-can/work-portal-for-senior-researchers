import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "Work Portal for Senior Researchers",
    timestamp: new Date().toISOString()
  });
}
