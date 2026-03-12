import { NextResponse } from "next/server";

import { getNotionSessionFromCookies } from "@/lib/notion-oauth";
import { getTokenLabel } from "@/lib/nexus";

export async function GET() {
  const notionSession = await getNotionSessionFromCookies();

  return NextResponse.json({
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    notionConnected: Boolean(notionSession),
    notionWorkspaceName: notionSession?.workspaceName ?? null,
    notionFallbackConfigured: Boolean(process.env.NOTION_API_KEY),
    notionPublishMethod: getTokenLabel(Boolean(notionSession), Boolean(process.env.NOTION_API_KEY)),
    oauthConfigured: Boolean(
      process.env.NOTION_OAUTH_CLIENT_ID &&
      process.env.NOTION_OAUTH_CLIENT_SECRET &&
      process.env.NOTION_OAUTH_REDIRECT_URI,
    ),
  });
}