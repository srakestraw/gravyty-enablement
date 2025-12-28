/**
 * Video URL Parsing Utility
 * 
 * Provides consistent video provider detection and embed URL derivation
 * across API and Web clients.
 */

export type VideoProvider = "youtube" | "loom" | "vimeo" | "generic";

export type ParsedVideoUrl = {
  input: string;
  normalized_url: string;
  provider: VideoProvider;
  external_id?: string;        // provider video id if detected
  embed_url?: string;          // provider embed url when supported
  thumbnail_url?: string;      // currently youtube only
  warnings: string[];
};

export function isHttpUrlAllowed(url: URL): boolean {
  return url.protocol === "https:" || url.protocol === "http:";
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function normalizeUrl(url: URL): string {
  // Normalize host casing, strip fragments, keep query where useful.
  url.hash = "";
  // Strip common tracking params (keep minimal)
  const stripParams = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "si", "feature"
  ];
  stripParams.forEach((p) => url.searchParams.delete(p));
  return url.toString();
}

function parseYouTube(url: URL): { id?: string; embed?: string; thumb?: string; warnings: string[] } {
  const warnings: string[] = [];
  const host = url.hostname.toLowerCase();

  // Supported patterns:
  // - https://www.youtube.com/watch?v=VIDEOID
  // - https://youtu.be/VIDEOID
  // - https://www.youtube.com/shorts/VIDEOID
  // - https://www.youtube.com/embed/VIDEOID
  let id: string | undefined;

  if (host === "youtu.be") {
    const parts = url.pathname.split("/").filter(Boolean);
    id = parts[0];
  } else if (host.endsWith("youtube.com")) {
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.pathname.startsWith("/watch")) {
      id = url.searchParams.get("v") ?? undefined;
    } else if (parts[0] === "shorts" && parts[1]) {
      id = parts[1];
    } else if (parts[0] === "embed" && parts[1]) {
      id = parts[1];
    } else if (parts[0] === "v" && parts[1]) {
      id = parts[1];
    }
  }

  if (!id) {
    warnings.push("Could not extract YouTube video id from URL.");
    return { warnings };
  }

  // Basic sanity: YouTube ids are typically 11 chars, but don't hard-fail.
  if (id.length < 6) warnings.push("YouTube id looks unusually short.");

  const embed = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  const thumb = `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  return { id, embed, thumb, warnings };
}

function parseLoom(url: URL): { id?: string; embed?: string; warnings: string[] } {
  const warnings: string[] = [];
  const host = url.hostname.toLowerCase();

  // Supported patterns:
  // - https://www.loom.com/share/VIDEOID
  // - https://www.loom.com/embed/VIDEOID
  // Sometimes loom share links include query params.
  if (!host.endsWith("loom.com")) return { warnings: ["Host is not loom.com."] };

  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | undefined;

  if (parts[0] === "share" && parts[1]) id = parts[1];
  if (parts[0] === "embed" && parts[1]) id = parts[1];

  if (!id) {
    warnings.push("Could not extract Loom video id from URL.");
    return { warnings };
  }

  const embed = `https://www.loom.com/embed/${encodeURIComponent(id)}`;
  return { id, embed, warnings };
}

function parseVimeo(url: URL): { id?: string; embed?: string; warnings: string[] } {
  const warnings: string[] = [];
  const host = url.hostname.toLowerCase();

  // Supported patterns:
  // - https://vimeo.com/VIDEOID
  // - https://player.vimeo.com/video/VIDEOID
  let id: string | undefined;

  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    // vimeo.com/{id} or vimeo.com/channels/{channel}/{id}
    // pick the last numeric segment
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(parts[i])) {
        id = parts[i];
        break;
      }
    }
  }

  if (!id && host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    // /video/{id}
    const idx = parts.indexOf("video");
    if (idx >= 0 && parts[idx + 1] && /^\d+$/.test(parts[idx + 1])) id = parts[idx + 1];
  }

  if (!id) {
    warnings.push("Could not extract Vimeo video id from URL.");
    return { warnings };
  }

  const embed = `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
  return { id, embed, warnings };
}

export function parseVideoUrl(input: string): ParsedVideoUrl {
  const trimmed = (input ?? "").trim();
  const warnings: string[] = [];

  if (!trimmed) {
    return {
      input,
      normalized_url: "",
      provider: "generic",
      warnings: ["URL is empty."]
    };
  }

  let url: URL;
  try {
    url = new URL(safeDecode(trimmed));
  } catch {
    return {
      input,
      normalized_url: "",
      provider: "generic",
      warnings: ["Invalid URL format."]
    };
  }

  if (!isHttpUrlAllowed(url)) {
    return {
      input,
      normalized_url: "",
      provider: "generic",
      warnings: ["Only http/https URLs are allowed."]
    };
  }

  const host = url.hostname.toLowerCase();
  const normalized_url = normalizeUrl(url);

  // Provider detection
  const isYouTube = host === "youtu.be" || host.endsWith("youtube.com");
  const isLoom = host.endsWith("loom.com");
  const isVimeo = host === "vimeo.com" || host.endsWith(".vimeo.com") || host === "player.vimeo.com";

  if (isYouTube) {
    const yt = parseYouTube(url);
    return {
      input,
      normalized_url,
      provider: "youtube",
      external_id: yt.id,
      embed_url: yt.embed,
      thumbnail_url: yt.thumb,
      warnings: [...warnings, ...(yt.warnings ?? [])]
    };
  }

  if (isLoom) {
    const loom = parseLoom(url);
    return {
      input,
      normalized_url,
      provider: "loom",
      external_id: loom.id,
      embed_url: loom.embed,
      warnings: [...warnings, ...(loom.warnings ?? [])]
    };
  }

  if (isVimeo) {
    const vimeo = parseVimeo(url);
    return {
      input,
      normalized_url,
      provider: "vimeo",
      external_id: vimeo.id,
      embed_url: vimeo.embed,
      warnings: [...warnings, ...(vimeo.warnings ?? [])]
    };
  }

  return {
    input,
    normalized_url,
    provider: "generic",
    warnings
  };
}


