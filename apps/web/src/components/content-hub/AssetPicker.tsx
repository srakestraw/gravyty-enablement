/**
 * Asset Picker Component
 * 
 * Modal dialog for selecting assets from Content Hub to attach to courses
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Chip,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import { Search, CheckCircle } from '@mui/icons-material';
import { listAssets, type ListAssetsParams } from '../../api/contentHubClient';
import { isErrorResponse } from '../../lib/apiClient';
import type { Asset } from '@gravyty/domain';

export interface AssetPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (assetId: string, versionId: string | null, displayLabel?: string) => void;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
}

export function AssetPicker({ open, onClose, onSelect, courseId, moduleId, lessonId }: AssetPickerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [attachmentMode, setAttachmentMode] = useState<'canonical' | 'version'>('canonical');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [displayLabel, setDisplayLabel] = useState('');
  
  useEffect(() => {
    if (open) {
      loadAssets();
    } else {
      // Reset state when dialog closes
      setSelectedAsset(null);
      setSearchQuery('');
      setAttachmentMode('canonical');
      setSelectedVersionId(null);
      setDisplayLabel('');
    }
  }, [open]);
  
  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ListAssetsParams = {
        status: 'published', // Only show published assets
        limit: 50,
      };
      
      const response = await listAssets(params);
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      setAssets(response.data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelect = () => {
    if (!selectedAsset) return;
    
    const versionId = attachmentMode === 'version' ? selectedVersionId : null;
    onSelect(selectedAsset.asset_id, versionId, displayLabel || undefined);
    onClose();
  };
  
  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      asset.title.toLowerCase().includes(query) ||
      asset.description?.toLowerCase().includes(query) ||
      asset.asset_type.toLowerCase().includes(query)
    );
  });
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Asset from Content Hub</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mb: 2 }}
        />
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Asset List */}
            <List sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
              {filteredAssets.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No assets found"
                    secondary={searchQuery ? 'Try a different search term' : 'No published assets available'}
                  />
                </ListItem>
              ) : (
                filteredAssets.map((asset) => (
                  <ListItem
                    key={asset.asset_id}
                    disablePadding
                  >
                    <ListItemButton
                      selected={selectedAsset?.asset_id === asset.asset_id}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <ListItemText
                        primary={asset.title}
                        secondary={
                          <>
                            {asset.description && (
                              <Typography variant="caption" display="block">
                                {asset.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                              <Chip label={asset.asset_type} size="small" />
                              {asset.pinned && <Chip label="Pinned" size="small" color="primary" />}
                            </Box>
                          </>
                        }
                      />
                      {selectedAsset?.asset_id === asset.asset_id && (
                        <CheckCircle color="primary" />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
            
            {/* Attachment Options */}
            {selectedAsset && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Attachment Options
                </Typography>
                
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">Attachment Mode</FormLabel>
                  <RadioGroup
                    value={attachmentMode}
                    onChange={(e) => {
                      setAttachmentMode(e.target.value as 'canonical' | 'version');
                      setSelectedVersionId(null);
                    }}
                  >
                    <FormControlLabel
                      value="canonical"
                      control={<Radio />}
                      label="Canonical (always use latest published version)"
                    />
                    <FormControlLabel
                      value="version"
                      control={<Radio />}
                      label="Pin to specific version"
                    />
                  </RadioGroup>
                </FormControl>
                
                {attachmentMode === 'version' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Version pinning will be implemented in a future update. For now, canonical mode is recommended.
                  </Alert>
                )}
                
                <TextField
                  fullWidth
                  label="Display Label (optional)"
                  placeholder="e.g., 'Sales Deck Q4'"
                  value={displayLabel}
                  onChange={(e) => setDisplayLabel(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSelect}
          disabled={!selectedAsset}
        >
          Add Asset
        </Button>
      </DialogActions>
    </Dialog>
  );
}

