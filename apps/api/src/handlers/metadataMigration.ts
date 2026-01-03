/**
 * Metadata Migration API Handlers
 * 
 * Handlers for migrating legacy metadata data to controlled options
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../aws/dynamoClient';
import { LMS_COURSES_TABLE } from '../storage/dynamo/lmsRepo';
import type { Course } from '@gravyty/domain';
import type { ContentItem } from '@gravyty/domain';

const CONTENT_TABLE = process.env.DDB_TABLE_CONTENT || 'content_registry';

/**
 * GET /v1/metadata/migration/scan
 * Scan Courses and Resources for legacy metadata values
 */
export async function scanLegacyMetadataValues(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const key = req.query.key as string | undefined; // Optional: filter by metadata key

    const legacyValues: {
      product_suite: Record<string, { courses: number; resources: number }>;
      product: Record<string, { courses: number; resources: number }>;
      topic_tags: Record<string, { courses: number; resources: number }>;
    } = {
      product_suite: {},
      product: {},
      topic_tags: {},
    };

    // Scan Courses
    let courseLastKey;
    do {
      const courseCommand = new ScanCommand({
        TableName: LMS_COURSES_TABLE,
        ...(courseLastKey && { ExclusiveStartKey: courseLastKey }),
      });

      const courseResult = await dynamoDocClient.send(courseCommand);
      const courses = (courseResult.Items || []) as Course[];

      for (const course of courses) {
        // Legacy product_suite (now maps to product)
        if (course.legacy_product_suite || course.product) {
          const value = course.legacy_product_suite || course.product || '';
          if (value && (!key || key === 'product')) {
            if (!legacyValues.product[value]) {
              legacyValues.product[value] = { courses: 0, resources: 0 };
            }
            legacyValues.product[value].courses++;
          }
        }

        // Legacy product_concept (now maps to product_suite)
        if (course.legacy_product_concept || course.product_suite) {
          const value = course.legacy_product_concept || course.product_suite || '';
          if (value && (!key || key === 'product_suite')) {
            if (!legacyValues.product_suite[value]) {
              legacyValues.product_suite[value] = { courses: 0, resources: 0 };
            }
            legacyValues.product_suite[value].courses++;
          }
        }

        // Legacy topic_tags
        if (course.topic_tags && course.topic_tags.length > 0 && (!key || key === 'topic_tags')) {
          for (const tag of course.topic_tags) {
            if (!legacyValues.topic_tags[tag]) {
              legacyValues.topic_tags[tag] = { courses: 0, resources: 0 };
            }
            legacyValues.topic_tags[tag].courses++;
          }
        }
      }

      courseLastKey = courseResult.LastEvaluatedKey;
    } while (courseLastKey);

    // Scan Resources
    let resourceLastKey;
    do {
      const resourceCommand = new ScanCommand({
        TableName: CONTENT_TABLE,
        ...(resourceLastKey && { ExclusiveStartKey: resourceLastKey }),
      });

      const resourceResult = await dynamoDocClient.send(resourceCommand);
      const resources = (resourceResult.Items || []) as ContentItem[];

      for (const resource of resources) {
        // Legacy product_suite (now maps to product)
        if (resource.legacy_product_suite || resource.product) {
          const value = resource.legacy_product_suite || resource.product || '';
          if (value && (!key || key === 'product')) {
            if (!legacyValues.product[value]) {
              legacyValues.product[value] = { courses: 0, resources: 0 };
            }
            legacyValues.product[value].resources++;
          }
        }

        // Legacy product_concept (now maps to product_suite)
        if (resource.legacy_product_concept || resource.product_suite) {
          const value = resource.legacy_product_concept || resource.product_suite || '';
          if (value && (!key || key === 'product_suite')) {
            if (!legacyValues.product_suite[value]) {
              legacyValues.product_suite[value] = { courses: 0, resources: 0 };
            }
            legacyValues.product_suite[value].resources++;
          }
        }

        // Legacy tags (topic_tags)
        if (resource.tags && resource.tags.length > 0 && (!key || key === 'topic_tags')) {
          for (const tag of resource.tags) {
            if (!legacyValues.topic_tags[tag]) {
              legacyValues.topic_tags[tag] = { courses: 0, resources: 0 };
            }
            legacyValues.topic_tags[tag].resources++;
          }
        }
      }

      resourceLastKey = resourceResult.LastEvaluatedKey;
    } while (resourceLastKey);

    const response: ApiSuccessResponse<typeof legacyValues> = {
      data: legacyValues,
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error scanning legacy metadata values:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to scan legacy metadata values',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/metadata/migration/apply
 * Apply migration mapping to update Courses and Resources
 */
export async function applyMetadataMigration(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const MappingSchema = z.object({
      product: z.record(z.string()).optional(), // { "Legacy Value": "option_id" }
      product_suite: z.record(z.string()).optional(),
      topic_tags: z.record(z.string()).optional(),
      dry_run: z.boolean().optional().default(false),
    });

    const parsed = MappingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    const { product, product_suite, topic_tags, dry_run } = parsed.data;

    let coursesUpdated = 0;
    let resourcesUpdated = 0;

    if (!dry_run) {
      // Apply migration to Courses
      coursesUpdated = await migrateCourses(product, product_suite, topic_tags);

      // Apply migration to Resources
      resourcesUpdated = await migrateResources(product, product_suite, topic_tags);
    } else {
      // Dry run: count what would be updated
      const courseCounts = await countCourseUpdates(product, product_suite, topic_tags);
      const resourceCounts = await countResourceUpdates(product, product_suite, topic_tags);
      coursesUpdated = courseCounts;
      resourcesUpdated = resourceCounts;
    }

    const response: ApiSuccessResponse<{
      courses_updated: number;
      resources_updated: number;
      dry_run: boolean;
    }> = {
      data: {
        courses_updated: coursesUpdated,
        resources_updated: resourcesUpdated,
        dry_run: dry_run || false,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error applying metadata migration:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to apply metadata migration',
      },
      request_id: requestId,
    });
  }
}

/**
 * Helper: Migrate courses with mapping
 */
async function migrateCourses(
  productMap?: Record<string, string>,
  productSuiteMap?: Record<string, string>,
  topicTagMap?: Record<string, string>
): Promise<number> {
  let updatedCount = 0;

  let lastKey;
  do {
    const command = new ScanCommand({
      TableName: LMS_COURSES_TABLE,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    });

    const result = await dynamoDocClient.send(command);
    const courses = (result.Items || []) as Course[];

    for (const course of courses) {
      const updates: any = {};
      let hasUpdates = false;

      // Map product (legacy_product_suite -> product_id)
      if (productMap) {
        const legacyValue = course.legacy_product_suite || course.product;
        if (legacyValue && productMap[legacyValue] && !course.product_id) {
          updates.product_id = productMap[legacyValue];
          hasUpdates = true;
        }
      }

      // Map product_suite (legacy_product_concept -> product_suite_id)
      if (productSuiteMap) {
        const legacyValue = course.legacy_product_concept || course.product_suite;
        if (legacyValue && productSuiteMap[legacyValue] && !course.product_suite_id) {
          updates.product_suite_id = productSuiteMap[legacyValue];
          hasUpdates = true;
        }
      }

      // Map topic_tags
      if (topicTagMap && course.topic_tags && course.topic_tags.length > 0) {
        const mappedIds = course.topic_tags
          .map((tag) => topicTagMap[tag])
          .filter((id): id is string => !!id);
        if (mappedIds.length > 0 && (!course.topic_tag_ids || course.topic_tag_ids.length === 0)) {
          updates.topic_tag_ids = mappedIds;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        const updateCommand = new UpdateCommand({
          TableName: LMS_COURSES_TABLE,
          Key: { course_id: course.course_id },
          UpdateExpression: 'SET product_id = :productId, product_suite_id = :productSuiteId, topic_tag_ids = :topicTagIds',
          ExpressionAttributeValues: {
            ':productId': updates.product_id || null,
            ':productSuiteId': updates.product_suite_id || null,
            ':topicTagIds': updates.topic_tag_ids || [],
          },
        });

        await dynamoDocClient.send(updateCommand);
        updatedCount++;
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return updatedCount;
}

/**
 * Helper: Migrate resources with mapping
 */
async function migrateResources(
  productMap?: Record<string, string>,
  productSuiteMap?: Record<string, string>,
  topicTagMap?: Record<string, string>
): Promise<number> {
  let updatedCount = 0;

  let lastKey;
  do {
    const command = new ScanCommand({
      TableName: CONTENT_TABLE,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    });

    const result = await dynamoDocClient.send(command);
    const resources = (result.Items || []) as ContentItem[];

    for (const resource of resources) {
      const updates: any = {};
      let hasUpdates = false;

      // Map product (legacy_product_suite -> product_id)
      if (productMap) {
        const legacyValue = resource.legacy_product_suite || resource.product;
        if (legacyValue && productMap[legacyValue] && !resource.product_id) {
          updates.product_id = productMap[legacyValue];
          hasUpdates = true;
        }
      }

      // Map product_suite (legacy_product_concept -> product_suite_id)
      if (productSuiteMap) {
        const legacyValue = resource.legacy_product_concept || resource.product_suite;
        if (legacyValue && productSuiteMap[legacyValue] && !resource.product_suite_id) {
          updates.product_suite_id = productSuiteMap[legacyValue];
          hasUpdates = true;
        }
      }

      // Map topic_tags
      if (topicTagMap && resource.tags && resource.tags.length > 0) {
        const mappedIds = resource.tags
          .map((tag) => topicTagMap[tag])
          .filter((id): id is string => !!id);
        if (mappedIds.length > 0 && (!resource.topic_tag_ids || resource.topic_tag_ids.length === 0)) {
          updates.topic_tag_ids = mappedIds;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        const updateCommand = new UpdateCommand({
          TableName: CONTENT_TABLE,
          Key: { content_id: resource.content_id },
          UpdateExpression: 'SET product_id = :productId, product_suite_id = :productSuiteId, topic_tag_ids = :topicTagIds',
          ExpressionAttributeValues: {
            ':productId': updates.product_id || null,
            ':productSuiteId': updates.product_suite_id || null,
            ':topicTagIds': updates.topic_tag_ids || [],
          },
        });

        await dynamoDocClient.send(updateCommand);
        updatedCount++;
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return updatedCount;
}

/**
 * Helper: Count course updates (dry run)
 */
async function countCourseUpdates(
  productMap?: Record<string, string>,
  productSuiteMap?: Record<string, string>,
  topicTagMap?: Record<string, string>
): Promise<number> {
  let count = 0;

  let lastKey;
  do {
    const command = new ScanCommand({
      TableName: LMS_COURSES_TABLE,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    });

    const result = await dynamoDocClient.send(command);
    const courses = (result.Items || []) as Course[];

    for (const course of courses) {
      let hasUpdates = false;

      if (productMap) {
        const legacyValue = course.legacy_product_suite || course.product;
        if (legacyValue && productMap[legacyValue] && !course.product_id) {
          hasUpdates = true;
        }
      }

      if (productSuiteMap) {
        const legacyValue = course.legacy_product_concept || course.product_suite;
        if (legacyValue && productSuiteMap[legacyValue] && !course.product_suite_id) {
          hasUpdates = true;
        }
      }

      if (topicTagMap && course.topic_tags && course.topic_tags.length > 0) {
        const mappedIds = course.topic_tags
          .map((tag) => topicTagMap[tag])
          .filter((id): id is string => !!id);
        if (mappedIds.length > 0 && (!course.topic_tag_ids || course.topic_tag_ids.length === 0)) {
          hasUpdates = true;
        }
      }

      if (hasUpdates) count++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return count;
}

/**
 * Helper: Count resource updates (dry run)
 */
async function countResourceUpdates(
  productMap?: Record<string, string>,
  productSuiteMap?: Record<string, string>,
  topicTagMap?: Record<string, string>
): Promise<number> {
  let count = 0;

  let lastKey;
  do {
    const command = new ScanCommand({
      TableName: CONTENT_TABLE,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    });

    const result = await dynamoDocClient.send(command);
    const resources = (result.Items || []) as ContentItem[];

    for (const resource of resources) {
      let hasUpdates = false;

      if (productMap) {
        const legacyValue = resource.legacy_product_suite || resource.product;
        if (legacyValue && productMap[legacyValue] && !resource.product_id) {
          hasUpdates = true;
        }
      }

      if (productSuiteMap) {
        const legacyValue = resource.legacy_product_concept || resource.product_suite;
        if (legacyValue && productSuiteMap[legacyValue] && !resource.product_suite_id) {
          hasUpdates = true;
        }
      }

      if (topicTagMap && resource.tags && resource.tags.length > 0) {
        const mappedIds = resource.tags
          .map((tag) => topicTagMap[tag])
          .filter((id): id is string => !!id);
        if (mappedIds.length > 0 && (!resource.topic_tag_ids || resource.topic_tag_ids.length === 0)) {
          hasUpdates = true;
        }
      }

      if (hasUpdates) count++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return count;
}


