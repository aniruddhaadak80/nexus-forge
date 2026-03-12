import { NextRequest, NextResponse } from "next/server";

import { exchangeCodeForToken, setNotionSessionCookie } from "@/lib/notion-oauth";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const origin = requestUrl.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/?notion_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?notion_error=${encodeURIComponent("Missing OAuth code.")}`);
  }

  try {
    const session = await exchangeCodeForToken(code);
    await setNotionSessionCookie(session);

    return NextResponse.redirect(`${origin}/?notion_connected=1`);
  } catch (exchangeError) {
    const message = exchangeError instanceof Error
      ? exchangeError.message
      : "Failed to connect Notion.";

    return NextResponse.redirect(`${origin}/?notion_error=${encodeURIComponent(message)}`);
  }
}
