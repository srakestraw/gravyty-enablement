/**
 * Badge Icon Registry
 * 
 * Central registry for badge icons using MUI icons.
 * Only icons in this registry can be used for badges to ensure consistency
 * and avoid dynamic imports.
 */

import {
  // Achievement & Recognition
  EmojiEventsOutlined,
  WorkspacePremiumOutlined,
  VerifiedOutlined,
  StarOutlined,
  MilitaryTechOutlined,
  
  // Completion & Success
  CheckCircleOutlined,
  TaskAltOutlined,
  FactCheckOutlined,
  DoneAllOutlined,
  
  // Learning & Education
  SchoolOutlined,
  MenuBookOutlined,
  AutoStoriesOutlined,
  PsychologyOutlined,
  
  // Skills & Assessment
  QuizOutlined,
  AssignmentOutlined,
  AssessmentOutlined,
  BuildOutlined,
  
  // General
  LocalOfferOutlined,
  LabelOutlined,
  BookmarkOutlined,
  FlagOutlined,
  
  // Social & Communication
  ThumbUpOutlined,
  FavoriteOutlined,
  ShareOutlined,
  
  // Time & Progress
  ScheduleOutlined,
  TrendingUpOutlined,
  SpeedOutlined,
  
  // Other
  DiamondOutlined,
  WhatshotOutlined,
  BoltOutlined,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';

/**
 * Fallback icon used when no icon is selected or iconKey is invalid
 */
export const FALLBACK_BADGE_ICON = EmojiEventsOutlined;

/**
 * Icon key type - union of all allowed icon keys
 */
export type BadgeIconKey =
  | 'EmojiEventsOutlined'
  | 'WorkspacePremiumOutlined'
  | 'VerifiedOutlined'
  | 'StarOutlined'
  | 'MilitaryTechOutlined'
  | 'CheckCircleOutlined'
  | 'TaskAltOutlined'
  | 'FactCheckOutlined'
  | 'DoneAllOutlined'
  | 'SchoolOutlined'
  | 'MenuBookOutlined'
  | 'AutoStoriesOutlined'
  | 'PsychologyOutlined'
  | 'QuizOutlined'
  | 'AssignmentOutlined'
  | 'AssessmentOutlined'
  | 'BuildOutlined'
  | 'LocalOfferOutlined'
  | 'LabelOutlined'
  | 'BookmarkOutlined'
  | 'FlagOutlined'
  | 'ThumbUpOutlined'
  | 'FavoriteOutlined'
  | 'ShareOutlined'
  | 'ScheduleOutlined'
  | 'TrendingUpOutlined'
  | 'SpeedOutlined'
  | 'DiamondOutlined'
  | 'WhatshotOutlined'
  | 'BoltOutlined';

/**
 * Array of all allowed icon keys (for validation and iteration)
 */
export const BADGE_ICON_KEYS: BadgeIconKey[] = [
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
];

/**
 * Map of icon keys to icon components
 */
export const badgeIconMap: Record<BadgeIconKey, SvgIconComponent> = {
  EmojiEventsOutlined,
  WorkspacePremiumOutlined,
  VerifiedOutlined,
  StarOutlined,
  MilitaryTechOutlined,
  CheckCircleOutlined,
  TaskAltOutlined,
  FactCheckOutlined,
  DoneAllOutlined,
  SchoolOutlined,
  MenuBookOutlined,
  AutoStoriesOutlined,
  PsychologyOutlined,
  QuizOutlined,
  AssignmentOutlined,
  AssessmentOutlined,
  BuildOutlined,
  LocalOfferOutlined,
  LabelOutlined,
  BookmarkOutlined,
  FlagOutlined,
  ThumbUpOutlined,
  FavoriteOutlined,
  ShareOutlined,
  ScheduleOutlined,
  TrendingUpOutlined,
  SpeedOutlined,
  DiamondOutlined,
  WhatshotOutlined,
  BoltOutlined,
};

/**
 * Friendly labels for icons (for search and display)
 */
export const badgeIconLabels: Record<BadgeIconKey, string> = {
  EmojiEventsOutlined: 'Trophy',
  WorkspacePremiumOutlined: 'Premium Badge',
  VerifiedOutlined: 'Verified',
  StarOutlined: 'Star',
  MilitaryTechOutlined: 'Military Tech',
  CheckCircleOutlined: 'Completed',
  TaskAltOutlined: 'Task Complete',
  FactCheckOutlined: 'Fact Check',
  DoneAllOutlined: 'All Done',
  SchoolOutlined: 'School',
  MenuBookOutlined: 'Book',
  AutoStoriesOutlined: 'Stories',
  PsychologyOutlined: 'Psychology',
  QuizOutlined: 'Quiz',
  AssignmentOutlined: 'Assignment',
  AssessmentOutlined: 'Assessment',
  BuildOutlined: 'Build',
  LocalOfferOutlined: 'Offer',
  LabelOutlined: 'Label',
  BookmarkOutlined: 'Bookmark',
  FlagOutlined: 'Flag',
  ThumbUpOutlined: 'Thumbs Up',
  FavoriteOutlined: 'Favorite',
  ShareOutlined: 'Share',
  ScheduleOutlined: 'Schedule',
  TrendingUpOutlined: 'Trending Up',
  SpeedOutlined: 'Speed',
  DiamondOutlined: 'Diamond',
  WhatshotOutlined: 'Hot',
  BoltOutlined: 'Bolt',
};

/**
 * Get badge icon component by key
 * Returns fallback icon if key is invalid or null
 */
export function getBadgeIcon(iconKey?: string | null): SvgIconComponent {
  if (!iconKey || !(iconKey in badgeIconMap)) {
    return FALLBACK_BADGE_ICON;
  }
  return badgeIconMap[iconKey as BadgeIconKey];
}

/**
 * Check if an icon key is valid
 */
export function isValidBadgeIconKey(iconKey: string | null | undefined): iconKey is BadgeIconKey {
  return iconKey !== null && iconKey !== undefined && iconKey in badgeIconMap;
}

/**
 * Get friendly label for an icon key
 */
export function getBadgeIconLabel(iconKey: string | null | undefined): string {
  if (!iconKey || !isValidBadgeIconKey(iconKey)) {
    return 'Default Badge';
  }
  return badgeIconLabels[iconKey];
}

