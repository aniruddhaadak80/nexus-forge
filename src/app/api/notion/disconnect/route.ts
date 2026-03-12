import { NextResponse } from "next/server";

import { clearNotionSessionCookie } from "@/lib/notion-oauth";

export async function POST() {
  await clearNotionSessionCookie();

  return NextResponse.json({ success: true });
}
