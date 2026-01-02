/**
 * Admin Badge Detail Page
 * 
 * Create/edit badge with improved UX
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { badgeApi } from '../../../api/badgeClient';
import { isErrorResponse } from '../../../lib/apiClient';
import type { Badge, CreateBadge, UpdateBadge } from '@gravyty/domain';
import { BadgeIconPickerButton } from '../../../components/shared/badges/BadgeIconPickerButton';
import { BadgeChip } from '../../../components/shared/badges/BadgeChip';
import { ColorPicker } from '../../../components/shared/ColorPicker';

export function AdminBadgeDetailPage() {
  const { badgeId } = useParams<{ badgeId: string }>();
  const navigate = useNavigate();
  const isNew = badgeId === 'new';

  const [badge, setBadge] = useState<Badge | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconKey, setIconKey] = useState<string | null>(null);
  const [iconColorOverrideEnabled, setIconColorOverrideEnabled] = useState(false);
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!isNew && badgeId) {
      loadBadge();
    }
  }, [badgeId, isNew]);

  // Initialize icon color override state when badge loads
  useEffect(() => {
    if (badge) {
      setIconColorOverrideEnabled(!!badge.icon_color);
    }
  }, [badge]);

  const loadBadge = async () => {
    if (!badgeId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await badgeApi.getBadge(badgeId);
      if (isErrorResponse(response)) {
        setError(response.error.message);
      } else {
        const badgeData = response.data.badge;
        setBadge(badgeData);
        setName(badgeData.name);
        setDescription(badgeData.description || '');
        setIconKey(badgeData.icon_key || null);
        setIconColor(badgeData.icon_color || null);
        setColor(badgeData.color || null);
        setIconColorOverrideEnabled(!!badgeData.icon_color);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badge');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        const createData: CreateBadge = {
          name: name.trim(),
          description: description.trim() || undefined,
          icon_type: 'mui',
          icon_key: iconKey || null,
          icon_color: iconColorOverrideEnabled ? iconColor || null : null,
          color: color || undefined,
        };
        const response = await badgeApi.createBadge(createData);
        if (isErrorResponse(response)) {
          setError(response.error.message);
        } else {
          navigate(`/enablement/admin/badges/${response.data.badge.badge_id}`);
        }
      } else if (badgeId) {
        const updateData: UpdateBadge = {
          name: name.trim(),
          description: description.trim() || null,
          icon_type: 'mui',
          icon_key: iconKey || null,
          icon_color: iconColorOverrideEnabled ? iconColor || null : null,
          color: color || null,
        };
        const response = await badgeApi.updateBadge(badgeId, updateData);
        if (isErrorResponse(response)) {
          setError(response.error.message);
        } else {
          setBadge(response.data.badge);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save badge');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setMoreMenuAnchor(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!badgeId || isNew) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await badgeApi.deleteBadge(badgeId);
      if (isErrorResponse(response)) {
        setError(response.error.message);
      } else {
        navigate('/enablement/admin/badges');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete badge');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleCancel = () => {
    navigate('/enablement/admin/badges');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Determine effective icon color (use override if enabled, otherwise badge color)
  const effectiveIconColor = iconColorOverrideEnabled ? iconColor : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<BackIcon />} onClick={handleCancel}>
              Back
            </Button>
            <Typography variant="h4" component="h1">
              {isNew ? 'Badge' : badge?.name || 'Badge'}
            </Typography>
          </Box>
          {!isNew && (
            <>
              <IconButton
                onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                aria-label="More options"
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={moreMenuAnchor}
                open={Boolean(moreMenuAnchor)}
                onClose={() => setMoreMenuAnchor(null)}
              >
                <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                  <DeleteIcon sx={{ mr: 1 }} />
                  Delete badge…
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3, pt: 0, pb: 10 }}>
        <Grid container spacing={3}>
          {/* Section 1: Basics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Basics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      error={!name.trim() && !!error}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      multiline
                      rows={3}
                      helperText="Shown on the badge tooltip and learner profile."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Section 2: Appearance */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Appearance
                </Typography>
                <Grid container spacing={3}>
                  {/* Icon Column */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Icon
                    </Typography>
                    <BadgeIconPickerButton
                      value={iconKey}
                      onChange={setIconKey}
                      disabled={saving}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Pick an icon shown on the badge.
                    </Typography>
                  </Grid>

                  {/* Color Column */}
                  <Grid item xs={12} md={6}>
                    <ColorPicker
                      value={color}
                      onChange={setColor}
                      label="Color"
                      helperText="Used for badge accent and default icon color."
                      disabled={saving}
                    />
                  </Grid>

                  {/* Advanced: Icon Color Override */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={iconColorOverrideEnabled}
                          onChange={(e) => {
                            setIconColorOverrideEnabled(e.target.checked);
                            if (!e.target.checked) {
                              setIconColor(null);
                            }
                          }}
                          disabled={saving}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Advanced: Override icon color
                        </Typography>
                      }
                    />
                    {iconColorOverrideEnabled && (
                      <Box sx={{ mt: 2, ml: 4 }}>
                        <ColorPicker
                          value={iconColor}
                          onChange={setIconColor}
                          label="Icon Color"
                          helperText="Leave empty to use badge color."
                          disabled={saving}
                        />
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Section 3: Preview */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Preview
                </Typography>
                <Grid container spacing={3}>
                  {/* Chip Preview */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Chip
                    </Typography>
                    <BadgeChip
                      badge={{
                        name: name || 'Badge Name',
                        icon_key: iconKey,
                        icon_color: effectiveIconColor,
                        color: color,
                      }}
                      variant="chip"
                    />
                  </Grid>

                  {/* Earned Chip Preview */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Earned
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BadgeChip
                        badge={{
                          name: name || 'Badge Name',
                          icon_key: iconKey,
                          icon_color: effectiveIconColor,
                          color: color,
                        }}
                        variant="chip"
                      />
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    </Box>
                  </Grid>

                  {/* List Row Preview */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      List Row
                    </Typography>
                    <BadgeChip
                      badge={{
                        name: name || 'Badge Name',
                        icon_key: iconKey,
                        icon_color: effectiveIconColor,
                        color: color,
                      }}
                      variant="list"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Sticky Footer */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete badge?</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
