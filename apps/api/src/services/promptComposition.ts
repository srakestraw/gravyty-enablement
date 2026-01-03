/**
 * Prompt Composition Service
 * 
 * Composes prompts from helpers, variables, and user input according to PRD rules
 */

import type {
  PromptHelper,
  PromptHelperAppliesTo,
  RteActionType,
  ComposedPromptResponse,
  ComposePromptRequest,
} from '@gravyty/domain';
import {
  substituteVariables,
  getAvailableVariables,
  type VariableContext,
} from './promptVariables.js';

/**
 * Compose prompt from helper and context
 */
export function composePrompt(
  helper: PromptHelper,
  request: ComposePromptRequest,
  context: VariableContext
): ComposedPromptResponse {
  const warnings: string[] = [];
  const parts: string[] = [];
  
  // 1. Helper prefix
  if (helper.prefix_text) {
    const prefixResult = substituteVariables(
      helper.prefix_text,
      context,
      helper.allowed_variables.length > 0 ? helper.allowed_variables : undefined
    );
    if (prefixResult.result) {
      parts.push(prefixResult.result);
    }
    if (prefixResult.missingVariables.length > 0) {
      warnings.push(`Missing variables in prefix: ${prefixResult.missingVariables.join(', ')}`);
    }
  }
  
  // 2. Helper template with variables substituted
  if (helper.template_text) {
    const templateResult = substituteVariables(
      helper.template_text,
      context,
      helper.allowed_variables.length > 0 ? helper.allowed_variables : undefined
    );
    if (templateResult.result) {
      parts.push(templateResult.result);
    }
    if (templateResult.missingVariables.length > 0) {
      warnings.push(`Missing variables in template: ${templateResult.missingVariables.join(', ')}`);
    }
  }
  
  // 3. Action instructions (RTE) and/or user instruction
  if (request.context === 'rte' && helper.rte_action_instructions) {
    if (request.action_type && helper.rte_action_instructions[request.action_type]) {
      const actionInstruction = helper.rte_action_instructions[request.action_type];
      if (actionInstruction) {
        parts.push(actionInstruction);
      }
    }
  }
  
  // Add user instruction if provided
  if (request.user_instruction) {
    parts.push(`User instruction: ${request.user_instruction}`);
  }
  
  // 4. User content (selected text, metadata, or image subject prompt)
  if (request.user_content) {
    if (request.context === 'rte') {
      parts.push(`Text to modify:\n${request.user_content}`);
    } else if (request.context === 'cover_image') {
      parts.push(`Subject: ${request.user_content}`);
    } else if (request.context === 'description') {
      // For description, user_content might be additional context
      parts.push(`Additional context: ${request.user_content}`);
    }
  }
  
  // 5. Helper suffix
  if (helper.suffix_text) {
    const suffixResult = substituteVariables(
      helper.suffix_text,
      context,
      helper.allowed_variables.length > 0 ? helper.allowed_variables : undefined
    );
    if (suffixResult.result) {
      parts.push(suffixResult.result);
    }
    if (suffixResult.missingVariables.length > 0) {
      warnings.push(`Missing variables in suffix: ${suffixResult.missingVariables.join(', ')}`);
    }
  }
  
  // 6. Provider-specific overrides
  if (helper.provider_overrides && request.provider) {
    const providerOverride = helper.provider_overrides[request.provider];
    if (providerOverride) {
      parts.push(providerOverride);
    }
  }
  
  // 7. Negative guidance mapped
  if (helper.negative_text) {
    // For image generation, negative guidance is often a separate parameter
    // For text generation, append as "Avoid:" instruction
    if (request.context === 'cover_image') {
      // Negative guidance for images - append as "Avoid:" instruction
      parts.push(`Avoid: ${helper.negative_text}`);
    } else {
      // For text generation, append as guidance
      parts.push(`Avoid: ${helper.negative_text}`);
    }
  }
  
  // Compose final prompt
  let composedPrompt = parts.filter(p => p.trim().length > 0).join('\n\n');
  
  // Length guards
  const maxLength = request.provider === 'openai' ? 4000 : 8000; // Approximate limits
  if (composedPrompt.length > maxLength) {
    warnings.push(`Composed prompt exceeds recommended length (${composedPrompt.length} chars, max ~${maxLength})`);
  }
  
  // Collect all variables used
  const allVariablesUsed: string[] = [];
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = Array.from(composedPrompt.matchAll(variableRegex));
  matches.forEach(m => {
    if (!allVariablesUsed.includes(m[1])) {
      allVariablesUsed.push(m[1]);
    }
  });
  
  return {
    composed_prompt: composedPrompt,
    helper_id: helper.helper_id,
    helper_name: helper.name,
    variables_used: allVariablesUsed,
    warnings,
  };
}

/**
 * Build variable context from request
 */
export function buildVariableContext(
  request: ComposePromptRequest,
  additionalContext?: Record<string, any>
): VariableContext {
  const context: VariableContext = {};
  
  // Add variables from request
  if (request.variables) {
    if (request.variables.course) {
      context.course = request.variables.course as any;
    }
    if (request.variables.org) {
      context.org = request.variables.org as any;
    }
    if (request.variables.cover) {
      context.cover = request.variables.cover as any;
    }
    if (request.variables.selection) {
      context.selection = request.variables.selection as any;
    }
    if (request.variables.doc) {
      context.doc = request.variables.doc as any;
    }
    if (request.variables.user) {
      context.user = request.variables.user as any;
    }
    if (request.variables.action) {
      context.action = request.variables.action as any;
    }
  }
  
  // Add RTE-specific context
  if (request.context === 'rte') {
    if (request.user_content) {
      context.selection = { text: request.user_content };
    }
    if (request.user_instruction) {
      context.user = { instruction: request.user_instruction };
    }
    if (request.action_type) {
      context.action = { name: request.action_type };
    }
  }
  
  // Add cover image context
  if (request.context === 'cover_image' && request.user_content) {
    context.cover = { subject: request.user_content };
  }
  
  // Merge additional context
  if (additionalContext) {
    Object.assign(context, additionalContext);
  }
  
  return context;
}


