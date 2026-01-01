/**
 * Content Hub - Lifecycle Domain Logic
 *
 * Pure functions for asset version lifecycle transitions.
 */
import { AssetVersion } from './assetVersion.js';
import { Asset } from './asset.js';
/**
 * Schedule a version for future publishing
 */
export declare function scheduleVersion(version: AssetVersion, publishAt: string): AssetVersion;
/**
 * Publish a version immediately
 */
export declare function publishVersion(version: AssetVersion, publishedBy: string, changeLog: string): {
    version: AssetVersion;
    asset: Partial<Asset>;
};
/**
 * Expire a version
 */
export declare function expireVersion(version: AssetVersion): AssetVersion;
/**
 * Archive a version
 */
export declare function archiveVersion(version: AssetVersion): AssetVersion;
/**
 * Deprecate a version (typically replaced by newer version)
 */
export declare function deprecateVersion(version: AssetVersion): AssetVersion;
//# sourceMappingURL=lifecycle.d.ts.map