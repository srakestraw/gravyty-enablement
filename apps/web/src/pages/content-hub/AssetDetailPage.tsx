/**
 * Content Hub - Asset Detail Page
 * 
 * View asset details, versions, and metadata
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<AssetVersion | null>(null);
  const [changeLog, setChangeLog] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [syncStatus, setSyncStatus] = useState<AssetSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  const isApprover = isApproverOrHigher(user?.role);
  const isDriveAsset = asset?.source_type === 'GOOGLE_DRIVE';
  
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    } finally {
      setLoading(false);
    }
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
  
  const handlePublish = async () => {
    if (!selectedVersion || !changeLog.trim()) return;
    
    try {
      const response = await publishVersion(selectedVersion.version_id, {
        change_log: changeLog,
      });
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      setPublishDialogOpen(false);
      setChangeLog('');
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
  
  return (
    <PlaceholderPage title={asset.title} description={asset.description}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label={asset.asset_type} />
          {asset.pinned && <Chip label="Pinned" color="primary" />}
          {latestPublishedVersion && (
            <Chip label={`v${latestPublishedVersion.version_number}`} />
          )}
          {isApprover && (
            <Button
              size="small"
              variant={asset.pinned ? 'outlined' : 'contained'}
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
            >
              {asset.pinned ? 'Unpin' : 'Pin'}
            </Button>
          )}
          {!checkingSubscription && (
            <Button
              size="small"
              variant={isSubscribed ? 'outlined' : 'contained'}
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            >
              {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            </Button>
          )}
        </Box>
        
        {latestPublishedVersion && (
          <Button
            variant="contained"
            onClick={() => handleDownload(latestPublishedVersion.version_id)}
            sx={{ mb: 2 }}
          >
            Download Latest Version
          </Button>
        )}
      </Box>
      
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
        <Tab label="Overview" />
        <Tab label="Versions" />
        <Tab label="Comments" />
      </Tabs>
      
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Metadata</Typography>
            <Typography variant="body2"><strong>Owner:</strong> {asset.owner_id}</Typography>
            <Typography variant="body2"><strong>Source:</strong> {asset.source_type}</Typography>
            {isDriveAsset && syncStatus && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Sync Status:</strong>{' '}
                  <Chip
                    label={syncStatus.last_sync_status}
                    size="small"
                    color={
                      syncStatus.last_sync_status === 'synced'
                        ? 'success'
                        : syncStatus.last_sync_status === 'error' || syncStatus.last_sync_status === 'source_unavailable'
                        ? 'error'
                        : 'default'
                    }
                  />
                </Typography>
                {syncStatus.last_synced_at && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Last synced: {new Date(syncStatus.last_synced_at).toLocaleString()}
                  </Typography>
                )}
                {syncStatus.last_sync_error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {syncStatus.last_sync_error}
                  </Alert>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSync}
                  disabled={syncing}
                  sx={{ mt: 1 }}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </Box>
            )}
            {asset.metadata_node_ids.length > 0 && (
              <Typography variant="body2">
                <strong>Metadata:</strong> {asset.metadata_node_ids.join(', ')}
              </Typography>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setFlagDialogOpen(true)}
              >
                Flag as Outdated
              </Button>
              <Button
                variant="outlined"
                onClick={() => setRequestDialogOpen(true)}
              >
                Request Update
              </Button>
            </Box>
          </Box>
        )}
        
        {tabValue === 1 && (
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
                            onClick={() => {
                              setSelectedVersion(version);
                              setPublishDialogOpen(true);
                            }}
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
                          onClick={() => {
                            setSelectedVersion(version);
                            setPublishDialogOpen(true);
                          }}
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
        
        {tabValue === 2 && (
          <Box>
            <AssetComments asset={asset} />
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePublish}
            disabled={!changeLog.trim()}
          >
            Publish
          </Button>
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

