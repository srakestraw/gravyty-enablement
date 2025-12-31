/**
 * Taxonomy Migration Script
 * 
 * Script to migrate existing string-based taxonomy fields to taxonomy option IDs.
 * 
 * Usage:
 *   tsx scripts/taxonomy/migrate-taxonomy.ts --dry-run
 *   tsx scripts/taxonomy/migrate-taxonomy.ts --apply --mapping-file=path/to/mapping.json
 *   tsx scripts/taxonomy/migrate-taxonomy.ts --key=product_suite --dry-run
 * 
 * Flags:
 *   --dry-run          Preview changes without applying them
 *   --apply            Apply the migration (requires --mapping-file)
 *   --key=<key>        Filter by taxonomy key (product|product_suite|topic_tags|all)
 *   --mapping-file=<path>  Path to JSON mapping file
 * 
 * Mapping file format:
 * {
 *   "product": { "Legacy Value": "option_id" },
 *   "product_suite": { "Legacy Value": "option_id" },
 *   "topic_tags": { "Legacy Value": "option_id" }
 * }
 * 
 * Requires Admin role to create taxonomy options.
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { taxonomyRepo } from '../../apps/api/src/storage/dynamo/taxonomyRepo.js';
import { LMS_COURSES_TABLE } from '../../apps/api/src/storage/dynamo/lmsRepo.js';
import { dynamoDocClient } from '../../apps/api/src/aws/dynamoClient.js';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Course } from '@gravyty/domain';
import type { ContentItem } from '@gravyty/domain';

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'migration_script';
const CONTENT_TABLE = process.env.DDB_TABLE_CONTENT || 'content_registry';

interface MappingFile {
  product?: Record<string, string>;
  product_suite?: Record<string, string>;
  topic_tags?: Record<string, string>;
}

interface MigrationStats {
  product_suite: { created: number; mapped: number };
  product_concept: { created: number; mapped: number };
  topic_tag: { created: number; mapped: number };
  courses_updated: number;
  resources_updated: number;
}

/**
 * Generate slug from label
 */
function generateSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract distinct values from courses
 */
async function extractDistinctValues(): Promise<{
  productSuites: Set<string>;
  productConcepts: Set<string>;
  topicTags: Set<string>;
}> {
  console.log('📊 Extracting distinct taxonomy values from courses...');

  const productSuites = new Set<string>();
  const productConcepts = new Set<string>();
  const topicTags = new Set<string>();

  // Scan courses table
  const command = new ScanCommand({
    TableName: LMS_COURSES_TABLE,
  });

  let lastEvaluatedKey;
  do {
    const result = await dynamoDocClient.send({
      ...command,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    });

    const courses = (result.Items || []) as Course[];

    for (const course of courses) {
      // Legacy product_suite (now maps to product)
      if (course.legacy_product_suite || course.product) {
        const value = course.legacy_product_suite || course.product || '';
        if (value) productSuites.add(value);
      }
      // Legacy product_concept (now maps to product_suite)
      if (course.legacy_product_concept || course.product_suite) {
        const value = course.legacy_product_concept || course.product_suite || '';
        if (value) productConcepts.add(value);
      }
      if (course.topic_tags && course.topic_tags.length > 0) {
        course.topic_tags.forEach((tag) => topicTags.add(tag));
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`  Found ${productSuites.size} unique product suites`);
  console.log(`  Found ${productConcepts.size} unique product concepts`);
  console.log(`  Found ${topicTags.size} unique topic tags`);

  return { productSuites, productConcepts, topicTags };
}

/**
 * Create taxonomy options for a group
 */
async function createTaxonomyOptions(
  groupKey: 'product' | 'product_suite' | 'topic_tag',
  values: Set<string>,
  parentMap?: Map<string, string>
): Promise<Map<string, string>> {
  console.log(`\n📝 Creating taxonomy options for ${groupKey}...`);

  const optionIdMap = new Map<string, string>();
  let sortOrder = 0;

  for (const value of Array.from(values).sort()) {
    try {
      const option = await taxonomyRepo.createOption(
        {
          group_key: groupKey,
          label: value,
          slug: generateSlug(value),
          sort_order: sortOrder++,
          parent_id: parentMap?.get(value),
        },
        ADMIN_USER_ID
      );

      optionIdMap.set(value, option.option_id);
      console.log(`  ✅ Created: ${value} -> ${option.option_id}`);
    } catch (error) {
      console.error(`  ❌ Failed to create option for "${value}":`, error);
    }
  }

  return optionIdMap;
}

/**
 * Update courses with taxonomy IDs
 */
async function updateCourses(
  productSuiteMap: Map<string, string>,
  productConceptMap: Map<string, string>,
  topicTagMap: Map<string, string>
): Promise<number> {
  console.log('\n🔄 Updating courses with taxonomy IDs...');

  let updatedCount = 0;

  const command = new ScanCommand({
    TableName: LMS_COURSES_TABLE,
  });

  let lastEvaluatedKey;
  do {
    const result = await dynamoDocClient.send({
      ...command,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    });

    const courses = (result.Items || []) as Course[];

    for (const course of courses) {
      const updates: any = {};
      let hasUpdates = false;

      // Map product (legacy_product_suite -> product_id)
      if (productMap && (course.legacy_product_suite || course.product)) {
        const value = course.legacy_product_suite || course.product || '';
        const optionId = productMap.get(value);
        if (optionId && !course.product_id) {
          updates.product_id = optionId;
          hasUpdates = true;
        }
      }

      // Map product_suite (legacy_product_concept -> product_suite_id)
      if (productSuiteMap && (course.legacy_product_concept || course.product_suite)) {
        const value = course.legacy_product_concept || course.product_suite || '';
        const optionId = productSuiteMap.get(value);
        if (optionId && !course.product_suite_id) {
          updates.product_suite_id = optionId;
          hasUpdates = true;
        }
      }

      // Map topic_tags
      if (course.topic_tags && course.topic_tags.length > 0 && (!course.topic_tag_ids || course.topic_tag_ids.length === 0)) {
        const optionIds = course.topic_tags
          .map((tag) => topicTagMap.get(tag))
          .filter((id): id is string => !!id);
        if (optionIds.length > 0) {
          updates.topic_tag_ids = optionIds;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        const updateCommand = new UpdateCommand({
          TableName: LMS_COURSES_TABLE,
          Key: { course_id: course.course_id },
          UpdateExpression: 'SET product_id = :productId, product_suite_id = :productSuiteId, topic_tag_ids = :tagIds',
          ExpressionAttributeValues: {
            ':productId': updates.product_id || null,
            ':productSuiteId': updates.product_suite_id || null,
            ':tagIds': updates.topic_tag_ids || [],
          },
        });

        await dynamoDocClient.send(updateCommand);
        updatedCount++;
        console.log(`  ✅ Updated course: ${course.course_id}`);
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return updatedCount;
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  dryRun: boolean;
  apply: boolean;
  key?: string;
  mappingFile?: string;
} {
  const args = process.argv.slice(2);
  const result = {
    dryRun: false,
    apply: false,
    key: undefined as string | undefined,
    mappingFile: undefined as string | undefined,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--apply') {
      result.apply = true;
    } else if (arg.startsWith('--key=')) {
      result.key = arg.split('=')[1];
    } else if (arg.startsWith('--mapping-file=')) {
      result.mappingFile = arg.split('=')[1];
    }
  }

  return result;
}

/**
 * Load mapping file
 */
function loadMappingFile(path: string): MappingFile {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as MappingFile;
  } catch (error) {
    console.error(`Failed to load mapping file: ${path}`, error);
    throw error;
  }
}

/**
 * Count updates without applying them (dry run)
 */
async function countUpdates(
  productMap?: Map<string, string>,
  productSuiteMap?: Map<string, string>,
  topicTagMap?: Map<string, string>
): Promise<{ courses: number; resources: number }> {
  let courseCount = 0;
  let resourceCount = 0;

  // Count courses
  const courseCommand = new ScanCommand({
    TableName: LMS_COURSES_TABLE,
  });

  let lastKey;
  do {
    const result = await dynamoDocClient.send({
      ...courseCommand,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    });

    const courses = (result.Items || []) as Course[];
    for (const course of courses) {
      let hasUpdates = false;

      if (productMap && (course.legacy_product_suite || course.product)) {
        const value = course.legacy_product_suite || course.product || '';
        if (value && productMap.has(value) && !course.product_id) {
          hasUpdates = true;
        }
      }

      if (productSuiteMap && (course.legacy_product_concept || course.product_suite)) {
        const value = course.legacy_product_concept || course.product_suite || '';
        if (value && productSuiteMap.has(value) && !course.product_suite_id) {
          hasUpdates = true;
        }
      }

      if (topicTagMap && course.topic_tags && course.topic_tags.length > 0) {
        const mappedIds = course.topic_tags
          .map((tag) => topicTagMap.get(tag))
          .filter((id): id is string => !!id);
        if (mappedIds.length > 0 && (!course.topic_tag_ids || course.topic_tag_ids.length === 0)) {
          hasUpdates = true;
        }
      }

      if (hasUpdates) courseCount++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Count resources
  const resourceCommand = new ScanCommand({
    TableName: CONTENT_TABLE,
  });

  lastKey = undefined;
  do {
    const result = await dynamoDocClient.send({
      ...resourceCommand,
      ...(lastKey && { ExclusiveStartKey: lastKey }),
    });

    const resources = (result.Items || []) as ContentItem[];
    for (const resource of resources) {
      let hasUpdates = false;

      if (productMap && (resource.legacy_product_suite || resource.product)) {
        const value = resource.legacy_product_suite || resource.product || '';
        if (value && productMap.has(value) && !resource.product_id) {
          hasUpdates = true;
        }
      }

      if (productSuiteMap && (resource.legacy_product_concept || resource.product_suite)) {
        const value = resource.legacy_product_concept || resource.product_suite || '';
        if (value && productSuiteMap.has(value) && !resource.product_suite_id) {
          hasUpdates = true;
        }
      }

      if (topicTagMap && resource.tags && resource.tags.length > 0) {
        const mappedIds = resource.tags
          .map((tag) => topicTagMap.get(tag))
          .filter((id): id is string => !!id);
        if (mappedIds.length > 0 && (!resource.topic_tag_ids || resource.topic_tag_ids.length === 0)) {
          hasUpdates = true;
        }
      }

      if (hasUpdates) resourceCount++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return { courses: courseCount, resources: resourceCount };
}

/**
 * Main migration function
 */
async function migrate() {
  const args = parseArgs();
  const isDryRun = args.dryRun || !args.apply;

  console.log(`🚀 Starting taxonomy migration (${isDryRun ? 'DRY RUN' : 'APPLY'})...\n`);

  try {
    let productMap: Map<string, string> | undefined;
    let productSuiteMap: Map<string, string> | undefined;
    let topicTagMap: Map<string, string> | undefined;

    if (args.mappingFile) {
      // Load mapping from file
      const mapping = loadMappingFile(args.mappingFile);
      productMap = mapping.product ? new Map(Object.entries(mapping.product)) : undefined;
      productSuiteMap = mapping.product_suite ? new Map(Object.entries(mapping.product_suite)) : undefined;
      topicTagMap = mapping.topic_tags ? new Map(Object.entries(mapping.topic_tags)) : undefined;
      console.log('📄 Loaded mapping file:', args.mappingFile);
    } else {
      // Extract and create options (legacy behavior)
      console.log('⚠️  No mapping file provided. Extracting distinct values and creating options...\n');
      const { productSuites, productConcepts, topicTags } = await extractDistinctValues();

      if (!isDryRun) {
        // Note: product_suites map to 'product', product_concepts map to 'product_suite'
        productMap = await createTaxonomyOptions('product', productSuites);
        productSuiteMap = await createTaxonomyOptions('product_suite', productConcepts);
        topicTagMap = await createTaxonomyOptions('topic_tag', topicTags);
      }
    }

    if (isDryRun) {
      // Dry run: count updates
      const counts = await countUpdates(productMap, productSuiteMap, topicTagMap);
      console.log('\n📊 Dry Run Results:');
      console.log(`  Courses that would be updated: ${counts.courses}`);
      console.log(`  Resources that would be updated: ${counts.resources}`);
      console.log('\n✅ Dry run completed. Use --apply to apply changes.');
    } else {
      // Apply migration
      if (!productMap && !productSuiteMap && !topicTagMap) {
        console.error('❌ No mapping provided. Use --mapping-file or ensure options are created.');
        process.exit(1);
      }

      const coursesUpdated = await updateCourses(productMap, productSuiteMap, topicTagMap);
      const resourcesUpdated = await updateResources(productMap, productSuiteMap, topicTagMap);

      console.log('\n📊 Migration Summary:');
      console.log(`  Courses Updated: ${coursesUpdated}`);
      console.log(`  Resources Updated: ${resourcesUpdated}`);
      console.log('\n✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Update resources with taxonomy IDs
 */
async function updateResources(
  productMap?: Map<string, string>,
  productSuiteMap?: Map<string, string>,
  topicTagMap?: Map<string, string>
): Promise<number> {
  console.log('\n🔄 Updating resources with taxonomy IDs...');

  let updatedCount = 0;
  const command = new ScanCommand({
    TableName: CONTENT_TABLE,
  });

  let lastEvaluatedKey;
  do {
    const result = await dynamoDocClient.send({
      ...command,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    });

    const resources = (result.Items || []) as ContentItem[];

    for (const resource of resources) {
      const updates: any = {};
      let hasUpdates = false;

      // Map product (legacy_product_suite -> product_id)
      if (productMap && (resource.legacy_product_suite || resource.product)) {
        const value = resource.legacy_product_suite || resource.product || '';
        const optionId = productMap.get(value);
        if (optionId && !resource.product_id) {
          updates.product_id = optionId;
          hasUpdates = true;
        }
      }

      // Map product_suite (legacy_product_concept -> product_suite_id)
      if (productSuiteMap && (resource.legacy_product_concept || resource.product_suite)) {
        const value = resource.legacy_product_concept || resource.product_suite || '';
        const optionId = productSuiteMap.get(value);
        if (optionId && !resource.product_suite_id) {
          updates.product_suite_id = optionId;
          hasUpdates = true;
        }
      }

      // Map topic_tags
      if (topicTagMap && resource.tags && resource.tags.length > 0) {
        const mappedIds = resource.tags
          .map((tag) => topicTagMap.get(tag))
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
        console.log(`  ✅ Updated resource: ${resource.content_id}`);
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return updatedCount;
}

// Run migration
if (require.main === module) {
  migrate();
}

export { migrate };

