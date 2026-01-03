/**
 * Import Prompt Helpers Script
 * 
 * Imports prompt helpers and versions from JSON data.
 * Run with: tsx infra/scripts/import-prompt-helpers.ts <path-to-json-file>
 * 
 * Requires:
 * - AWS credentials configured
 * - PROMPT_HELPERS_TABLE environment variable (defaults to 'prompt_helpers')
 * - PROMPT_HELPER_VERSIONS_TABLE environment variable (defaults to 'prompt_helper_versions')
 * - User ID for created_by/updated_by (defaults to 'system_seed')
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { DynamoPromptHelperRepo, PROMPT_HELPER_VERSIONS_TABLE } from '../../apps/api/src/storage/dynamo/promptHelperRepo';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../apps/api/src/aws/dynamoClient';
import type { CreatePromptHelper, PromptHelperVersion } from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';

const userId = process.env.SEED_USER_ID || 'system_seed';
const repo = new DynamoPromptHelperRepo();

interface ImportPromptHelper {
  id: string;
  name: string;
  description: string;
  applies_to: string[];
  composition_mode: string;
  prefix_text?: string;
  template_text?: string;
  suffix_text?: string;
  negative_text?: string;
  rte_action_instructions?: Record<string, string>;
  provider_overrides?: {
    openai?: { additional_instructions?: string };
    gemini?: { additional_instructions?: string };
  };
  allowed_variables?: string[];
  status: string;
  is_default_for?: string[];
  created_by?: string;
  updated_by?: string;
}

interface ImportPromptHelperVersion {
  id: string;
  prompt_helper_id: string;
  version_number: number;
  snapshot_json: any; // Can be object or string
  published_by?: string;
}

interface ImportData {
  prompt_helpers: ImportPromptHelper[];
  prompt_helper_versions: ImportPromptHelperVersion[];
}

/**
 * Map applies_to values from import format to domain format
 */
function mapAppliesTo(appliesTo: string[]): ('cover_image' | 'description' | 'rte')[] {
  return appliesTo.map(value => {
    if (value === 'cover_image_prompt') return 'cover_image';
    if (value === 'cover_image' || value === 'description' || value === 'rte') {
      return value as 'cover_image' | 'description' | 'rte';
    }
    throw new Error(`Invalid applies_to value: ${value}`);
  });
}

/**
 * Map provider_overrides from import format to domain format
 */
function mapProviderOverrides(
  overrides?: ImportPromptHelper['provider_overrides']
): { openai?: string; gemini?: string } | undefined {
  if (!overrides) return undefined;
  
  const result: { openai?: string; gemini?: string } = {};
  if (overrides.openai?.additional_instructions) {
    result.openai = overrides.openai.additional_instructions;
  }
  if (overrides.gemini?.additional_instructions) {
    result.gemini = overrides.gemini.additional_instructions;
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Map is_default_for values from import format to domain format
 */
function mapIsDefaultFor(
  defaults?: string[]
): ('cover_image' | 'description' | 'rte_shorten' | 'rte_expand' | 'rte_rewrite' | 'rte_tone_shift' | 'rte_summarize')[] {
  if (!defaults) return [];
  
  return defaults.map(value => {
    // Map any variations to valid context values
    if (value === 'cover_image_prompt') return 'cover_image';
    if (['cover_image', 'description', 'rte_shorten', 'rte_expand', 'rte_rewrite', 'rte_tone_shift', 'rte_summarize'].includes(value)) {
      return value as any;
    }
    throw new Error(`Invalid is_default_for value: ${value}`);
  });
}

/**
 * Convert import helper to CreatePromptHelper
 */
function convertToCreatePromptHelper(importHelper: ImportPromptHelper): CreatePromptHelper {
  return {
    name: importHelper.name,
    description: importHelper.description,
    applies_to: mapAppliesTo(importHelper.applies_to),
    composition_mode: importHelper.composition_mode as 'template' | 'style_pack' | 'hybrid',
    prefix_text: importHelper.prefix_text,
    template_text: importHelper.template_text,
    suffix_text: importHelper.suffix_text,
    negative_text: importHelper.negative_text,
    rte_action_instructions: importHelper.rte_action_instructions,
    provider_overrides: mapProviderOverrides(importHelper.provider_overrides),
    allowed_variables: importHelper.allowed_variables || [],
    is_default_for: mapIsDefaultFor(importHelper.is_default_for),
    is_system: false, // Imported helpers are not system helpers
    status: importHelper.status === 'published' ? 'draft' : (importHelper.status as 'draft' | 'archived'),
  };
}

/**
 * Create version directly in DynamoDB
 */
async function createVersion(
  helperId: string,
  versionData: ImportPromptHelperVersion
): Promise<void> {
  const now = new Date().toISOString();
  
  // Handle snapshot_json - it might be an object or already a string
  let snapshotJson: string;
  if (typeof versionData.snapshot_json === 'string') {
    snapshotJson = versionData.snapshot_json;
  } else {
    snapshotJson = JSON.stringify(versionData.snapshot_json);
  }
  
  const version: PromptHelperVersion = {
    helper_id: helperId,
    version_number: versionData.version_number,
    snapshot_json: snapshotJson,
    published_at: now,
    published_by: versionData.published_by || userId,
  };
  
  const command = new PutCommand({
    TableName: PROMPT_HELPER_VERSIONS_TABLE,
    Item: version,
  });
  
  await dynamoDocClient.send(command);
}

async function importHelpers(jsonFilePath: string) {
  console.log('📥 Importing prompt helpers...');
  console.log(`User ID: ${userId}`);
  console.log(`File: ${jsonFilePath}`);
  
  // Read and parse JSON file
  const fileContent = readFileSync(jsonFilePath, 'utf-8');
  const importData: ImportData = JSON.parse(fileContent);
  
  console.log(`Found ${importData.prompt_helpers.length} helper(s) and ${importData.prompt_helper_versions.length} version(s)`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  const helperIdMap = new Map<string, string>(); // Map old ID to new helper_id
  
  // First, create all helpers
  for (const importHelper of importData.prompt_helpers) {
    try {
      // Check if helper with same name already exists
      const existing = await repo.list({});
      const exists = existing.items.some(h => h.name === importHelper.name);
      
      if (exists) {
        console.log(`⏭️  Skipping "${importHelper.name}" (already exists)`);
        skipped++;
        continue;
      }
      
      // Convert and create helper
      const createData = convertToCreatePromptHelper(importHelper);
      const helper = await repo.create(createData, importHelper.created_by || userId);
      
      // Map old ID to new helper_id
      helperIdMap.set(importHelper.id, helper.helper_id);
      
      console.log(`✅ Created "${helper.name}" (${helper.helper_id})`);
      
      // If status is published, we'll publish it after creating versions
      if (importHelper.status === 'published') {
        console.log(`   Status: published (will publish after version creation)`);
      }
      
      created++;
    } catch (error) {
      console.error(`❌ Error creating "${importHelper.name}":`, error);
      errors++;
    }
  }
  
  // Then, create versions and publish helpers if needed
  for (const importVersion of importData.prompt_helper_versions) {
    try {
      const helperId = helperIdMap.get(importVersion.prompt_helper_id);
      if (!helperId) {
        console.log(`⚠️  Skipping version ${importVersion.version_number} - helper ID ${importVersion.prompt_helper_id} not found`);
        continue;
      }
      
      // Create version
      await createVersion(helperId, {
        ...importVersion,
        prompt_helper_id: helperId,
      });
      
      console.log(`✅ Created version ${importVersion.version_number} for helper ${helperId}`);
      
      // If this is version 1 and helper should be published, publish it
      const importHelper = importData.prompt_helpers.find(h => h.id === importVersion.prompt_helper_id);
      if (importHelper?.status === 'published' && importVersion.version_number === 1) {
        // Update helper status to published
        await repo.update(helperId, { status: 'published' }, importHelper.updated_by || userId);
        // Log publish action
        await repo.logAction({
          helper_id: helperId,
          action: 'publish',
          actor_id: importVersion.published_by || importHelper.updated_by || userId,
          diff_summary: { version_number: importVersion.version_number },
        });
        console.log(`   Published helper ${helperId}`);
      }
    } catch (error) {
      console.error(`❌ Error creating version ${importVersion.version_number}:`, error);
      errors++;
    }
  }
  
  // Publish any remaining published helpers that don't have versions
  for (const importHelper of importData.prompt_helpers) {
    if (importHelper.status === 'published') {
      const helperId = helperIdMap.get(importHelper.id);
      if (!helperId) continue;
      
      // Check if helper was already published via version creation
      const helper = await repo.get(helperId);
      if (helper && helper.status !== 'published') {
        try {
          await repo.publish(helperId, importHelper.updated_by || userId);
          console.log(`✅ Published helper "${helper.name}"`);
        } catch (error) {
          console.error(`❌ Error publishing helper "${helper.name}":`, error);
        }
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  
  if (errors > 0) {
    process.exit(1);
  }
}

// Get JSON file path from command line
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.error('Usage: tsx infra/scripts/import-prompt-helpers.ts <path-to-json-file>');
  console.error('Example: tsx infra/scripts/import-prompt-helpers.ts ./import-data.json');
  process.exit(1);
}

// Run if executed directly
if (require.main === module) {
  importHelpers(jsonFilePath).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { importHelpers };

