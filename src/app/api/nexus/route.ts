import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import { buildSystemPrompt, createNotionPage, type WorkflowMode } from "@/lib/nexus";
import { TimeoutError, withRetry } from "@/lib/network";
import { getNotionSessionFromCookies } from "@/lib/notion-oauth";

type RequestBody = {
  prompt?: string;
  title?: string;
  notionPageId?: string;
  imageBase64?: string | null;
  mode?: WorkflowMode;
};

export async function POST(req: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const body = (await req.json()) as RequestBody;
    const {
      prompt,
      title,
      notionPageId,
      imageBase64,
      mode = "engineering",
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (imageBase64) {
      const [meta] = imageBase64.split(",");
      const mimeType = meta?.split(":")[1]?.split(";")[0] ?? "image/png";

      if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
        return NextResponse.json(
          { error: "Unsupported file type. Use PNG, JPEG, or WebP for image uploads." },
          { status: 400 },
        );
      }
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const contents: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
      {
        text: `${buildSystemPrompt(mode)}\n\nUser request: ${prompt.trim()}`,
      },
    ];

    if (imageBase64) {
      const [meta, data] = imageBase64.split(",");

      if (meta && data) {
        const mimeType = meta.split(":")[1]?.split(";")[0] ?? "image/png";
        contents.push({
          inlineData: {
            data,
            mimeType,
          },
        });
      }
    }

    const response = await withRetry(
      async () => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
      }),
      {
        retries: 2,
        timeoutMs: 25000,
        retryDelayMs: 1000,
        shouldRetry: (error) => {
          const message = error instanceof Error ? error.message.toLowerCase() : "";
          return error instanceof TimeoutError || message.includes("429") || message.includes("503") || message.includes("timeout");
        },
      },
    );

    const generatedContent = response.text?.trim();

    if (!generatedContent) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 },
      );
    }

    const notionSession = await getNotionSessionFromCookies();
    const publishResult = notionPageId
      ? await createNotionPage({
          markdown: generatedContent,
          parentPageId: notionPageId,
          title: title?.trim() || `NexusForge ${mode} brief`,
          notionApiKey: notionSession?.accessToken ?? null,
        })
      : { published: false, reason: "No Notion parent page ID provided." };

    return NextResponse.json({
      success: true,
      generatedContent,
      published: publishResult.published,
      publishReason: publishResult.published ? null : publishResult.reason,
      notionPageUrl: publishResult.published ? publishResult.url : null,
      notionPageCreatedId: publishResult.published ? publishResult.id : null,
      notionConnected: Boolean(notionSession),
      notionWorkspaceName: notionSession?.workspaceName ?? null,
      mcpNote:
        "This workspace ships with .vscode/mcp.json for direct Notion MCP OAuth inside VS Code. The web app publishes through the Notion API for a user-triggered runtime path.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process request.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
