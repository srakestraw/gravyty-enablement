/**
 * Badge Icon Keys Validator
 * 
 * Server-side validation for badge icon keys.
 * Must match the client-side registry in badgeIconRegistry.ts
 */

/**
 * Allowed badge icon keys (must match client-side registry)
 */
export const ALLOWED_BADGE_ICON_KEYS = [
  'EmojiEventsOutlined',
  'WorkspacePremiumOutlined',
  'VerifiedOutlined',
  'StarOutlined',
  'MilitaryTechOutlined',
  'CheckCircleOutlined',
  'TaskAltOutlined',
  'FactCheckOutlined',
  'DoneAllOutlined',
  'SchoolOutlined',
  'MenuBookOutlined',
  'AutoStoriesOutlined',
  'PsychologyOutlined',
  'QuizOutlined',
  'AssignmentOutlined',
  'AssessmentOutlined',
  'BuildOutlined',
  'LocalOfferOutlined',
  'LabelOutlined',
  'BookmarkOutlined',
  'FlagOutlined',
  'ThumbUpOutlined',
  'FavoriteOutlined',
  'ShareOutlined',
  'ScheduleOutlined',
  'TrendingUpOutlined',
  'SpeedOutlined',
  'DiamondOutlined',
  'WhatshotOutlined',
  'BoltOutlined',
] as const;

export type AllowedBadgeIconKey = typeof ALLOWED_BADGE_ICON_KEYS[number];

/**
 * Check if an icon key is valid
 */
export function isValidBadgeIconKey(iconKey: string | null | undefined): iconKey is AllowedBadgeIconKey {
  if (!iconKey) return false;
  return ALLOWED_BADGE_ICON_KEYS.includes(iconKey as AllowedBadgeIconKey);
}

/**
 * Validate badge icon configuration
 */
export function validateBadgeIcon(data: {
  icon_type?: string | null;
  icon_key?: string | null;
}): { valid: boolean; error?: string } {
  // If icon_type is provided, it must be 'mui' (Phase 1)
  if (data.icon_type !== undefined && data.icon_type !== null && data.icon_type !== 'mui') {
    return {
      valid: false,
      error: `Invalid icon_type: ${data.icon_type}. Only 'mui' is supported in Phase 1.`,
    };
  }

  // If icon_key is provided, it must be valid
  if (data.icon_key !== undefined && data.icon_key !== null && !isValidBadgeIconKey(data.icon_key)) {
    return {
      valid: false,
      error: `Invalid icon_key: ${data.icon_key}. Must be one of the allowed icon keys.`,
    };
  }

  return { valid: true };
}

