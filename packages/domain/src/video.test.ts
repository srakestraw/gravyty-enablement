/**
 * Unit tests for video URL parsing utility
 */

import { strict as assert } from "node:assert";
import { parseVideoUrl } from "./video.js";

// YouTube tests
const yt1 = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=x");
assert.equal(yt1.provider, "youtube");
assert.equal(yt1.external_id, "dQw4w9WgXcQ");
assert.ok(yt1.embed_url?.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
assert.ok(yt1.thumbnail_url?.includes("img.youtube.com/vi/dQw4w9WgXcQ"));
assert.ok(yt1.normalized_url.includes("youtube.com/watch?v=dQw4w9WgXcQ"));
assert.ok(!yt1.normalized_url.includes("utm_source"));

const yt2 = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
assert.equal(yt2.provider, "youtube");
assert.equal(yt2.external_id, "dQw4w9WgXcQ");
assert.ok(yt2.embed_url?.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));

const yt3 = parseVideoUrl("https://www.youtube.com/shorts/abc123def45");
assert.equal(yt3.provider, "youtube");
assert.equal(yt3.external_id, "abc123def45");

const yt4 = parseVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
assert.equal(yt4.provider, "youtube");
assert.equal(yt4.external_id, "dQw4w9WgXcQ");

// Loom tests
const loom1 = parseVideoUrl("https://www.loom.com/share/0123456789abcdef0123456789abcdef");
assert.equal(loom1.provider, "loom");
assert.equal(loom1.external_id, "0123456789abcdef0123456789abcdef");
assert.ok(loom1.embed_url?.includes("loom.com/embed/0123456789abcdef0123456789abcdef"));

const loom2 = parseVideoUrl("https://www.loom.com/embed/abc123def456");
assert.equal(loom2.provider, "loom");
assert.equal(loom2.external_id, "abc123def456");

// Vimeo tests
const vimeo1 = parseVideoUrl("https://vimeo.com/123456789");
assert.equal(vimeo1.provider, "vimeo");
assert.equal(vimeo1.external_id, "123456789");
assert.ok(vimeo1.embed_url?.includes("player.vimeo.com/video/123456789"));

const vimeo2 = parseVideoUrl("https://player.vimeo.com/video/123456789");
assert.equal(vimeo2.provider, "vimeo");
assert.equal(vimeo2.external_id, "123456789");

const vimeo3 = parseVideoUrl("https://vimeo.com/channels/mychannel/123456789");
assert.equal(vimeo3.provider, "vimeo");
assert.equal(vimeo3.external_id, "123456789");

// Generic tests
const gen = parseVideoUrl("https://example.com/video");
assert.equal(gen.provider, "generic");
assert.equal(gen.normalized_url, "https://example.com/video");
assert.equal(gen.embed_url, undefined);

// Invalid URL tests
const bad1 = parseVideoUrl("file:///etc/passwd");
assert.ok(bad1.warnings.length > 0);
assert.equal(bad1.provider, "generic");

const bad2 = parseVideoUrl("not-a-url");
assert.ok(bad2.warnings.length > 0);
assert.equal(bad2.provider, "generic");

const empty = parseVideoUrl("");
assert.ok(empty.warnings.length > 0);
assert.equal(empty.provider, "generic");

// URL normalization tests
const normalized = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=test&utm_medium=email#section");
assert.ok(!normalized.normalized_url.includes("utm_source"));
assert.ok(!normalized.normalized_url.includes("utm_medium"));
assert.ok(!normalized.normalized_url.includes("#section"));

console.log("✅ All video URL parsing tests passed");





