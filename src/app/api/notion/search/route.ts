import { NextRequest, NextResponse } from "next/server";

import { getNotionSessionFromCookies } from "@/lib/notion-oauth";
import { fetchNotionJson, getReadableNotionError, getTokenLabel, readPageTitle } from "@/lib/nexus";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";
  const notionSession = await getNotionSessionFromCookies();
  const notionApiKey = notionSession?.accessToken ?? process.env.NOTION_API_KEY ?? null;

  if (!notionApiKey) {
    return NextResponse.json(
      { error: "Connect Notion or configure NOTION_API_KEY to search pages." },
      { status: 401 },
    );
  }

  try {
    const payload = await fetchNotionJson<{
      results?: Array<Record<string, unknown>>;
      object?: string;
      code?: string;
      message?: string;
    }>("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        filter: {
          property: "object",
          value: "page",
        },
        page_size: 8,
      }),
    });

    const pages = (payload.results ?? []).map((result) => {
      const item = result as {
        id?: string;
        url?: string;
        properties?: Record<string, unknown>;
        parent?: Record<string, unknown>;
      };

      return {
        id: item.id ?? "",
        url: item.url ?? "",
        title: readPageTitle(item.properties),
        parentType: typeof item.parent?.type === "string" ? item.parent.type : null,
      };
    }).filter((page) => page.id);

    return NextResponse.json({
      pages,
      tokenSource: getTokenLabel(Boolean(notionSession), Boolean(process.env.NOTION_API_KEY)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getReadableNotionError(error, "Failed to search Notion pages.") },
      { status: 502 },
    );
  }
}
