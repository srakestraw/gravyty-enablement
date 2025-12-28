/**
 * Icon Component
 * 
 * Single source of truth for icons across the app.
 * Uses lucide-react for consistent outline-only icon style.
 * 
 * Rules:
 * - Always use this wrapper, never import icons directly from lucide-react
 * - Default size: 20px
 * - Default strokeWidth: 1.75 (consistent across all icons)
 * - Icons inherit currentColor for theme compatibility
 * - Outline-only style (no filled icons)
 * 
 * Usage:
 * ```tsx
 * <Icon name="home" />
 * <Icon name="search" size={24} />
 * <Icon name="user" color="primary.main" />
 * ```
 */

import { LucideIcon } from 'lucide-react';
import {
  Home,
  BarChart3 as Analytics,
  Search,
  BookOpen,
  Video,
  Settings,
  Bell,
  User,
  LogOut,
  Sparkles,
  Shield,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  Menu,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Plus,
  Minus,
  MoreVertical,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Calendar,
  Clock,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  Phone,
  MapPin,
  Tag,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

/**
 * Icon name type - only icons defined in the iconMap can be used
 */
export type IconName =
  | 'home'
  | 'analytics'
  | 'search'
  | 'book'
  | 'video'
  | 'settings'
  | 'bell'
  | 'user'
  | 'logOut'
  | 'sparkles'
  | 'shield'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'chevronUp'
  | 'x'
  | 'check'
  | 'alertCircle'
  | 'info'
  | 'helpCircle'
  | 'menu'
  | 'filter'
  | 'download'
  | 'upload'
  | 'edit'
  | 'trash'
  | 'plus'
  | 'minus'
  | 'moreVertical'
  | 'externalLink'
  | 'copy'
  | 'eye'
  | 'eyeOff'
  | 'lock'
  | 'unlock'
  | 'calendar'
  | 'clock'
  | 'fileText'
  | 'image'
  | 'link'
  | 'mail'
  | 'phone'
  | 'mapPin'
  | 'tag'
  | 'star'
  | 'heart'
  | 'thumbsUp'
  | 'thumbsDown'
  | 'messageSquare'
  | 'send'
  | 'arrowRight'
  | 'arrowLeft'
  | 'arrowUp'
  | 'arrowDown'
  | 'refresh'
  | 'loader';

/**
 * Icon component props
 */
export interface IconProps {
  /**
   * Icon name - must be one of the defined icon names
   */
  name: IconName;
  /**
   * Icon size in pixels (default: 20)
   */
  size?: number;
  /**
   * Stroke width (default: 1.75, should not vary per icon)
   */
  strokeWidth?: number;
  /**
   * Color - can be a theme palette key (e.g., 'primary.main') or CSS color
   * Defaults to 'currentColor' for theme compatibility
   */
  color?: string;
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Accessibility label
   */
  'aria-label'?: string;
  /**
   * MUI sx prop for additional styling
   */
  sx?: SxProps<Theme>;
}

/**
 * Icon map - maps icon names to Lucide icon components
 * Add new icons here as needed
 */
const iconMap: Record<IconName, LucideIcon> = {
  home: Home,
  analytics: Analytics,
  search: Search,
  book: BookOpen,
  video: Video,
  settings: Settings,
  bell: Bell,
  user: User,
  logOut: LogOut,
  sparkles: Sparkles,
  shield: Shield,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  x: X,
  check: Check,
  alertCircle: AlertCircle,
  info: Info,
  helpCircle: HelpCircle,
  menu: Menu,
  filter: Filter,
  download: Download,
  upload: Upload,
  edit: Edit,
  trash: Trash2,
  plus: Plus,
  minus: Minus,
  moreVertical: MoreVertical,
  externalLink: ExternalLink,
  copy: Copy,
  eye: Eye,
  eyeOff: EyeOff,
  lock: Lock,
  unlock: Unlock,
  calendar: Calendar,
  clock: Clock,
  fileText: FileText,
  image: ImageIcon,
  link: LinkIcon,
  mail: Mail,
  phone: Phone,
  mapPin: MapPin,
  tag: Tag,
  star: Star,
  heart: Heart,
  thumbsUp: ThumbsUp,
  thumbsDown: ThumbsDown,
  messageSquare: MessageSquare,
  send: Send,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  refresh: RefreshCw,
  loader: Loader2,
};

/**
 * Icon Component
 * 
 * Renders a consistent icon from the lucide-react library.
 * All icons use the same stroke width and inherit color from theme.
 */
export function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  color = 'currentColor',
  className,
  'aria-label': ariaLabel,
  sx,
}: IconProps) {
  const theme = useTheme();
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }

  // Resolve color from theme if it's a palette key (e.g., 'primary.main')
  let resolvedColor = color;
  if (color.includes('.')) {
    const [paletteKey, shade] = color.split('.');
    const palette = theme.palette[paletteKey as keyof typeof theme.palette];
    if (palette && typeof palette === 'object' && shade in palette) {
      resolvedColor = (palette as any)[shade] as string;
    }
  }

  const iconElement = (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      color={resolvedColor}
      className={className}
      aria-label={ariaLabel}
      style={{
        verticalAlign: 'middle',
        display: 'inline-block',
      }}
    />
  );

  // Wrap in Box if sx prop is provided for MUI styling
  if (sx) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          ...sx,
        }}
      >
        {iconElement}
      </Box>
    );
  }

  return iconElement;
}

