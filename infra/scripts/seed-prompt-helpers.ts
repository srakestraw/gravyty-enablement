/**
 * Seed Prompt Helpers Script
 * 
 * Seeds the starter helper library (12 helpers from PRD) into DynamoDB.
 * Run with: tsx infra/scripts/seed-prompt-helpers.ts
 * 
 * Requires:
 * - AWS credentials configured
 * - PROMPT_HELPERS_TABLE environment variable (defaults to 'prompt_helpers')
 * - User ID for created_by/updated_by (defaults to 'system')
 */

import 'dotenv/config';
import { DynamoPromptHelperRepo } from '../../apps/api/src/storage/dynamo/promptHelperRepo';
import type { CreatePromptHelper } from '@gravyty/domain';

const userId = process.env.SEED_USER_ID || 'system';
const repo = new DynamoPromptHelperRepo();

/**
 * Starter Helper Library Definitions
 * 
 * Based on PRD Starter Helper Library section
 */
const starterHelpers: CreatePromptHelper[] = [
  // 1. Cover - Clean 2D Course Series (Default Candidate)
  {
    name: 'Cover - Clean 2D Course Series',
    description: 'Create a clean 2D digital illustration for a course cover. Use simple bold shapes, minimal detail, consistent line weight, soft shadows, subtle gradients, and generous negative space.',
    applies_to: ['cover_image'],
    composition_mode: 'style_pack',
    prefix_text: 'Create a clean 2D digital illustration for a course cover. Use simple bold shapes, minimal detail, consistent line weight, soft shadows, subtle gradients, and generous negative space. Composition should have a centered hero object with 1-2 supporting elements max. Background should be light and minimal with faint abstract shapes.',
    template_text: 'Subject: {{cover.subject}}. Visual metaphor: {{cover.metaphor}}. Must include: {{cover.must_include}}. Mood: calm, modern, professional.',
    suffix_text: 'No text, no letters, no logos, no watermarks. Avoid photorealism, 3D rendering, clutter, busy scenes, high texture, complex patterns.',
    negative_text: 'Avoid: photorealistic, 3D, anime, heavy grain, crowded composition, typography.',
    allowed_variables: ['cover.subject', 'cover.metaphor', 'cover.must_include'],
    is_default_for: ['cover_image'],
    is_system: true,
  },
  
  // 2. Cover - Abstract Pattern + Icon
  {
    name: 'Cover - Abstract Pattern + Icon',
    description: 'Minimal abstract background pattern with a simple icon representing the subject. Use large shapes and strong negative space.',
    applies_to: ['cover_image'],
    composition_mode: 'hybrid',
    template_text: 'Minimal abstract background pattern with a simple icon representing {{cover.subject}}. Use large shapes and strong negative space. Keep it modern and clean. No text.',
    allowed_variables: ['cover.subject'],
    is_system: true,
  },
  
  // 3. Cover - Friendly Human Moment (Illustrated)
  {
    name: 'Cover - Friendly Human Moment',
    description: 'Simple 2D illustration of 1-2 people collaborating that represents the subject. Keep faces generic, inclusive, no logos, no text.',
    applies_to: ['cover_image'],
    composition_mode: 'style_pack',
    template_text: 'Simple 2D illustration of 1-2 people collaborating that represents {{cover.subject}}. Keep faces generic, inclusive, no logos, no text. Minimal scene props.',
    allowed_variables: ['cover.subject'],
    is_system: true,
  },
  
  // 4. Description - Crisp Outcomes (Default Candidate)
  {
    name: 'Description - Crisp Outcomes',
    description: 'Write clear, direct course descriptions focusing on outcomes and practical takeaways. No hype, no buzzwords, no emojis.',
    applies_to: ['description'],
    composition_mode: 'template',
    template_text: `Write:
1. Short description (1-2 sentences, max 35 words)
2. Long description (4-6 sentences)

Context:
Title: {{course.title}}
Audience: {{course.audience}}
Level: {{course.level}}
Duration: {{course.duration}}
Objectives: {{course.objectives}}
Topics: {{course.topics}}

Requirements:
- Use clear, direct language
- Focus on outcomes and practical takeaways
- No hype, no buzzwords, no emojis
- Avoid claiming results that cannot be guaranteed`,
    allowed_variables: ['course.title', 'course.audience', 'course.level', 'course.duration', 'course.objectives', 'course.topics'],
    is_default_for: ['description'],
    is_system: true,
  },
  
  // 5. Description - Product Led Enablement
  {
    name: 'Description - Product Led Enablement',
    description: 'Emphasize what you will be able to do after the course, common pitfalls you will avoid, and who this is for.',
    applies_to: ['description'],
    composition_mode: 'template',
    template_text: `Write:
1. Short description (1-2 sentences, max 35 words)
2. Long description (4-6 sentences)

Context:
Title: {{course.title}}
Audience: {{course.audience}}
Level: {{course.level}}
Duration: {{course.duration}}
Objectives: {{course.objectives}}
Topics: {{course.topics}}

Requirements:
- Emphasize what you will be able to do after the course
- Mention common pitfalls you will avoid
- Include who this is for and who it's not for (1 sentence in long description)
- Use clear, direct language`,
    allowed_variables: ['course.title', 'course.audience', 'course.level', 'course.duration', 'course.objectives', 'course.topics'],
    is_system: true,
  },
  
  // 6. Description - Executive Summary Style
  {
    name: 'Description - Executive Summary Style',
    description: 'Short: 1 sentence, executive tone. Long: 3-5 sentences, include bullets for "You'll learn" (3 bullets).',
    applies_to: ['description'],
    composition_mode: 'template',
    template_text: `Write:
1. Short description (1 sentence, executive tone)
2. Long description (3-5 sentences, include bullets for "You'll learn" - 3 bullets)

Context:
Title: {{course.title}}
Audience: {{course.audience}}
Level: {{course.level}}
Duration: {{course.duration}}
Objectives: {{course.objectives}}
Topics: {{course.topics}}`,
    allowed_variables: ['course.title', 'course.audience', 'course.level', 'course.duration', 'course.objectives', 'course.topics'],
    is_system: true,
  },
  
  // 7. RTE - Shorten (Keep Meaning)
  {
    name: 'RTE - Shorten (Keep Meaning)',
    description: 'Reduce text by 30-50% while keeping key facts, names, and numbers. Remove filler and repetition.',
    applies_to: ['rte'],
    composition_mode: 'template',
    template_text: `Task: {{action.name}}
Instruction: {{user.instruction}}
Text:
{{selection.text}}

Output requirements:
- Return only the rewritten text, no preamble.`,
    rte_action_instructions: {
      shorten: 'Reduce by 30-50%. Keep key facts, names, and numbers. Remove filler and repetition. Keep original intent and tone.',
    },
    allowed_variables: ['action.name', 'user.instruction', 'selection.text'],
    is_default_for: ['rte_shorten'],
    is_system: true,
  },
  
  // 8. RTE - Expand (Add Clarity, Not Fluff)
  {
    name: 'RTE - Expand (Add Clarity)',
    description: 'Add helpful context and examples. Keep it tight, no fluff. Preserve original structure where possible.',
    applies_to: ['rte'],
    composition_mode: 'template',
    template_text: `Task: {{action.name}}
Instruction: {{user.instruction}}
Text:
{{selection.text}}

Output requirements:
- Return only the rewritten text, no preamble.`,
    rte_action_instructions: {
      expand: 'Add helpful context and examples. Keep it tight, no fluff. Preserve original structure where possible.',
    },
    allowed_variables: ['action.name', 'user.instruction', 'selection.text'],
    is_default_for: ['rte_expand'],
    is_system: true,
  },
  
  // 9. RTE - Rewrite (Plain Language)
  {
    name: 'RTE - Rewrite (Plain Language)',
    description: 'Use simple words and short sentences. Replace jargon with plain language. Keep meaning exactly the same.',
    applies_to: ['rte'],
    composition_mode: 'template',
    template_text: `Task: {{action.name}}
Instruction: {{user.instruction}}
Text:
{{selection.text}}

Output requirements:
- Return only the rewritten text, no preamble.`,
    rte_action_instructions: {
      rewrite: 'Use simple words and short sentences. Replace jargon with plain language. Keep meaning exactly the same.',
    },
    allowed_variables: ['action.name', 'user.instruction', 'selection.text'],
    is_default_for: ['rte_rewrite'],
    is_system: true,
  },
  
  // 10. RTE - Rewrite (Professional and Warm)
  {
    name: 'RTE - Rewrite (Professional and Warm)',
    description: 'Make tone professional, warm, and confident. Avoid hype and excessive adjectives. Keep length similar unless asked.',
    applies_to: ['rte'],
    composition_mode: 'template',
    template_text: `Task: {{action.name}}
Instruction: {{user.instruction}}
Text:
{{selection.text}}

Output requirements:
- Return only the rewritten text, no preamble.`,
    rte_action_instructions: {
      tone_shift: 'Make tone professional, warm, and confident. Avoid hype and excessive adjectives. Keep length similar unless asked.',
    },
    allowed_variables: ['action.name', 'user.instruction', 'selection.text'],
    is_system: true,
  },
  
  // 11. RTE - Bulletize (Scannable)
  {
    name: 'RTE - Bulletize (Scannable)',
    description: 'Convert into concise bullets. Group logically, 3-7 bullets. Keep key terms intact.',
    applies_to: ['rte'],
    composition_mode: 'template',
    template_text: `Task: {{action.name}}
Instruction: {{user.instruction}}
Text:
{{selection.text}}

Output requirements:
- Return only the rewritten text, no preamble.`,
    rte_action_instructions: {
      rewrite: 'Convert into concise bullets. Group logically, 3-7 bullets. Keep key terms intact.',
    },
    allowed_variables: ['action.name', 'user.instruction', 'selection.text'],
    is_system: true,
  },
  
  // 12. RTE - Grammar and Polish
  {
    name: 'RTE - Grammar and Polish',
    description: 'Fix grammar and clarity. Do not change meaning. Keep formatting (bullets, headings) intact.',
    applies_to: ['rte'],
    composition_mode: 'template',
    template_text: `Task: {{action.name}}
Instruction: {{user.instruction}}
Text:
{{selection.text}}

Output requirements:
- Return only the rewritten text, no preamble.`,
    rte_action_instructions: {
      rewrite: 'Fix grammar and clarity. Do not change meaning. Keep formatting (bullets, headings) intact.',
    },
    allowed_variables: ['action.name', 'user.instruction', 'selection.text'],
    is_system: true,
  },
];

async function seedHelpers() {
  console.log('🌱 Seeding prompt helpers...');
  console.log(`User ID: ${userId}`);
  console.log(`Table: ${process.env.PROMPT_HELPERS_TABLE || 'prompt_helpers'}`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const helperData of starterHelpers) {
    try {
      // Check if helper with same name already exists
      const existing = await repo.list({});
      const exists = existing.items.some(h => h.name === helperData.name);
      
      if (exists) {
        console.log(`⏭️  Skipping "${helperData.name}" (already exists)`);
        skipped++;
        continue;
      }
      
      // Create helper
      const helper = await repo.create(helperData, userId);
      console.log(`✅ Created "${helper.name}" (${helper.helper_id})`);
      
      // Publish if it's a default helper
      if (helper.is_default_for.length > 0) {
        await repo.publish(helper.helper_id, userId);
        console.log(`   Published as default for: ${helper.is_default_for.join(', ')}`);
      }
      
      created++;
    } catch (error) {
      console.error(`❌ Error creating "${helperData.name}":`, error);
      errors++;
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

// Run if executed directly
if (require.main === module) {
  seedHelpers().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedHelpers };


