import { NextResponse } from "next/server";

import { getNotionSessionFromCookies } from "@/lib/notion-oauth";

export async function GET() {
  const session = await getNotionSessionFromCookies();

  if (!session) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    workspaceName: session.workspaceName,
    workspaceId: session.workspaceId,
    workspaceIcon: session.workspaceIcon,
    ownerName: session.ownerName,
  });
}
