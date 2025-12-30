/**
 * Publish Readiness Panel
 * 
 * Shows validation status and blocking issues for course/path publishing
 */

import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import type { ValidationError } from '../../../validations/lmsValidations';

export interface PublishReadinessPanelProps {
  entityType: 'course' | 'path';
  errors: ValidationError[];
  warnings?: ValidationError[];
  status?: 'draft' | 'published';
  onNavigateToIssue?: (field: string) => void;
}

export function PublishReadinessPanel({
  entityType,
  errors,
  warnings = [],
  status = 'draft',
  onNavigateToIssue,
}: PublishReadinessPanelProps) {
  const isReady = errors.length === 0;
  const hasWarnings = warnings.length > 0;

  const handleNavigate = (field: string) => {
    if (onNavigateToIssue) {
      onNavigateToIssue(field);
    } else {
      // Fallback: scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">Publish Readiness</Typography>
        {isReady ? (
          <Chip
            icon={<CheckCircleIcon />}
            label="Ready to Publish"
            color="success"
            size="small"
          />
        ) : (
          <Chip
            icon={<ErrorIcon />}
            label={`${errors.length} Issue${errors.length !== 1 ? 's' : ''}`}
            color="error"
            size="small"
          />
        )}
      </Box>

      {status === 'published' && (
        <Box sx={{ mb: 2 }}>
          <Chip label="Published" color="success" size="small" variant="outlined" />
        </Box>
      )}

      {isReady && !hasWarnings && (
        <Typography variant="body2" color="text.secondary">
          All validation checks passed. You can publish this {entityType}.
        </Typography>
      )}

      {errors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Blocking Issues ({errors.length})
          </Typography>
          <List dense>
            {errors.map((error, index) => (
              <ListItem
                key={index}
                sx={{
                  py: 0.5,
                  cursor: onNavigateToIssue ? 'pointer' : 'default',
                }}
                onClick={() => handleNavigate(error.field)}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ErrorIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={error.message}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
                {onNavigateToIssue && (
                  <NavigateNextIcon fontSize="small" color="action" />
                )}
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {hasWarnings && (
        <Box>
          <Typography variant="subtitle2" color="warning.main" gutterBottom>
            Recommendations ({warnings.length})
          </Typography>
          <List dense>
            {warnings.map((warning, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <WarningIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={warning.message}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {!isReady && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            View in Editor
          </Button>
        </Box>
      )}
    </Paper>
  );
}


