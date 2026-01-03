/**
 * Prompt Variables Service
 * 
 * Handles variable extraction, validation, and substitution for prompt helpers
 */

import type {
  PromptHelper,
  PromptHelperAppliesTo,
} from '@gravyty/domain';

/**
 * Variable Registry
 * 
 * Maps variable names to extraction functions
 */
export interface VariableContext {
  // Course variables
  course?: {
    title?: string;
    audience?: string;
    level?: string;
    duration?: string;
    objectives?: string;
    topics?: string;
    category?: string;
  };
  
  // Organization variables
  org?: {
    name?: string;
  };
  
  // RTE variables
  selection?: {
    text?: string;
  };
  doc?: {
    context?: string;
  };
  user?: {
    instruction?: string;
  };
  action?: {
    name?: string;
  };
  
  // Cover image variables
  cover?: {
    subject?: string;
    metaphor?: string;
    must_include?: string;
    avoid?: string;
  };
}

/**
 * Extract variable value from context
 */
export function extractVariable(
  variableName: string,
  context: VariableContext
): string | undefined {
  // Parse variable name (e.g., "course.title" -> ["course", "title"])
  const parts = variableName.split('.');
  if (parts.length === 0) return undefined;
  
  let value: any = context;
  
  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[part];
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  return undefined;
}

/**
 * Validate that helper only uses allowed variables
 */
export function validateAllowedVariables(
  helper: PromptHelper,
  text: string
): { valid: boolean; invalidVariables: string[] } {
  if (helper.allowed_variables.length === 0) {
    // No restrictions
    return { valid: true, invalidVariables: [] };
  }
  
  // Extract all variables from text (format: {{variable.name}})
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = Array.from(text.matchAll(variableRegex));
  const usedVariables = matches.map(m => m[1]);
  
  const invalidVariables = usedVariables.filter(
    v => !helper.allowed_variables.includes(v)
  );
  
  return {
    valid: invalidVariables.length === 0,
    invalidVariables,
  };
}

/**
 * Substitute variables in text
 */
export function substituteVariables(
  text: string,
  context: VariableContext,
  allowedVariables?: string[]
): { result: string; variablesUsed: string[]; missingVariables: string[] } {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variablesUsed: string[] = [];
  const missingVariables: string[] = [];
  
  const result = text.replace(variableRegex, (match, variableName) => {
    // Check if variable is allowed
    if (allowedVariables && !allowedVariables.includes(variableName)) {
      missingVariables.push(variableName);
      return match; // Keep original if not allowed
    }
    
    const value = extractVariable(variableName, context);
    
    if (value === undefined) {
      missingVariables.push(variableName);
      return match; // Keep original if not found
    }
    
    if (!variablesUsed.includes(variableName)) {
      variablesUsed.push(variableName);
    }
    
    return value;
  });
  
  return { result, variablesUsed, missingVariables };
}

/**
 * Get available variables for a context
 */
export function getAvailableVariables(
  appliesTo: PromptHelperAppliesTo[]
): string[] {
  const variables: string[] = [];
  
  // Common variables
  variables.push('org.name');
  
  // Course variables (available for all contexts)
  variables.push(
    'course.title',
    'course.audience',
    'course.level',
    'course.duration',
    'course.objectives',
    'course.topics',
    'course.category'
  );
  
  // Context-specific variables
  if (appliesTo.includes('cover_image')) {
    variables.push(
      'cover.subject',
      'cover.metaphor',
      'cover.must_include',
      'cover.avoid'
    );
  }
  
  if (appliesTo.includes('rte')) {
    variables.push(
      'selection.text',
      'doc.context',
      'user.instruction',
      'action.name'
    );
  }
  
  return variables;
}


