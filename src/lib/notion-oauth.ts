import { cookies } from "next/headers";

const NOTION_OAUTH_COOKIE = "nexusforge_notion_session";
const NOTION_API_VERSION = "2026-03-11";

type NotionTokenResponse = {
  access_token: string;
  workspace_name: string | null;
  workspace_id: string;
  workspace_icon: string | null;
  owner?: {
    type?: string;
    user?: {
      name?: string | null;
    };
  };
};

export type NotionSession = {
  accessToken: string;
  workspaceName: string | null;
  workspaceId: string;
  workspaceIcon: string | null;
  ownerName: string | null;
};

function getOauthConfig() {
  return {
    clientId: process.env.NOTION_OAUTH_CLIENT_ID,
    clientSecret: process.env.NOTION_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.NOTION_OAUTH_REDIRECT_URI,
  };
}

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = 4 - (normalized.length % 4 || 4);

  return Buffer.from(normalized + "=".repeat(padding % 4), "base64");
}

async function getEncryptionKey() {
  const { clientSecret } = getOauthConfig();

  if (!clientSecret) {
    throw new Error("NOTION_OAUTH_CLIENT_SECRET is not configured.");
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(clientSecret),
  );

  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSession(payload: NotionSession) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return `${toBase64Url(Buffer.from(iv))}.${toBase64Url(Buffer.from(encrypted))}`;
}

async function decryptSession(value: string): Promise<NotionSession | null> {
  try {
    const [ivPart, cipherPart] = value.split(".");

    if (!ivPart || !cipherPart) {
      return null;
    }

    const key = await getEncryptionKey();
    const iv = fromBase64Url(ivPart);
    const cipher = fromBase64Url(cipherPart);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipher,
    );

    return JSON.parse(Buffer.from(decrypted).toString("utf8")) as NotionSession;
  } catch {
    return null;
  }
}

export function buildNotionAuthorizationUrl() {
  const { clientId, redirectUri } = getOauthConfig();

  if (!clientId || !redirectUri) {
    throw new Error("Notion OAuth configuration is incomplete.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
  });

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const { clientId, clientSecret, redirectUri } = getOauthConfig();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Notion OAuth configuration is incomplete.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const payload = (await response.json()) as NotionTokenResponse & { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? "Failed to exchange Notion OAuth code.");
  }

  return {
    accessToken: payload.access_token,
    workspaceName: payload.workspace_name,
    workspaceId: payload.workspace_id,
    workspaceIcon: payload.workspace_icon,
    ownerName: payload.owner?.user?.name ?? null,
  } satisfies NotionSession;
}

export async function setNotionSessionCookie(session: NotionSession) {
  const cookieStore = await cookies();
  const encrypted = await encryptSession(session);

  cookieStore.set(NOTION_OAUTH_COOKIE, encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearNotionSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(NOTION_OAUTH_COOKIE);
}

export async function getNotionSessionFromCookies() {
  const cookieStore = await cookies();
  const value = cookieStore.get(NOTION_OAUTH_COOKIE)?.value;

  if (!value) {
    return null;
  }

  return decryptSession(value);
}
