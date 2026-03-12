import { NextResponse } from "next/server";

import { buildNotionAuthorizationUrl } from "@/lib/notion-oauth";

export async function GET() {
  try {
    return NextResponse.redirect(buildNotionAuthorizationUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notion OAuth is not configured.";

    return NextResponse.redirect(new URL(`/?notion_error=${encodeURIComponent(message)}`, "http://localhost:3000"));
  }
}
