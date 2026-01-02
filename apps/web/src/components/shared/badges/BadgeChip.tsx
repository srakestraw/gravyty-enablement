/**
 * Badge Chip Component
 * 
 * Shared component for rendering badges consistently across the app.
 * Uses the badge icon registry to resolve and render icons.
 */

import { Chip, Box, useTheme, alpha } from '@mui/material';
import { getBadgeIcon } from './badgeIconRegistry';
import type { Badge } from '@gravyty/domain';

export interface BadgeChipProps {
  badge: Pick<Badge, 'name' | 'icon_key' | 'icon_color' | 'color'>;
  variant?: 'chip' | 'card' | 'list';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

/**
 * Convert hex color to rgba or return theme color
 */
function getColorWithOpacity(color: string | null | undefined, opacity: number, theme: any): string {
  if (!color) return alpha(theme.palette.primary.main, opacity);
  // If it's already a theme color key, use it directly
  if (color.startsWith('#')) {
    return alpha(color, opacity);
  }
  // Otherwise assume it's a valid color and use alpha
  return alpha(color, opacity);
}

export function BadgeChip({ badge, variant = 'chip', size = 'medium', showLabel = true }: BadgeChipProps) {
  const theme = useTheme();
  const IconComponent = getBadgeIcon(badge.icon_key);
  
  // Determine icon color: use icon_color if set, otherwise badge.color, otherwise theme primary
  const iconColor = badge.icon_color || badge.color || theme.palette.primary.main;
  
  // Determine chip color: use badge.color if set, otherwise theme primary
  const chipColor = badge.color || theme.palette.primary.main;

  if (variant === 'chip') {
    return (
      <Chip
        icon={<IconComponent sx={{ color: iconColor }} />}
        label={showLabel ? badge.name : ''}
        size={size}
        sx={{
          backgroundColor: getColorWithOpacity(chipColor, 0.2, theme),
          color: chipColor,
          border: `1px solid ${getColorWithOpacity(chipColor, 0.4, theme)}`,
          '& .MuiChip-icon': {
            color: iconColor,
          },
        }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: 1,
          backgroundColor: getColorWithOpacity(chipColor, 0.1, theme),
          border: `1px solid ${getColorWithOpacity(chipColor, 0.3, theme)}`,
        }}
      >
        <IconComponent sx={{ color: iconColor, fontSize: size === 'small' ? 20 : 24 }} />
        {showLabel && (
          <Box component="span" sx={{ color: chipColor, fontSize: size === 'small' ? '0.875rem' : '1rem' }}>
            {badge.name}
          </Box>
        )}
      </Box>
    );
  }

  // list variant
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <IconComponent sx={{ color: iconColor, fontSize: size === 'small' ? 18 : 20 }} />
      {showLabel && (
        <Box component="span" sx={{ fontSize: size === 'small' ? '0.875rem' : '0.9375rem' }}>
          {badge.name}
        </Box>
      )}
    </Box>
  );
}

