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
    external_id?: string;
    embed_url?: string;
    thumbnail_url?: string;
    warnings: string[];
};
export declare function isHttpUrlAllowed(url: URL): boolean;
export declare function parseVideoUrl(input: string): ParsedVideoUrl;
//# sourceMappingURL=video.d.ts.map