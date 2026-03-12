"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  DoorOpen,
  FileSearch,
  FileImage,
  FileText,
  Flame,
  HeartPulse,
  Link2,
  Loader2,
  Orbit,
  Search,
  Send,
  Sparkles,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";

type WorkflowMode = "engineering" | "incident" | "campaign" | "study";

type ApiResult = {
  generatedContent?: string;
  published?: boolean;
  publishReason?: string | null;
  notionPageUrl?: string | null;
  notionPageCreatedId?: string | null;
  notionConnected?: boolean;
  notionWorkspaceName?: string | null;
  mcpNote?: string;
  error?: string;
};

type NotionSessionState = {
  connected: boolean;
  workspaceName?: string | null;
  workspaceId?: string | null;
  workspaceIcon?: string | null;
  ownerName?: string | null;
};

type NotionPageOption = {
  id: string;
  title: string;
  url: string;
  parentType: string | null;
};

type HealthState = {
  geminiConfigured: boolean;
  notionConnected: boolean;
  notionWorkspaceName: string | null;
  notionFallbackConfigured: boolean;
  notionPublishMethod: string;
  oauthConfigured: boolean;
};

const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const RECENT_PAGES_STORAGE_KEY = "nexusforge_recent_pages";

const workflowOptions: Array<{
  value: WorkflowMode;
  label: string;
  blurb: string;
}> = [
  {
    value: "engineering",
    label: "Spec Forge",
    blurb: "Turn whiteboards and architecture diagrams into implementation briefs.",
  },
  {
    value: "incident",
    label: "War Room",
    blurb: "Convert outage screenshots and notes into incident-ready updates.",
  },
  {
    value: "campaign",
    label: "Launch Plan",
    blurb: "Transform moodboards and rough notes into campaign plans.",
  },
  {
    value: "study",
    label: "Study Stack",
    blurb: "Extract revision notes and quiz prompts from visual learning material.",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [notionPageId, setNotionPageId] = useState("");
  const [title, setTitle] = useState("System Design Review");
  const [mode, setMode] = useState<WorkflowMode>("engineering");
  const [image, setImage] = useState<string | null>(null);
  const [imageLabel, setImageLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [notionSession, setNotionSession] = useState<NotionSessionState>({ connected: false });
  const [notionBanner, setNotionBanner] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pageSearch, setPageSearch] = useState("");
  const [pageOptions, setPageOptions] = useState<NotionPageOption[]>([]);
  const [searchingPages, setSearchingPages] = useState(false);
  const [pageSearchError, setPageSearchError] = useState<string | null>(null);
  const [selectedPageTitle, setSelectedPageTitle] = useState<string | null>(null);
  const [recentPages, setRecentPages] = useState<NotionPageOption[]>([]);
  const [health, setHealth] = useState<HealthState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("notion_connected");
    const error = params.get("notion_error");

    if (connected) {
      setNotionBanner("Notion connected successfully.");
      window.history.replaceState({}, "", "/");
    }

    if (error) {
      setNotionBanner(`Notion connection failed: ${error}`);
      window.history.replaceState({}, "", "/");
    }

    void fetch("/api/notion/session")
      .then((sessionResponse) => sessionResponse.json())
      .then((data: NotionSessionState) => setNotionSession(data))
      .catch(() => setNotionSession({ connected: false }));

    void fetch("/api/health")
      .then((healthResponse) => healthResponse.json())
      .then((data: HealthState) => setHealth(data))
      .catch(() => setHealth(null));

    try {
      const stored = window.localStorage.getItem(RECENT_PAGES_STORAGE_KEY);

      if (stored) {
        setRecentPages(JSON.parse(stored) as NotionPageOption[]);
      }
    } catch {
      setRecentPages([]);
    }
  }, []);

  const persistRecentPages = (pages: NotionPageOption[]) => {
    setRecentPages(pages);

    try {
      window.localStorage.setItem(RECENT_PAGES_STORAGE_KEY, JSON.stringify(pages));
    } catch {
      // Ignore localStorage failures and keep the in-memory list only.
    }
  };

  const rememberPage = (page: NotionPageOption) => {
    const nextPages = [page, ...recentPages.filter((item) => item.id !== page.id)].slice(0, 5);
    persistRecentPages(nextPages);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        setUploadError("Unsupported file type. Use PNG, JPEG, or WebP.");
        setImage(null);
        setImageLabel(null);
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setUploadError("Image is too large. Use an image smaller than 10MB.");
        setImage(null);
        setImageLabel(null);
        return;
      }

      setUploadError(null);
      setImageLabel(`${file.name} • ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    if (uploadError) {
      setResult({ error: uploadError });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          title,
          notionPageId,
          imageBase64: image,
          mode,
        }),
      });

      const data = (await response.json()) as ApiResult;
      setResult(data);
    } catch {
      setResult({ error: "Failed to connect to Nexus engine." });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectNotion = async () => {
    await fetch("/api/notion/disconnect", { method: "POST" });
    setNotionSession({ connected: false });
    setNotionBanner("Notion disconnected.");
    setPageOptions([]);
    setSelectedPageTitle(null);
    setHealth((currentHealth) => currentHealth ? {
      ...currentHealth,
      notionConnected: false,
      notionWorkspaceName: null,
      notionPublishMethod: currentHealth.notionFallbackConfigured ? "Configured workspace token" : "Unavailable",
    } : currentHealth);
  };

  const handleSearchPages = async () => {
    setSearchingPages(true);
    setPageSearchError(null);

    try {
      const response = await fetch(`/api/notion/search?query=${encodeURIComponent(pageSearch)}`);
      const data = await response.json() as { pages?: NotionPageOption[]; error?: string };

      if (!response.ok) {
        setPageOptions([]);
        setPageSearchError(data.error ?? "Failed to search Notion pages.");
        return;
      }

      setPageOptions(data.pages ?? []);

      if (!data.pages?.length) {
        setPageSearchError("No matching Notion pages found.");
      }
    } catch {
      setPageSearchError("Failed to search Notion pages.");
      setPageOptions([]);
    } finally {
      setSearchingPages(false);
    }
  };

  const handleSelectPage = (page: NotionPageOption) => {
    setNotionPageId(page.id);
    setSelectedPageTitle(page.title);
    setPageSearchError(null);
    rememberPage(page);
  };

  const healthItems = health ? [
    {
      label: "Gemini",
      ok: health.geminiConfigured,
      detail: health.geminiConfigured ? "Configured" : "Missing API key",
    },
    {
      label: "Notion connection",
      ok: health.notionConnected || health.notionFallbackConfigured,
      detail: health.notionConnected
        ? `Connected to ${health.notionWorkspaceName ?? "workspace"}`
        : health.notionFallbackConfigured
          ? "Fallback token configured"
          : "No token available",
    },
    {
      label: "OAuth",
      ok: health.oauthConfigured,
      detail: health.oauthConfigured ? "Configured" : "OAuth env incomplete",
    },
  ] : [];

  return (
    <div className="grain min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#07111bcc] backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
              <Sparkles className="h-5 w-5 text-[#7ce7ff]" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">NexusForge</p>
              <p className="text-xs uppercase tracking-[0.24em] text-[#9eb4c8]">
                Visual Ideas To Notion Systems
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-sm text-[#c3d0dc] md:flex">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Gemini 3 Flash Preview
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Notion API publish + MCP workspace config
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7ce7ff33] bg-[#7ce7ff12] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#a7ecfa]">
              <Orbit className="h-3.5 w-3.5" />
              Built for the Notion MCP Challenge
            </div>
            {notionBanner && (
              <div className="rounded-2xl border border-[#7ce7ff33] bg-[#7ce7ff12] px-4 py-3 text-sm text-[#a7ecfa]">
                {notionBanner}
              </div>
            )}
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-[#f8f1e8] md:text-7xl">
                Turn rough visuals into polished Notion deliverables.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#b9c8d6] md:text-lg">
                NexusForge is a multimodal pipeline for founders, engineers, and operators. Drop in a whiteboard photo, a screenshot, or a messy prompt, and it generates a structured artifact you can preview here and publish into Notion.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="panel rounded-3xl p-4">
                <BrainCircuit className="mb-3 h-5 w-5 text-[#7ce7ff]" />
                <p className="text-sm font-medium">Multimodal reasoning</p>
                <p className="mt-1 text-sm leading-6 text-[#9fb2c4]">Gemini interprets text plus screenshots or diagrams in one pass.</p>
              </div>
              <div className="panel rounded-3xl p-4">
                <Database className="mb-3 h-5 w-5 text-[#ff8a3d]" />
                <p className="text-sm font-medium">Notion publish path</p>
                <p className="mt-1 text-sm leading-6 text-[#9fb2c4]">Generated markdown can be created as a real child page in Notion.</p>
              </div>
              <div className="panel rounded-3xl p-4">
                <Flame className="mb-3 h-5 w-5 text-[#ffe27a]" />
                <p className="text-sm font-medium">Challenge-ready flow</p>
                <p className="mt-1 text-sm leading-6 text-[#9fb2c4]">Clear screenshots, concrete workflow, and direct Notion value.</p>
              </div>
            </div>
            <div className="panel flex flex-col gap-4 rounded-3xl p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-[#f5efe6]">Notion connection</p>
                <p className="mt-1 text-sm leading-6 text-[#9fb2c4]">
                  {notionSession.connected
                    ? `Connected to ${notionSession.workspaceName ?? "your Notion workspace"}.`
                    : "Connect your Notion account to publish without storing a workspace-wide token in the app."}
                </p>
              </div>
              <div className="flex gap-3">
                {!notionSession.connected ? (
                  <a
                    href="/api/notion/connect"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#7ce7ff33] bg-[#7ce7ff12] px-4 py-3 text-sm font-medium text-[#a7ecfa] transition hover:bg-[#7ce7ff20]"
                  >
                    <Link2 className="h-4 w-4" />
                    Connect Notion
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisconnectNotion}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#f5efe6] transition hover:border-white/20"
                  >
                    <DoorOpen className="h-4 w-4" />
                    Disconnect
                  </button>
                )}
              </div>
            </div>
            <div className="panel rounded-3xl p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#f5efe6]">
                <HeartPulse className="h-4 w-4 text-[#7ce7ff]" />
                Runtime health
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {healthItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#f5efe6]">
                      {item.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TriangleAlert className="h-4 w-4 text-amber-400" />
                      )}
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#9db1c4]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="panel rounded-[28px] p-6 shadow-2xl shadow-black/30">
            <div className="grid gap-3 md:grid-cols-2">
              {workflowOptions.map((option) => {
                const active = option.value === mode;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-[#7ce7ff66] bg-[#7ce7ff12]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/18"
                    }`}
                  >
                    <p className="text-sm font-medium text-[#f5efe6]">{option.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#9db1c4]">{option.blurb}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9eb4c8]">
                  Deliverable title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[#7ce7ff66]"
                  placeholder="Architecture review: checkout service"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9eb4c8]">
                  Search Notion pages
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search for a destination page"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[#7ce7ff66]"
                    value={pageSearch}
                    onChange={(e) => setPageSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSearchPages}
                    disabled={searchingPages || (!pageSearch.trim() && !notionSession.connected && !health?.notionFallbackConfigured)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#f5efe6] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {searchingPages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </div>
                {selectedPageTitle && notionPageId && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    Selected page: {selectedPageTitle}
                  </div>
                )}
                {pageSearchError && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {pageSearchError}
                  </div>
                )}
              </div>
            </div>

            {pageOptions.length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9eb4c8]">
                  Pick a destination page
                </label>
                <div className="grid gap-2">
                  {pageOptions.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => handleSelectPage(page)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        notionPageId === page.id
                          ? "border-[#7ce7ff66] bg-[#7ce7ff12]"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-[#f5efe6]">
                        <FileSearch className="h-4 w-4 text-[#7ce7ff]" />
                        {page.title}
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8ea3b8]">
                        {page.parentType ?? "page"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recentPages.length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9eb4c8]">
                  Recent pages
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  {recentPages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => handleSelectPage(page)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        notionPageId === page.id
                          ? "border-[#7ce7ff66] bg-[#7ce7ff12]"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-[#f5efe6]">
                        <Database className="h-4 w-4 text-[#ff8a3d]" />
                        {page.title}
                      </div>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8ea3b8]">
                        {page.id.slice(0, 8)}...
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9eb4c8]">
                Parent Notion page ID fallback
              </label>
              <input
                type="text"
                placeholder="Paste manually only if search is not enough"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[#7ce7ff66]"
                value={notionPageId}
                onChange={(e) => {
                  setNotionPageId(e.target.value);
                  setSelectedPageTitle(null);
                }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9eb4c8]">
                Visual context
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-[24px] border-2 border-dashed border-white/15 bg-white/[0.03] p-6 transition hover:border-[#ff8a3d66] hover:bg-[#ff8a3d0c]"
              >
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                {image ? (
                  <div className="grid items-center gap-5 md:grid-cols-[180px_1fr]">
                    <Image
                      src={image}
                      alt="Preview"
                      width={720}
                      height={480}
                      unoptimized
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-[#f5efe6]">
                        <FileImage className="h-4 w-4 text-[#7ce7ff]" />
                        Image attached
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#9db1c4]">
                        Gemini will inspect this image alongside your prompt and produce a structured Notion-ready artifact.
                      </p>
                      {imageLabel && (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8ea3b8]">
                          {imageLabel}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <UploadCloud className="mb-3 h-10 w-10 text-[#7ce7ff]" />
                    <p className="text-sm font-medium text-[#f5efe6]">Drop a whiteboard photo, product sketch, dashboard screenshot, or diagram.</p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#9db1c4]">The app is strongest when the visual carries context that would otherwise be tedious to rewrite manually.</p>
                  </div>
                )}
              </div>
              {uploadError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9eb4c8]">
                Instruction prompt
              </label>
              <textarea
                placeholder="Example: turn this architecture sketch into a concise technical brief with key assumptions, implementation risks, and a checklist for the backend team."
                className="h-36 w-full resize-none rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#7ce7ff66]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button
                type="submit"
              disabled={loading || !prompt}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f5efe6] px-5 py-3.5 text-sm font-semibold text-[#09111a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Generate artifact
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#9db1c4]">
                {notionSession.connected
                  ? "Notion is connected. Search for a page or paste a fallback page ID to publish into your workspace."
                  : "Connect Notion or configure a fallback token, then search for a destination page or paste a page ID manually."}
              </div>
            </div>
          </form>
        </section>

        <section className="panel min-h-[720px] overflow-hidden rounded-[32px] shadow-2xl shadow-black/30">
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9db1c4]">Execution console</p>
                <p className="mt-1 text-sm text-[#f5efe6]">Preview the generated markdown and publish result.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#a8bac9] md:flex">
                <Database className="h-3.5 w-3.5 text-[#7ce7ff]" />
                Real Notion publishing available when credentials are configured
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#89a0b4]">Input</p>
                <p className="mt-2 text-sm text-[#f5efe6]">Prompt + optional image</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#89a0b4]">Generate</p>
                <p className="mt-2 text-sm text-[#f5efe6]">Gemini structures the artifact</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#89a0b4]">Publish</p>
                <p className="mt-2 text-sm text-[#f5efe6]">Create a child page in Notion</p>
              </div>
            </div>

            <div className="min-h-[500px] overflow-y-auto rounded-[28px] border border-white/8 bg-[#04090f]/80 p-5">
              <AnimatePresence mode="popLayout">
                {!result && !loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-h-[460px] flex-col items-center justify-center text-center"
                  >
                    <div className="rounded-full border border-white/10 bg-white/[0.03] p-4">
                      <FileText className="h-10 w-10 text-[#7ce7ff]" />
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold text-[#f5efe6]">Ready to forge the first artifact</h2>
                    <p className="mt-3 max-w-md text-sm leading-7 text-[#92a7ba]">
                      The best demo flow is a whiteboard or architecture image plus a precise instruction prompt. That produces screenshots judges can understand immediately.
                    </p>
                  </motion.div>
                )}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 rounded-2xl border border-[#7ce7ff33] bg-[#7ce7ff12] px-4 py-3 text-sm text-[#a7ecfa]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running Gemini multimodal analysis and preparing a Notion-ready draft.
                    </div>
                  </motion.div>
                )}

                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className={`rounded-2xl border px-4 py-4 text-sm ${
                        result.published
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/[0.03] text-[#b6c4d2]"
                      }`}>
                        <p className="flex items-center gap-2 font-medium">
                          <Database className="h-4 w-4" />
                          {result.published ? "Published to Notion" : "Preview mode"}
                        </p>
                        <p className="mt-2 leading-6">
                          {result.published
                            ? "A new child page was created under your target Notion page."
                            : result.publishReason ?? "No publish target configured."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#ff8a3d33] bg-[#ff8a3d12] px-4 py-4 text-sm text-[#ffd4b5]">
                        <p className="flex items-center gap-2 font-medium">
                          <ArrowRight className="h-4 w-4" />
                          MCP note
                        </p>
                        <p className="mt-2 leading-6">{result.mcpNote}</p>
                      </div>
                    </div>

                    {result.notionPageUrl && (
                      <a
                        href={result.notionPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-[#7ce7ff33] bg-[#7ce7ff12] px-4 py-2 text-sm text-[#a7ecfa] transition hover:bg-[#7ce7ff1d]"
                      >
                        Open created Notion page
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    )}

                    {result.generatedContent && (
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f5efe6]">
                          <FileText className="h-4 w-4 text-[#7ce7ff]" />
                          Generated markdown
                        </h3>
                        <div className="overflow-x-auto rounded-[24px] border border-white/8 bg-[#09111a] p-5 font-mono text-xs leading-7 text-[#d4dee8] shadow-inner">
                          {result.generatedContent}
                        </div>
                      </div>
                    )}

                    {result.error && (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {result.error}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
