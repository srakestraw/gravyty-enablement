/**
 * Content Hub - Asset Detail Page
 * 
 * View asset details, versions, and metadata
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Breadcrumbs,
  Link,
  Paper,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  PushPin as PushPinIcon,
  PushPinOutlined as PushPinOutlinedIcon,
  DownloadOutlined,
  ShareOutlined,
  EditOutlined,
} from '@mui/icons-material';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import {
  getAsset, 
  listVersions, 
  getDownloadUrl,
  publishVersion,
  scheduleVersion,
  expireVersion,
  archiveVersion,
  updateAsset,
  flagOutdated,
  requestUpdate,
  createSubscription,
  deleteSubscription,
  checkSubscription,
  pinAsset,
  unpinAsset,
  createAssetVersion,
  restoreAssetVersion,
  getAssetVersion,
  deleteAsset,
} from '../../api/contentHubClient';
import {
  syncAssetFromDrive,
  getAssetSyncStatus,
  type AssetSyncStatus,
} from '../../api/googleDriveClient';
import { isErrorResponse } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { isApproverOrHigher } from '../../lib/roles';
import type { Asset, AssetVersion } from '@gravyty/domain';
import { AssetComments } from '../../components/content-hub/AssetComments';
import { ContentActivityTab } from '../../components/content-hub/activity/ContentActivityTab';
import { AssetAttachmentsList } from '../../components/content-hub/AssetAttachmentsList';
import { VersionSelector } from '../../components/content-hub/VersionSelector';
import { VersionHistoryPanel } from '../../components/content-hub/VersionHistoryPanel';
import { canEditAsset, canDeleteAsset } from '../../lib/content-hub/assetHelpers';
import { downloadAllAttachments } from '../../api/contentHubClient';
import { useMetadataOptions } from '../../hooks/useMetadataOptions';
import type { Attachment } from '@gravyty/domain';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  FormHelperText,
} from '@mui/material';

export function AssetDetailPage() {
  const { assetId, id: legacyId } = useParams<{ assetId?: string; id?: string }>();
  const id = assetId || legacyId; // Support both :assetId and :id params
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(
    searchParams.get('versionId') || undefined
  );
  const [selectedVersionData, setSelectedVersionData] = useState<AssetVersion | null>(null);
  const [selectedVersionAttachments, setSelectedVersionAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<AssetVersion | null>(null);
  const [changeLog, setChangeLog] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [highlightAsNew, setHighlightAsNew] = useState(false);
  const [hasAttachmentsChanged, setHasAttachmentsChanged] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [syncStatus, setSyncStatus] = useState<AssetSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const isApprover = isApproverOrHigher(user?.role);
  const isDriveAsset = asset?.source_type === 'GOOGLE_DRIVE';
  const canEdit = asset ? canEditAsset(user, asset) : false;
  const canDelete = asset ? canDeleteAsset(user, asset) : false;
  
  // Metadata options for displaying chips
  const { options: productSuiteOptions } = useMetadataOptions('product_suite');
  const { options: productOptions } = useMetadataOptions('product');
  const { options: audienceOptions } = useMetadataOptions('audience');
  const { options: topicTagOptions } = useMetadataOptions('topic_tag');
  
  // Resolve metadata node IDs to labels
  const getMetadataChips = () => {
    if (!asset) return [];
    const chips: Array<{ label: string; color?: 'default' | 'primary' | 'secondary' }> = [];
    
    // Resolve product suite IDs
    if (asset.metadata_node_ids && asset.metadata_node_ids.length > 0) {
      const productSuiteIds = asset.metadata_node_ids.filter(id => 
        productSuiteOptions.some(opt => opt.option_id === id)
      );
      productSuiteIds.forEach(id => {
        const option = productSuiteOptions.find(opt => opt.option_id === id);
        if (option) chips.push({ label: option.label, color: 'primary' });
      });
      
      // Resolve product IDs
      const productIds = asset.metadata_node_ids.filter(id => 
        productOptions.some(opt => opt.option_id === id)
      );
      productIds.forEach(id => {
        const option = productOptions.find(opt => opt.option_id === id);
        if (option) chips.push({ label: option.label, color: 'secondary' });
      });
      
      // Resolve topic tag IDs
      const topicTagIds = asset.metadata_node_ids.filter(id => 
        topicTagOptions.some(opt => opt.option_id === id)
      );
      topicTagIds.forEach(id => {
        const option = topicTagOptions.find(opt => opt.option_id === id);
        if (option) chips.push({ label: option.label });
      });
    }
    
    // Resolve audience IDs (separate field)
    if (asset.audience_ids && asset.audience_ids.length > 0) {
      asset.audience_ids.forEach(id => {
        const option = audienceOptions.find(opt => opt.option_id === id);
        if (option) chips.push({ label: option.label, color: 'default' });
      });
    }
    
    return chips;
  };
  
  useEffect(() => {
    if (id) {
      loadAsset();
      loadVersions();
      checkSubscriptionStatus();
      if (asset?.source_type === 'GOOGLE_DRIVE') {
        loadSyncStatus();
      }
    }
  }, [id]);
  
  useEffect(() => {
    if (asset?.source_type === 'GOOGLE_DRIVE' && id) {
      loadSyncStatus();
    }
  }, [asset?.source_type, id]);
  
  const loadSyncStatus = async () => {
    if (!id) return;
    
    try {
      const response = await getAssetSyncStatus(id);
      if (!isErrorResponse(response)) {
        setSyncStatus(response.data);
      }
    } catch (err) {
      console.error('Failed to load sync status:', err);
    }
  };
  
  const handleSync = async () => {
    if (!id) return;
    
    try {
      setSyncing(true);
      const response = await syncAssetFromDrive(id);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      await loadSyncStatus();
      await loadVersions();
      alert('Asset synced successfully. A new draft version has been created.');
    } catch (err) {
      alert('Failed to sync asset');
    } finally {
      setSyncing(false);
    }
  };
  
  const checkSubscriptionStatus = async () => {
    if (!id || !user?.userId) return;
    
    try {
      setCheckingSubscription(true);
      const response = await checkSubscription('asset', id);
      
      if (!isErrorResponse(response)) {
        setIsSubscribed(response.data.subscribed);
        setSubscriptionId(response.data.subscription?.subscription_id || null);
      }
    } catch (err) {
      console.error('Failed to check subscription status:', err);
    } finally {
      setCheckingSubscription(false);
    }
  };
  
  const handleSubscribe = async () => {
    if (!id) return;
    
    try {
      const response = await createSubscription({
        target_type: 'asset',
        target_id: id,
      });
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      setIsSubscribed(true);
      setSubscriptionId(response.data.subscription_id);
    } catch (err) {
      alert('Failed to subscribe');
    }
  };
  
  const handleUnsubscribe = async () => {
    if (!subscriptionId) return;
    
    try {
      const response = await deleteSubscription(subscriptionId);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      setIsSubscribed(false);
      setSubscriptionId(null);
    } catch (err) {
      alert('Failed to unsubscribe');
    }
  };
  
  const loadAsset = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAsset(id);
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      setAsset(response.data.asset);
      
      // Load full versions list
      await loadVersions();
      
      // Set default selected version if not set
      if (!selectedVersionId) {
        const defaultVersionId = response.data.currentVersionId || response.data.currentVersion?.id;
        if (defaultVersionId) {
          setSelectedVersionId(defaultVersionId);
          setSearchParams({ versionId: defaultVersionId });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    } finally {
      setLoading(false);
    }
  };
  
  // Load selected version data
  useEffect(() => {
    const loadSelectedVersion = async () => {
      if (!id) return;
      
      const versionIdToLoad = selectedVersionId || asset?.current_published_version_id;
      if (!versionIdToLoad) {
        // No version to load
        return;
      }
      
      try {
        const versionResponse = await getAssetVersion(id, versionIdToLoad);
        if (!isErrorResponse(versionResponse)) {
          setSelectedVersionData(versionResponse.data.version);
          setSelectedVersionAttachments(versionResponse.data.attachments);
        }
      } catch (err) {
        console.error('Failed to load version:', err);
        // Fallback to version from versions list
        const fallbackVersion = versions.find(v => v.version_id === versionIdToLoad);
        if (fallbackVersion) {
          setSelectedVersionData(fallbackVersion);
          setSelectedVersionAttachments([]);
        }
      }
    };
    
    if (versions.length > 0 && asset) {
      loadSelectedVersion();
    }
  }, [id, selectedVersionId, versions.length, asset?.current_published_version_id]);
  
  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId);
    setSearchParams({ versionId });
  };
  
  const handleCreateNewVersion = async () => {
    if (!id || !asset?.current_published_version_id) return;
    
    try {
      const response = await createAssetVersion(id, {
        fromVersionId: asset.current_published_version_id,
      });
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      // Navigate to edit page with new version
      navigate(`/enablement/content-hub/assets/${id}/edit?versionId=${response.data.version.version_id}`);
    } catch (err) {
      alert('Failed to create new version');
    }
  };
  
  const handleCreateFromVersion = async (fromVersionId: string) => {
    if (!id) return;
    
    try {
      const response = await createAssetVersion(id, {
        fromVersionId,
      });
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      // Navigate to edit page with new version
      navigate(`/enablement/content-hub/assets/${id}/edit?versionId=${response.data.version.version_id}`);
    } catch (err) {
      alert('Failed to create new version');
    }
  };
  
  const handleRestoreVersion = async (versionId: string) => {
    if (!id) return;
    
    try {
      const response = await restoreAssetVersion(id, versionId);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      await loadAsset();
      await loadVersions();
      setSelectedVersionId(versionId);
      setSearchParams({ versionId });
    } catch (err) {
      alert('Failed to restore version');
    }
  };
  
  const handleDownloadVersion = async (versionId: string) => {
    await handleDownload(versionId);
  };
  
  const loadVersions = async () => {
    if (!id) return;
    
    try {
      const response = await listVersions(id);
      
      if (!isErrorResponse(response)) {
        setVersions(response.data.versions);
      } else {
        console.error('Failed to load versions:', response.error);
      }
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };
  
  const handleDownload = async (versionId: string) => {
    try {
      const response = await getDownloadUrl(versionId);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      // Open download URL in new window
      window.open(response.data.download_url, '_blank');
    } catch (err) {
      alert('Failed to generate download URL');
    }
  };
  
  // Helper function to compare attachments between two versions
  const checkAttachmentsChanged = async (versionId: string, currentPublishedVersionId?: string): Promise<boolean> => {
    if (!id) {
      // Can't compare without asset ID - default to false (conservative)
      return false;
    }
    
    if (!currentPublishedVersionId) {
      // No current published version, so this is a new publish - default to true
      return true;
    }
    
    try {
      // Get attachments for both versions
      const [currentAttachments, newAttachments] = await Promise.all([
        getAssetVersion(id, currentPublishedVersionId),
        getAssetVersion(id, versionId),
      ]);
      
      if (isErrorResponse(currentAttachments) || isErrorResponse(newAttachments)) {
        // If we can't compare, default to false (conservative)
        return false;
      }
      
      const current = currentAttachments.data.attachments;
      const newer = newAttachments.data.attachments;
      
      // Compare by type, storage_key/url/drive_file_id, and name
      if (current.length !== newer.length) {
        return true;
      }
      
      // Create comparison keys for each attachment
      const getAttachmentKey = (att: Attachment) => {
        if (att.type === 'FILE_UPLOAD') {
          return `${att.type}:${att.storage_key}:${att.file_name || ''}`;
        } else if (att.type === 'LINK') {
          return `${att.type}:${att.url || ''}`;
        } else if (att.type === 'DRIVE') {
          return `${att.type}:${att.drive_file_id || ''}`;
        }
        return `${att.type}:${att.attachment_id}`;
      };
      
      const currentKeys = new Set(current.map(getAttachmentKey));
      const newerKeys = new Set(newer.map(getAttachmentKey));
      
      // Check if sets are different
      if (currentKeys.size !== newerKeys.size) {
        return true;
      }
      
      for (const key of currentKeys) {
        if (!newerKeys.has(key)) {
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error('Error comparing attachments:', err);
      // If comparison fails, default to false (conservative)
      return false;
    }
  };
  
  const handleOpenPublishDialog = async (version: AssetVersion) => {
    setSelectedVersion(version);
    setChangeLog('');
    
    // Check if attachments changed to set default checkbox value
    // TODO: If diff detection is not available, default UNCHECKED
    const changed = await checkAttachmentsChanged(version.version_id, asset?.current_published_version_id);
    setHasAttachmentsChanged(changed);
    setHighlightAsNew(changed); // Default checked if attachments changed
    
    setPublishDialogOpen(true);
  };
  
  const handlePublish = async () => {
    if (!selectedVersion || !changeLog.trim()) return;
    
    try {
      const response = await publishVersion(selectedVersion.version_id, {
        change_log: changeLog,
        highlight_as_new: highlightAsNew,
        notify_followers: highlightAsNew, // Notify followers if highlighting as new
      });
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      setPublishDialogOpen(false);
      setChangeLog('');
      setHighlightAsNew(false);
      setHasAttachmentsChanged(false);
      setSelectedVersion(null);
      await loadAsset();
      await loadVersions();
    } catch (err) {
      alert('Failed to publish version');
    }
  };
  
  const handleSchedule = async () => {
    if (!selectedVersion || !publishAt) return;
    
    try {
      const response = await scheduleVersion(selectedVersion.version_id, {
        publish_at: publishAt,
      });
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      setScheduleDialogOpen(false);
      setPublishAt('');
      setSelectedVersion(null);
      await loadVersions();
    } catch (err) {
      alert('Failed to schedule version');
    }
  };
  
  const handleExpire = async (version: AssetVersion) => {
    if (!confirm(`Are you sure you want to expire version ${version.version_number}?`)) {
      return;
    }
    
    try {
      const response = await expireVersion(version.version_id);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      await loadAsset();
      await loadVersions();
    } catch (err) {
      alert('Failed to expire version');
    }
  };
  
  const handleArchive = async (version: AssetVersion) => {
    if (!confirm(`Are you sure you want to archive version ${version.version_number}?`)) {
      return;
    }
    
    try {
      const response = await archiveVersion(version.version_id);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      await loadVersions();
    } catch (err) {
      alert('Failed to archive version');
    }
  };
  
  if (loading) {
    return (
      <PlaceholderPage title="Asset Details" description="Loading asset...">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </PlaceholderPage>
    );
  }
  
  if (error || !asset) {
    return (
      <PlaceholderPage title="Asset Details" description="Asset not found">
        <Alert severity="error">{error || 'Asset not found'}</Alert>
        <Button onClick={() => navigate('/enablement/resources')} sx={{ mt: 2 }}>
          Back to Library
        </Button>
      </PlaceholderPage>
    );
  }
  
  const latestPublishedVersion = versions.find(v => v.status === 'published' && v.version_id === asset.current_published_version_id);
  
  const handleActionsMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setActionsMenuAnchor(e.currentTarget);
  };
  
  const handleActionsMenuClose = () => {
    setActionsMenuAnchor(null);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmationText('');
  };

  const handleDelete = async () => {
    if (!id || !asset) return;
    
    const isDeleteConfirmed = deleteConfirmationText === asset.title;
    if (!isDeleteConfirmed) return;
    
    try {
      setDeleting(true);
      const response = await deleteAsset(id);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        setDeleting(false);
        return;
      }
      
      // Navigate to library page after successful delete
      navigate('/enablement/content-hub/library');
    } catch (err) {
      alert('Failed to delete asset');
      setDeleting(false);
    }
  };

  const isDeleteConfirmed = deleteConfirmationText === asset?.title;
  
  return (
    <PlaceholderPage title={asset.title} description={asset.description}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/enablement/content-hub/overview')}
          sx={{ cursor: 'pointer' }}
        >
          Content Hub
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/enablement/content-hub/library')}
          sx={{ cursor: 'pointer' }}
        >
          Library
        </Link>
        <Typography variant="body2" color="text.primary">
          {asset.title}
        </Typography>
      </Breadcrumbs>
      
      {/* Header with Actions */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h4" sx={{ flex: 1 }}>
                {asset.title}
              </Typography>
              {versions.length > 0 && (
                <VersionSelector
                  versions={versions}
                  currentVersionId={asset.current_published_version_id}
                  selectedVersionId={selectedVersionId}
                  onVersionChange={handleVersionChange}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
              <Chip label={asset.asset_type} size="small" />
              {latestPublishedVersion && (
                <Chip label={`v${latestPublishedVersion.version_number}`} size="small" />
              )}
              {getMetadataChips().map((chip, index) => (
                <Chip
                  key={index}
                  label={chip.label}
                  size="small"
                  color={chip.color}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlined />}
              onClick={async () => {
                if (latestPublishedVersion) {
                  await handleDownload(latestPublishedVersion.version_id);
                } else {
                  try {
                    await downloadAllAttachments(asset.asset_id);
                  } catch (err) {
                    alert('Failed to download attachments');
                  }
                }
              }}
            >
              Download
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareOutlined />}
              disabled
              title="Coming soon"
            >
              Share
            </Button>
            {!checkingSubscription && (
              <Button
                variant="outlined"
                onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              >
                {isSubscribed ? 'Unfollow' : 'Follow'}
              </Button>
            )}
            {isApprover && (
              <IconButton
                onClick={async () => {
                  try {
                    if (asset.pinned) {
                      const response = await unpinAsset(asset.asset_id);
                      if (!isErrorResponse(response)) {
                        await loadAsset();
                      } else {
                        alert(response.error.message);
                      }
                    } else {
                      const response = await pinAsset(asset.asset_id);
                      if (!isErrorResponse(response)) {
                        await loadAsset();
                      } else {
                        alert(response.error.message);
                      }
                    }
                  } catch (err) {
                    alert('Failed to update pin status');
                  }
                }}
                title={asset.pinned ? 'Unpin' : 'Pin'}
              >
                {asset.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
              </IconButton>
            )}
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<EditOutlined />}
                onClick={async () => {
                  // Check if selected version is draft
                  const versionToEdit = selectedVersionData || versions.find(v => v.version_id === selectedVersionId);
                  
                  if (versionToEdit && versionToEdit.status === 'draft') {
                    // Edit existing draft
                    navigate(`/enablement/content-hub/assets/${asset.asset_id}/edit?versionId=${versionToEdit.version_id}`);
                  } else {
                    // Create new draft from current version
                    await handleCreateNewVersion();
                  }
                }}
              >
                {selectedVersionData?.status === 'draft' ? 'Edit' : 'New Version'}
              </Button>
            )}
            {canEdit && versions.length > 0 && (
              <Button
                variant="outlined"
                onClick={handleCreateNewVersion}
              >
                New Version
              </Button>
            )}
            <IconButton onClick={handleActionsMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={actionsMenuAnchor}
              open={Boolean(actionsMenuAnchor)}
              onClose={handleActionsMenuClose}
            >
              <MenuItem onClick={() => setFlagDialogOpen(true)}>Flag as Outdated</MenuItem>
              <MenuItem onClick={() => setRequestDialogOpen(true)}>Request Update</MenuItem>
              {canDelete && (
                <>
                  <Divider />
                  <MenuItem 
                    onClick={() => {
                      handleActionsMenuClose();
                      setDeleteDialogOpen(true);
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    Delete
                  </MenuItem>
                </>
              )}
            </Menu>
          </Stack>
        </Box>
      </Box>
      
      {/* Two-Column Layout */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Left Column: Summary, Description, Attachments */}
        <Box>
          {asset.short_description && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {asset.short_description}
              </Typography>
            </Paper>
          )}
          
          {(asset.description_rich_text || asset.body_rich_text || asset.description) && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              {asset.description_rich_text || asset.body_rich_text ? (
                <Box
                  dangerouslySetInnerHTML={{
                    __html: asset.description_rich_text || asset.body_rich_text || '',
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {asset.description}
                </Typography>
              )}
            </Paper>
          )}
          
          <Paper sx={{ p: 2 }}>
            <AssetAttachmentsList
              asset={asset}
              version={selectedVersionData || latestPublishedVersion}
              onDownloadAll={async () => {
                if (selectedVersionData) {
                  await handleDownloadVersion(selectedVersionData.version_id);
                } else {
                  try {
                    await downloadAllAttachments(asset.asset_id);
                  } catch (err) {
                    alert('Failed to download attachments');
                  }
                }
              }}
            />
          </Paper>
          
          {/* Version History Panel */}
          {versions.length > 0 && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Version History
              </Typography>
              <VersionHistoryPanel
                versions={versions}
                currentVersionId={asset.current_published_version_id}
                selectedVersionId={selectedVersionId}
                onViewVersion={handleVersionChange}
                onDownloadVersion={handleDownloadVersion}
                onRestoreVersion={handleRestoreVersion}
                onCreateFromVersion={handleCreateFromVersion}
                canRestore={isApprover || canEdit}
                canCreateVersion={canEdit}
              />
            </Paper>
          )}
        </Box>
        
        {/* Right Column: Publish Info, Owner, Keywords, Activity */}
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Publish Info
            </Typography>
            {selectedVersionData ? (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong>{' '}
                  <Chip 
                    label={selectedVersionData.status.charAt(0).toUpperCase() + selectedVersionData.status.slice(1)} 
                    size="small" 
                    color={
                      selectedVersionData.status === 'published' ? 'success' :
                      selectedVersionData.status === 'draft' ? 'info' :
                      selectedVersionData.status === 'deprecated' ? 'warning' : 'default'
                    }
                  />
                </Typography>
                {selectedVersionData.published_at && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Published:</strong>{' '}
                    {new Date(selectedVersionData.published_at).toLocaleDateString()}
                  </Typography>
                )}
                {selectedVersionData.expire_at && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Expires:</strong>{' '}
                    {new Date(selectedVersionData.expire_at).toLocaleDateString()}
                  </Typography>
                )}
                {selectedVersionData.change_log && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Change Notes:</strong>{' '}
                    {selectedVersionData.change_log}
                  </Typography>
                )}
              </Box>
            ) : latestPublishedVersion ? (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong>{' '}
                  <Chip label="Published" size="small" color="success" />
                </Typography>
                {latestPublishedVersion.published_at && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Published:</strong>{' '}
                    {new Date(latestPublishedVersion.published_at).toLocaleDateString()}
                  </Typography>
                )}
                {latestPublishedVersion.expire_at && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Expires:</strong>{' '}
                    {new Date(latestPublishedVersion.expire_at).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Not published
              </Typography>
            )}
          </Paper>
          
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Owner
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {/* TODO: Display owner name when available */}
              {asset.owner_id}
            </Typography>
          </Paper>
          
          {asset.keywords && asset.keywords.length > 0 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Keywords
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {asset.keywords.map((keyword, index) => (
                  <Chip key={index} label={keyword} size="small" />
                ))}
              </Box>
            </Paper>
          )}
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {/* TODO: Display views/downloads when available */}
              Views: -
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Downloads: -
            </Typography>
          </Paper>
        </Box>
      </Box>
      
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mt: 3 }}>
        <Tab label="Versions" />
        <Tab label="Comments" />
        <Tab label="Activity" />
      </Tabs>
      
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Version History</Typography>
            {versions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No versions yet
              </Typography>
            ) : (
              <List>
                {versions.map((version) => (
                  <ListItem key={version.version_id}>
                    <ListItemText
                      primary={`Version ${version.version_number} - ${version.status}`}
                      secondary={
                        <>
                          {version.created_at}
                          {version.status === 'expired' && (
                            <Chip label="Expired" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                          {version.status === 'scheduled' && version.publish_at && (
                            <Chip label={`Scheduled: ${new Date(version.publish_at).toLocaleString()}`} size="small" sx={{ ml: 1 }} />
                          )}
                        </>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {version.status === 'published' && (
                        <Button
                          size="small"
                          onClick={() => handleDownload(version.version_id)}
                        >
                          Download
                        </Button>
                      )}
                      {isApprover && version.status === 'draft' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleOpenPublishDialog(version)}
                          >
                            Publish Now
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedVersion(version);
                              setScheduleDialogOpen(true);
                            }}
                          >
                            Schedule
                          </Button>
                        </>
                      )}
                      {isApprover && version.status === 'scheduled' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleOpenPublishDialog(version)}
                        >
                          Publish Now
                        </Button>
                      )}
                      {isApprover && version.status === 'published' && (
                        <Button
                          size="small"
                          color="warning"
                          onClick={() => handleExpire(version)}
                        >
                          Expire
                        </Button>
                      )}
                      {isApprover && (version.status === 'published' || version.status === 'deprecated' || version.status === 'expired') && (
                        <Button
                          size="small"
                          onClick={() => handleArchive(version)}
                        >
                          Archive
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
        
        {tabValue === 1 && (
          <Box>
            <AssetComments asset={asset} />
          </Box>
        )}
        
        {tabValue === 2 && (
          <Box>
            <ContentActivityTab assetId={asset.asset_id} assetOwnerId={asset.owner_id} />
          </Box>
        )}
      </Box>
      
      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onClose={() => setFlagDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Flag as Outdated</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason (optional)"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Why is this asset outdated?"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFlagDialogOpen(false);
            setFlagReason('');
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              try {
                const response = await flagOutdated(asset.asset_id, {
                  reason: flagReason || undefined,
                });
                
                if (isErrorResponse(response)) {
                  alert(response.error.message);
                  return;
                }
                
                setFlagDialogOpen(false);
                setFlagReason('');
                alert('Asset flagged as outdated');
              } catch (err) {
                alert('Failed to flag asset');
              }
            }}
          >
            Flag
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Request Update Dialog */}
      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Update</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message (optional)"
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="What update would you like to see?"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRequestDialogOpen(false);
            setRequestMessage('');
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                const response = await requestUpdate(asset.asset_id, {
                  message: requestMessage || undefined,
                });
                
                if (isErrorResponse(response)) {
                  alert(response.error.message);
                  return;
                }
                
                setRequestDialogOpen(false);
                setRequestMessage('');
                alert('Update request submitted');
              } catch (err) {
                alert('Failed to submit request');
              }
            }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete Content Asset</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete "{asset?.title || 'this asset'}"? This action cannot be undone.
          </Typography>
          <Typography sx={{ mb: 2 }}>
            To confirm, please type the asset title: <strong>{asset?.title || ''}</strong>
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Asset Title"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            error={deleteConfirmationText !== '' && !isDeleteConfirmed}
            helperText={
              deleteConfirmationText !== '' && !isDeleteConfirmed
                ? 'Title does not match'
                : ''
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isDeleteConfirmed && !deleting) {
                handleDelete();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={!isDeleteConfirmed || deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Publish Version {selectedVersion?.version_number}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Change Log"
            value={changeLog}
            onChange={(e) => setChangeLog(e.target.value)}
            placeholder="Describe what changed in this version..."
            required
            sx={{ mt: 2 }}
          />
          {hasAttachmentsChanged && !highlightAsNew && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Attachments changed. Corrections are usually text-only. Consider publishing as a new update.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPublishDialogOpen(false);
            setChangeLog('');
            setHighlightAsNew(false);
            setHasAttachmentsChanged(false);
          }}>Cancel</Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={highlightAsNew}
                  onChange={(e) => setHighlightAsNew(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  Publish as a new update (shows in New and notifies followers)
                </Typography>
              }
            />
            <Button
              variant="contained"
              onClick={handlePublish}
              disabled={!changeLog.trim()}
            >
              Publish v{selectedVersion?.version_number}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Version {selectedVersion?.version_number}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="datetime-local"
            label="Publish At"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={!publishAt}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </PlaceholderPage>
  );
}

