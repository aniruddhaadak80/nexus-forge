const NOTION_API_VERSION = "2026-03-11";

import { TimeoutError, withRetry } from "@/lib/network";

export type WorkflowMode = "engineering" | "incident" | "campaign" | "study";

type NotionErrorPayload = {
  code?: string;
  message?: string;
  object?: string;
};

type PublishArgs = {
  markdown: string;
  parentPageId: string;
  title: string;
  notionApiKey?: string | null;
};

export function sanitizeNotionId(value: string) {
  return value.trim().replace(/[^a-fA-F0-9-]/g, "");
}

export function getTokenLabel(hasConnectedSession: boolean, hasFallbackToken: boolean) {
  if (hasConnectedSession) {
    return "Connected Notion workspace";
  }

  if (hasFallbackToken) {
    return "Configured workspace token";
  }

  return "Unavailable";
}

export function readPageTitle(properties?: Record<string, unknown>) {
  if (!properties) {
    return "Untitled page";
  }

  for (const value of Object.values(properties)) {
    const property = value as {
      type?: string;
      title?: Array<{ plain_text?: string }>;
    };

    if (property.type === "title" && property.title?.length) {
      return property.title.map((item) => item.plain_text ?? "").join("").trim() || "Untitled page";
    }
  }

  return "Untitled page";
}

export function getReadableNotionError(error: unknown, fallbackMessage: string) {
  if (error instanceof TimeoutError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export async function fetchNotionJson<T>(url: string, init: RequestInit) {
  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init.headers ?? {}),
          "Notion-Version": NOTION_API_VERSION,
        },
      });

      const payload = (await response.json()) as T & NotionErrorPayload;

      if (!response.ok) {
        throw new Error(
          payload.message
            ? `Notion error (${payload.code ?? response.status}): ${payload.message}`
            : `Notion request failed with status ${response.status}.`,
        );
      }

      return payload;
    } finally {
      clearTimeout(timeoutId);
    }
  }, {
    retries: 2,
    retryDelayMs: 900,
    shouldRetry: (error) => {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      return message.includes("timeout") || message.includes("429") || message.includes("5");
    },
  });
}

export function buildSystemPrompt(mode: WorkflowMode) {
  const modeInstructions: Record<WorkflowMode, string> = {
    engineering:
      "Turn the material into an engineering-ready artifact with sections for summary, architecture notes, implementation plan, risks, and next actions.",
    incident:
      "Turn the material into an incident brief with impact, timeline, likely causes, immediate actions, and follow-up tasks.",
    campaign:
      "Turn the material into a campaign brief with audience, messaging, deliverables, channels, and launch checklist.",
    study:
      "Turn the material into study notes with key concepts, explanations, quiz prompts, and revision checklist.",
  };

  return [
    "You are NexusForge, an expert multimodal analyst for Notion workflows.",
    modeInstructions[mode],
    "Return clean Notion-friendly markdown.",
    "Use concise headings, short paragraphs, and bullet lists.",
    "Do not wrap the entire response in code fences.",
    "If the image is ambiguous, state assumptions explicitly.",
    "End with a section titled Next Actions.",
  ].join(" ");
}

export async function createNotionPage({ markdown, parentPageId, title, notionApiKey }: PublishArgs) {
  const resolvedNotionApiKey = notionApiKey ?? process.env.NOTION_API_KEY;

  if (!resolvedNotionApiKey) {
    return {
      published: false,
      reason: "No Notion token is available. Connect Notion or configure NOTION_API_KEY.",
    };
  }

  const cleanParentId = sanitizeNotionId(parentPageId);

  if (!cleanParentId) {
    return {
      published: false,
      reason: "A valid parent page ID is required to publish to Notion.",
    };
  }

  try {
    const payload = await fetchNotionJson<{ id: string; url: string }>("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolvedNotionApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: {
          page_id: cleanParentId,
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
        },
        icon: {
          type: "emoji",
          emoji: "\u2692\ufe0f",
        },
        markdown,
      }),
    });

    return {
      published: true,
      id: payload.id,
      url: payload.url,
    };
  } catch (error) {
    return {
      published: false,
      reason: getReadableNotionError(error, "Notion rejected the request."),
    };
  }
}
