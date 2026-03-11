const NOTION_API_VERSION = "2026-03-11";

export type WorkflowMode = "engineering" | "incident" | "campaign" | "study";

type PublishArgs = {
  markdown: string;
  parentPageId: string;
  title: string;
};

export function sanitizeNotionId(value: string) {
  return value.trim().replace(/[^a-fA-F0-9-]/g, "");
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

export async function createNotionPage({ markdown, parentPageId, title }: PublishArgs) {
  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    return {
      published: false,
      reason: "NOTION_API_KEY is not configured.",
    };
  }

  const cleanParentId = sanitizeNotionId(parentPageId);

  if (!cleanParentId) {
    return {
      published: false,
      reason: "A valid parent page ID is required to publish to Notion.",
    };
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
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

  const payload = await response.json();

  if (!response.ok) {
    return {
      published: false,
      reason: payload.message ?? "Notion rejected the request.",
    };
  }

  return {
    published: true,
    id: payload.id as string,
    url: payload.url as string,
  };
}
