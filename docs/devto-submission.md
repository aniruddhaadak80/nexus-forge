---
title: "NexusForge: The Multimodal AI Agent Hub for Notion"
published: false
tags: devchallenge, notionchallenge, mcp, ai, nextjs
---

*This is a submission for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04)*

## What I Built
**NexusForge** is a multimodal workflow app for Notion. It turns screenshots, whiteboard photos, rough sketches, and messy prompts into structured Notion-ready deliverables.

The strongest workflow in the app is **diagram to technical brief**: upload a system design image, ask for a concise engineering summary, and NexusForge produces a clean markdown artifact that can be previewed immediately and published into Notion as a child page.

I built it to solve a very practical problem: visual thinking happens early, but documentation usually happens later and manually. NexusForge closes that gap.

It combines:
- **Gemini 3 Flash Preview** for multimodal understanding
- **Notion OAuth + Notion API** for connecting a user workspace and creating real pages from generated markdown
- **Notion MCP configuration** in the workspace so the repo is ready for direct Notion MCP OAuth in VS Code

## Reliability Hardening
To make the app safer for broader public use, I added:
- a **Notion page picker** backed by live workspace search
- **client-side upload validation** for unsupported image types and oversized files
- **clearer Notion publish errors** instead of generic failures
- **retry and timeout handling** for both Gemini and Notion requests
- a small **runtime health panel** so users can see whether Gemini, OAuth, and Notion publish paths are actually ready

## Video Demo
*(Placeholder for Video URL showing image upload and Notion auto-population)*

## Screenshots
### Live app with in-product Notion connect flow
![NexusForge OAuth home](./screenshots/nexusforge-oauth-home.png)

### Generated result from an uploaded system map
![NexusForge generated result](./screenshots/nexusforge-generated.png)

## Structure Flowchart
Let's see how the internal pipeline operates using this diagram:

```mermaid
graph TD
    A[Upload screenshot or diagram] --> B[Next.js app]
    B --> C{Gemini 3 Flash Preview}
    C --> D[Generated Notion-ready markdown]
  D --> E{Notion connected?}
  E -- No --> F[Preview in app]
  E -- Yes --> G{Parent page ID present?}
  G -- No --> H[Preview in app]
  G -- Yes --> I[Create child page in Notion]
  J[VS Code MCP config] --> K[Direct Notion MCP OAuth in workspace]
```

## Setup & Implementation Guide
### 1. The Multimodal Intelligence
I used `@google/genai` with `gemini-3-flash-preview` so NexusForge can reason about both text and images in one request. That makes screenshots and architecture diagrams first-class input instead of just attachments.

```typescript
const contents = [
  {
    text: `${buildSystemPrompt(mode)}\n\nUser request: ${prompt.trim()}`,
  },
];

if (imageBase64) {
  const [meta, data] = imageBase64.split(",");
  const mimeType = meta.split(":")[1]?.split(";")[0] ?? "image/png";
  contents.push({
    inlineData: { data, mimeType },
  });
}

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents,
});
```

### 2. The Notion Publishing Path
For the web app runtime, I now support a proper Notion OAuth connect flow. Users can connect their own workspace from the UI, which stores an encrypted session cookie and lets the server publish to Notion using that workspace token. I also kept `NOTION_API_KEY` as a fallback for internal demos.

Once connected, the app uses the Notion API to create a real child page under a selected parent page:

```typescript
const response = await fetch("https://api.notion.com/v1/pages", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${notionApiKey}`,
    "Content-Type": "application/json",
    "Notion-Version": "2026-03-11",
  },
  body: JSON.stringify({
    parent: { page_id: cleanParentId },
    properties: {
      title: {
        title: [{ text: { content: title } }],
      },
    },
    markdown,
  }),
});
```

### 3. OAuth Callback + Session Handling
The app includes a callback route at `/api/notion/callback` that exchanges the authorization code for an access token, encrypts the token server-side, and stores it in an HTTP-only cookie. That makes the demo feel like a real connected product rather than a one-off internal script.

### 4. Where MCP Fits
The repo also includes `.vscode/mcp.json` pointing at `https://mcp.notion.com/mcp`, so the workspace itself is ready for direct Notion MCP authentication inside GitHub Copilot or other MCP-capable tools in VS Code.

That means the project demonstrates two complementary ideas:
- **Web app publishing flow** for end users
- **Workspace MCP integration** for AI-assisted Notion operations while developing

## Why This Stands Out In The Challenge
- It is not just “chat with Notion”. It is a concrete production-style workflow.
- It shows off **multimodality** in a way judges can understand immediately.
- It includes a real in-product **Connect Notion** OAuth handoff instead of relying only on hidden developer credentials.
- It uses Notion in a way that feels native: generating polished artifacts and pushing them directly into a workspace.
- It is practical across engineering, operations, marketing, and study workflows.
- It has been hardened beyond a demo by reducing common user failure modes in the publish flow.

## Future Scope
- Add PDF and document ingestion for richer multimodal pipelines.
- Add template-aware publishing into specific Notion databases.
- Add polling and human-in-the-loop approval flows for recurring workflows.

Thank you to Notion and DEV! NexusForge aims to redefine exactly how interactive and automated workspaces should feel!
