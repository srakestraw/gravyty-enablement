/**
 * Course Asset Repository Interface
 * 
 * Abstraction layer for course asset storage operations.
 */

import type { CourseAsset } from '@gravyty/domain';

export interface CourseAssetRepository {
  /**
   * Create a new course asset attachment
   */
  create(courseAsset: CourseAsset): Promise<CourseAsset>;

  /**
   * Get course asset by ID
   */
  get(courseAssetId: string): Promise<CourseAsset | null>;

  /**
   * List assets for a course
   */
  listByCourse(courseId: string, options?: {
    moduleId?: string;
    lessonId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: CourseAsset[]; next_cursor?: string }>;

  /**
   * List courses using an asset
   */
  listByAsset(assetId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: CourseAsset[]; next_cursor?: string }>;

  /**
   * Update course asset
   */
  update(courseAssetId: string, updates: Partial<CourseAsset>): Promise<CourseAsset>;

  /**
   * Delete course asset
   */
  delete(courseAssetId: string): Promise<void>;
}


