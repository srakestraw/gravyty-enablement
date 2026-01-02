/**
 * Content Hub - Create Content Page
 * 
 * Full-page form for creating content with taxonomy classification, source selection,
 * and role-based publish behavior.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  CardActionArea,
  Autocomplete,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  FormHelperText,
  Stack,
  Checkbox,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  CloudQueue as CloudQueueIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { createAsset, initUpload, completeUpload, publishVersion, scheduleVersion, setExpireAt } from '../../api/contentHubClient';
import { isErrorResponse, usersApi, type AdminUser } from '../../lib/apiClient';
import type { AssetType, AssetSourceType } from '@gravyty/domain';
import { useAuth } from '../../contexts/AuthContext';
import { isContributorOrHigher, isApproverOrHigher, isAdmin } from '../../lib/roles';
import { MetadataSelect } from '../../components/metadata/MetadataSelect';
import { MetadataMultiSelect } from '../../components/metadata/MetadataMultiSelect';
import { MetadataSection } from '../../components/metadata';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { CoverImageSelector } from '../../components/shared/CoverImageSelector';
import { useMetadataOptions } from '../../hooks/useMetadataOptions';
import { metadataApi } from '../../api/metadataClient';
import type { MetadataOption, MediaRef } from '@gravyty/domain';

type PublishAction = 'draft' | 'publish-now' | 'schedule';

interface FieldErrors {
  title?: string;
  assetType?: string;
  productSuite?: string;
  product?: string;
  file?: string;
  linkUrl?: string;
  publishAt?: string;
  expireAt?: string;
  changeLog?: string;
}

export function CreateAssetPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Content Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<MediaRef | null>(null);
  const [assetType, setAssetType] = useState<AssetType>('doc');
  const [productSuiteIds, setProductSuiteIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [ownerUser, setOwnerUser] = useState<AdminUser | null>(null);
  
  // Source & Availability
  const [sourceType, setSourceType] = useState<AssetSourceType>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [publishAction, setPublishAction] = useState<PublishAction>('draft');
  const [publishAt, setPublishAt] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [changeLog, setChangeLog] = useState('');
  const [showExpiration, setShowExpiration] = useState(false);
  
  // User search for owner picker
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userOptions, setUserOptions] = useState<AdminUser[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  
  // Metadata options for summary
  const { options: productSuiteOptions } = useMetadataOptions('product_suite');
  const { options: productOptions } = useMetadataOptions('product');
  const [productSuiteLabel, setProductSuiteLabel] = useState<string>('');
  const [productLabel, setProductLabel] = useState<string>('');
  
  // Update taxonomy labels for summary
  useEffect(() => {
    if (productSuiteIds.length > 0) {
      const labels = productSuiteIds
        .map(id => productSuiteOptions.find(opt => opt.option_id === id)?.label)
        .filter((label): label is string => !!label);
      setProductSuiteLabel(labels.length > 0 ? labels.join(', ') : 'Selected');
    } else {
      setProductSuiteLabel('');
    }
  }, [productSuiteIds, productSuiteOptions]);
  
  useEffect(() => {
    if (productIds.length > 0) {
      const labels = productIds
        .map(id => productOptions.find(opt => opt.option_id === id)?.label)
        .filter((label): label is string => !!label);
      setProductLabel(labels.length > 0 ? labels.join(', ') : 'Selected');
    } else {
      setProductLabel('');
    }
  }, [productIds, productOptions]);
  
  // Role-based permissions
  const canPublish = isApproverOrHigher(user?.role);
  const canSetOwner = isAdmin(user?.role) || isApproverOrHigher(user?.role);
  const isContributor = isContributorOrHigher(user?.role) && !canPublish;
  
  // Initialize form defaults
  useEffect(() => {
    // Set default owner to current user
    if (user?.userId) {
      setOwnerId(user.userId);
      // Set owner user display (for AdminUser type compatibility)
      if (user.email) {
        setOwnerUser({
          username: user.userId,
          email: user.email,
          name: user.name || user.email,
          enabled: true,
          role: (user.role || 'Viewer') as 'Viewer' | 'Contributor' | 'Approver' | 'Admin',
          user_status: 'CONFIRMED',
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          groups: [],
        });
      }
    }
    // Set default publish action based on role
    setPublishAction(canPublish ? 'publish-now' : 'draft');
  }, [user?.userId, user?.email, user?.name, user?.role, canPublish]);
  
  // Search users for owner picker
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setUserOptions([]);
      return;
    }
    
    setUserSearchLoading(true);
    try {
      const response = await usersApi.listUsers({ query, limit: 10 });
      if (!isErrorResponse(response)) {
        setUserOptions(response.data.items);
      }
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setUserSearchLoading(false);
    }
  }, []);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);
  
  // Inline validation
  const validateField = (field: keyof FieldErrors): string | undefined => {
    switch (field) {
      case 'title':
        if (!title.trim()) return 'Title is required';
        return undefined;
      case 'assetType':
        if (!assetType) return 'Content type is required';
        return undefined;
      case 'productSuite':
        if ((publishAction === 'publish-now' || publishAction === 'schedule') && productSuiteIds.length === 0) {
          return 'Product Suite is required to publish';
        }
        return undefined;
      case 'product':
        if ((publishAction === 'publish-now' || publishAction === 'schedule') && productIds.length === 0) {
          return 'Product is required to publish';
        }
        return undefined;
      case 'file':
        if (sourceType === 'UPLOAD' && !file) {
          return 'File is required for upload';
        }
        return undefined;
      case 'linkUrl':
        if (sourceType === 'LINK') {
          if (!linkUrl.trim()) return 'URL is required';
          if (!linkUrl.startsWith('https://')) return 'Must be a valid https link';
        }
        return undefined;
      case 'publishAt':
        if (publishAction === 'schedule') {
          if (!publishAt) return 'Publish date/time is required';
          const publishDate = new Date(publishAt);
          if (publishDate <= new Date()) return 'Publish date/time must be in the future';
        }
        return undefined;
      case 'expireAt':
        if (expireAt) {
          const expireDate = new Date(expireAt);
          const referenceDate = publishAction === 'schedule' ? new Date(publishAt) : new Date();
          if (expireDate <= referenceDate) {
            return 'Expiration must be after publish date/time';
          }
        }
        return undefined;
      case 'changeLog':
        if ((publishAction === 'publish-now' || publishAction === 'schedule') && !changeLog.trim()) {
          return 'What changed is required when publishing';
        }
        return undefined;
      default:
        return undefined;
    }
  };
  
  // Validate all fields
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const fields: (keyof FieldErrors)[] = ['title', 'assetType', 'productSuite', 'product', 'file', 'linkUrl', 'publishAt', 'expireAt', 'changeLog'];
    
    fields.forEach(field => {
      const error = validateField(field);
      if (error) errors[field] = error;
    });
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Check if form is valid for current action
  const isFormValid = (): boolean => {
    // Basic required fields
    if (!title.trim() || !assetType) return false;
    
    // Source-specific validation
    if (sourceType === 'UPLOAD' && !file) return false;
    if (sourceType === 'LINK' && (!linkUrl.trim() || !linkUrl.startsWith('https://'))) return false;
    
    // Publish/schedule validation
    if (publishAction === 'publish-now' || publishAction === 'schedule') {
      if (productSuiteIds.length === 0 || productIds.length === 0) return false;
      if (!changeLog.trim()) return false;
      if (publishAction === 'schedule' && (!publishAt || new Date(publishAt) <= new Date())) return false;
    }
    
    // Expiration validation
    if (expireAt) {
      const expireDate = new Date(expireAt);
      const referenceDate = publishAction === 'schedule' ? new Date(publishAt) : new Date();
      if (expireDate <= referenceDate) return false;
    }
    
    return true;
  };
  
  // Update field error on change - validate immediately
  const handleFieldChange = (field: keyof FieldErrors) => {
    // Clear error for this field, then validate
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      // Re-validate this field
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
      }
      return newErrors;
    });
  };
  
  const handleCancel = () => {
    navigate('/enablement/resources/library');
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      handleFieldChange('file');
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      handleFieldChange('file');
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const getDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Collect taxonomy node IDs
      const taxonomyNodeIds: string[] = [];
      taxonomyNodeIds.push(...productSuiteIds);
      taxonomyNodeIds.push(...productIds);
      taxonomyNodeIds.push(...tagIds);
      
      // Prepare source_ref based on source type
      let sourceRef: Record<string, unknown> | undefined;
      if (sourceType === 'LINK') {
        sourceRef = { url: linkUrl.trim() };
      } else if (sourceType === 'GOOGLE_DRIVE') {
        setError('Google Drive integration is not yet available');
        return;
      }
      
      // Create content
      const createAssetResponse = await createAsset({
        title: title.trim(),
        description: description.trim() || undefined,
        cover_image: coverImage || undefined,
        asset_type: assetType,
        owner_id: ownerId,
        taxonomy_node_ids: taxonomyNodeIds,
        audience_ids: audienceIds,
        source_type: sourceType,
        source_ref: sourceRef,
      });
      
      if (isErrorResponse(createAssetResponse)) {
        setError(createAssetResponse.error.message);
        return;
      }
      
      const createdAsset = createAssetResponse.data.asset;
      let versionId: string | undefined;
      
      // Create version based on source type
      if (sourceType === 'UPLOAD' && file) {
        // Initialize upload
        const initResponse = await initUpload(createdAsset.asset_id, {
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
        });
        
        if (isErrorResponse(initResponse)) {
          setError(initResponse.error.message);
          return;
        }
        
        versionId = initResponse.data.version_id;
        
        // Upload file to S3
        const uploadResponse = await fetch(initResponse.data.upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to S3');
        }
        
        // Complete upload
        const completeResponse = await completeUpload(createdAsset.asset_id, {
          version_id: versionId,
          storage_key: initResponse.data.s3_key,
          size_bytes: file.size,
        });
        
        if (isErrorResponse(completeResponse)) {
          setError(completeResponse.error.message);
          return;
        }
        
        versionId = completeResponse.data.version.version_id;
      } else if (sourceType === 'LINK') {
        // For LINK sources, version is created automatically by backend
        if (createAssetResponse.data.version) {
          versionId = createAssetResponse.data.version.version_id;
        }
      }
      
      // Handle publish action
      if (versionId && publishAction === 'publish-now') {
        const publishResponse = await publishVersion(versionId, {
          change_log: changeLog.trim(),
        });
        
        if (isErrorResponse(publishResponse)) {
          setError(publishResponse.error.message);
          return;
        }
      } else if (versionId && publishAction === 'schedule') {
        const scheduleResponse = await scheduleVersion(versionId, {
          publish_at: new Date(publishAt).toISOString(),
        });
        
        if (isErrorResponse(scheduleResponse)) {
          setError(scheduleResponse.error.message);
          return;
        }
        
        // Set expiration date if provided
        if (expireAt && versionId) {
          const expireResponse = await setExpireAt(versionId, new Date(expireAt).toISOString());
          if (isErrorResponse(expireResponse)) {
            setError(expireResponse.error.message);
            return;
          }
        }
      } else if (versionId && expireAt) {
        // Set expiration date for draft versions too
        const expireResponse = await setExpireAt(versionId, new Date(expireAt).toISOString());
        if (isErrorResponse(expireResponse)) {
          setError(expireResponse.error.message);
          return;
        }
      }
      
      // Success! Navigate back to library
      navigate('/enablement/resources/library');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content');
    } finally {
      setLoading(false);
    }
  };
  
  // Get summary for review
  const getSummary = () => {
    return {
      source: sourceType === 'UPLOAD' ? (file ? file.name : 'No file selected') : sourceType === 'LINK' ? (linkUrl ? getDomainFromUrl(linkUrl) : 'No URL') : 'Google Drive',
      visibility: publishAction === 'draft' ? 'Draft' : publishAction === 'schedule' ? (publishAt ? `Scheduled: ${new Date(publishAt).toLocaleString()}` : 'Scheduled: Not set') : 'Publish now',
      expiration: expireAt ? new Date(expireAt).toLocaleString() : 'None',
      productSuite: productSuiteLabel || (productSuiteIds.length > 0 ? 'Selected' : 'Not set'),
      product: productLabel || (productIds.length > 0 ? 'Selected' : 'Not set'),
    };
  };
  
  const summary = getSummary();
  
  // Get disabled state reason for footer
  const getDisabledReason = (): string | null => {
    if (loading) return null;
    if (!title.trim()) return 'Enter a title';
    if (!assetType) return 'Select a content type';
    if (sourceType === 'UPLOAD' && !file) return 'Select a file to upload';
    if (sourceType === 'LINK' && (!linkUrl.trim() || !linkUrl.startsWith('https://'))) return 'Enter a valid https URL';
    if ((publishAction === 'publish-now' || publishAction === 'schedule')) {
      if (productSuiteIds.length === 0 || productIds.length === 0) return 'Select Product suite(s) and Product(s) to publish';
      if (!changeLog.trim()) return 'Describe what changed';
      if (publishAction === 'schedule' && (!publishAt || new Date(publishAt) <= new Date())) return 'Set a future publish date/time';
    }
    if (expireAt && new Date(expireAt) <= (publishAction === 'schedule' ? new Date(publishAt) : new Date())) {
      return 'Expiration must be after publish date/time';
    }
    return null;
  };
  
  return (
    <PlaceholderPage title="Create content" description="Create a new enablement item">
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate('/enablement/resources')}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Content Hub
          </Link>
          <Typography color="text.primary">Create content</Typography>
        </Breadcrumbs>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Two-column grid layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(420px, 1fr) minmax(420px, 1fr)',
          },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
          mb: 4,
        }}
      >
        {/* Left Column: Content Details */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Content details
            </Typography>
            
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleFieldChange('title');
              }}
              onBlur={() => handleFieldChange('title')}
              required
              error={!!fieldErrors.title}
              helperText={fieldErrors.title}
              sx={{ mb: 1.5 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }} required error={!!fieldErrors.assetType}>
              <InputLabel>Content type</InputLabel>
              <Select
                value={assetType}
                onChange={(e) => {
                  setAssetType(e.target.value as AssetType);
                  handleFieldChange('assetType');
                }}
                onBlur={() => handleFieldChange('assetType')}
                label="Content type"
              >
                <MenuItem value="deck">Deck</MenuItem>
                <MenuItem value="doc">Document</MenuItem>
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="logo">Logo</MenuItem>
                <MenuItem value="worksheet">Worksheet</MenuItem>
                <MenuItem value="link">Link</MenuItem>
              </Select>
              {fieldErrors.assetType && <FormHelperText>{fieldErrors.assetType}</FormHelperText>}
            </FormControl>
            
            {/* Classification Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
                Classification
              </Typography>
              <MetadataSection
                entityType="content"
                entityId="new"
                productIds={productIds}
                onProductIdsChange={(ids) => {
                  setProductIds(ids);
                  handleFieldChange('product');
                }}
                productSuiteIds={productSuiteIds}
                onProductSuiteIdsChange={(ids) => {
                  setProductSuiteIds(ids);
                  handleFieldChange('productSuite');
                }}
                topicTagIds={tagIds}
                onTopicTagIdsChange={setTagIds}
                audienceIds={audienceIds}
                onAudienceIdsChange={setAudienceIds}
                shouldShowError={(fieldKey) => {
                  if (fieldKey === 'product_ids') return !!fieldErrors.product;
                  if (fieldKey === 'product_suite_ids') return !!fieldErrors.productSuite;
                  return false;
                }}
              />
              {(fieldErrors.productSuite || fieldErrors.product) && (
                <FormHelperText error sx={{ mb: 1, mt: 1 }}>
                  {fieldErrors.productSuite || fieldErrors.product}
                </FormHelperText>
              )}
              {(publishAction === 'publish-now' || publishAction === 'schedule') && !fieldErrors.productSuite && !fieldErrors.product && (
                <FormHelperText sx={{ mb: 1, mt: 1 }}>
                  Product suite and product are required to publish.
                </FormHelperText>
              )}
            </Box>
            
            {/* More Details Collapsible */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  More details
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                >
                  {showMoreDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={showMoreDetails}>
                <Box>
                  <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={3}
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ mb: 2 }}>
                    <CoverImageSelector
                      entityType="asset"
                      coverImage={coverImage}
                      entityTitle={title}
                      entityDescription={description}
                      onCoverImageSelected={(mediaRef) => setCoverImage(mediaRef)}
                      onCoverImageRemoved={() => setCoverImage(null)}
                    />
                  </Box>
                  
                  {canSetOwner && (
                    <Autocomplete
                      options={userOptions}
                      getOptionLabel={(option) => `${option.name || option.email}${option.email ? ` (${option.email})` : ''}`}
                      loading={userSearchLoading}
                      value={ownerUser}
                      onChange={(_, newValue) => {
                        setOwnerUser(newValue);
                        setOwnerId(newValue?.username);
                      }}
                      onInputChange={(_, newInputValue) => {
                        setUserSearchQuery(newInputValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Owner"
                          placeholder="Search by name or email..."
                          helperText="Default: current user"
                        />
                      )}
                      sx={{ mb: 2 }}
                    />
                  )}
                  {!canSetOwner && user && (
                    <TextField
                      fullWidth
                      label="Owner"
                      value={user.name || user.email || 'You'}
                      disabled
                      helperText="You are the owner"
                      sx={{ mb: 2 }}
                    />
                  )}
                </Box>
              </Collapse>
            </Box>
          </Paper>
        </Box>
        
        {/* Right Column: Add content */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Add content
            </Typography>
            
            <Stack spacing={3}>
              {/* Source Section */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
                  Source
                </Typography>
                
                {/* Source Type Cards */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                  <Card
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      border: sourceType === 'UPLOAD' ? 2 : 1,
                      borderColor: sourceType === 'UPLOAD' ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onClick={() => {
                      setSourceType('UPLOAD');
                      setFile(null);
                      setLinkUrl('');
                    }}
                  >
                    <CardActionArea sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        py: 2, 
                        px: 1,
                        gap: 0.75,
                        minHeight: 72,
                      }}>
                        <CloudUploadIcon sx={{ 
                          fontSize: 24, 
                          color: sourceType === 'UPLOAD' ? 'primary.main' : 'text.secondary',
                          display: 'block',
                        }} />
                        <Typography 
                          variant="caption" 
                          fontWeight={sourceType === 'UPLOAD' ? 'bold' : 'normal'}
                          sx={{ textAlign: 'center', lineHeight: 1.2 }}
                        >
                          Upload
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                  
                  <Card
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      border: sourceType === 'LINK' ? 2 : 1,
                      borderColor: sourceType === 'LINK' ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onClick={() => {
                      setSourceType('LINK');
                      setFile(null);
                      setLinkUrl('');
                    }}
                  >
                    <CardActionArea sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        py: 2, 
                        px: 1,
                        gap: 0.75,
                        minHeight: 72,
                      }}>
                        <LinkIcon sx={{ 
                          fontSize: 24, 
                          color: sourceType === 'LINK' ? 'primary.main' : 'text.secondary',
                          display: 'block',
                        }} />
                        <Typography 
                          variant="caption" 
                          fontWeight={sourceType === 'LINK' ? 'bold' : 'normal'}
                          sx={{ textAlign: 'center', lineHeight: 1.2 }}
                        >
                          Link
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                  
                  <Card
                    sx={{
                      flex: 1,
                      minWidth: 100,
                      border: 1,
                      borderColor: 'divider',
                      opacity: 0.5,
                      cursor: 'not-allowed',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CardContent sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      py: 2, 
                      px: 1,
                      gap: 0.75,
                      minHeight: 72,
                    }}>
                      <Tooltip title="Enable in Admin -> Integrations">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                          <CloudQueueIcon sx={{ 
                            fontSize: 24, 
                            color: 'text.secondary',
                            display: 'block',
                          }} />
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ textAlign: 'center', lineHeight: 1.2 }}
                          >
                            Drive
                          </Typography>
                        </Box>
                      </Tooltip>
                    </CardContent>
                  </Card>
                </Box>
                
                {/* Source-specific fields */}
                {sourceType === 'UPLOAD' && (
                  <Box>
                    {!file ? (
                      <Box
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        sx={{
                          border: `2px dashed ${dragActive ? 'primary.main' : 'divider'}`,
                          borderRadius: 1,
                          p: 3,
                          textAlign: 'center',
                          bgcolor: dragActive ? 'action.hover' : 'background.paper',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          minHeight: '140px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <CloudUploadIcon sx={{ fontSize: 36, mb: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" gutterBottom>
                          Drag and drop or click to upload
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          All file types
                        </Typography>
                        <input
                          ref={fileInputRef}
                          type="file"
                          hidden
                          onChange={handleFileSelect}
                        />
                      </Box>
                    ) : (
                      <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight="medium" noWrap>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.size)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button
                              size="small"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Replace
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setFile(null);
                                handleFieldChange('file');
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    )}
                    {fieldErrors.file && (
                      <FormHelperText error sx={{ mt: 0.5 }}>
                        {fieldErrors.file}
                      </FormHelperText>
                    )}
                  </Box>
                )}
                
                {sourceType === 'LINK' && (
                  <TextField
                    fullWidth
                    label="URL"
                    value={linkUrl}
                    onChange={(e) => {
                      setLinkUrl(e.target.value);
                      handleFieldChange('linkUrl');
                    }}
                    onBlur={() => handleFieldChange('linkUrl')}
                    placeholder="https://..."
                    required
                    error={!!fieldErrors.linkUrl}
                    helperText={fieldErrors.linkUrl || 'Must be a valid https link'}
                    size="small"
                  />
                )}
                
                {sourceType === 'GOOGLE_DRIVE' && (
                  <Alert severity="info" sx={{ py: 1 }}>
                    Google Drive integration is coming soon. Please use Upload or Link for now.
                  </Alert>
                )}
              </Box>
              
              {/* Availability Section */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
                  Availability
                </Typography>
                
                {isContributor ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Status: <strong>Draft</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Contributors cannot publish. Your content will be saved as a draft.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {/* Visibility */}
                    <Box>
                      <ToggleButtonGroup
                        value={publishAction === 'draft' ? 'publish-now' : publishAction}
                        exclusive
                        onChange={(_, value) => {
                          if (value !== null) {
                            setPublishAction(value as PublishAction);
                            if (value === 'publish-now') {
                              setPublishAt('');
                            }
                          }
                        }}
                        fullWidth
                        size="small"
                      >
                        <ToggleButton value="publish-now">Publish now</ToggleButton>
                        <ToggleButton value="schedule">Schedule</ToggleButton>
                      </ToggleButtonGroup>
                      
                      {publishAction === 'schedule' && (
                        <TextField
                          fullWidth
                          type="datetime-local"
                          label="Publish at"
                          value={publishAt}
                          onChange={(e) => {
                            setPublishAt(e.target.value);
                            handleFieldChange('publishAt');
                          }}
                          onBlur={() => handleFieldChange('publishAt')}
                          InputLabelProps={{ shrink: true }}
                          required
                          error={!!fieldErrors.publishAt}
                          helperText={fieldErrors.publishAt || 'Times shown in ET'}
                          size="small"
                          sx={{ mt: 1.5 }}
                        />
                      )}
                    </Box>
                    
                    {/* Expiration */}
                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showExpiration}
                            onChange={(e) => {
                              setShowExpiration(e.target.checked);
                              if (!e.target.checked) {
                                setExpireAt('');
                              }
                            }}
                            size="small"
                          />
                        }
                        label="Set expiration (optional)"
                      />
                      {showExpiration && (
                        <TextField
                          fullWidth
                          type="datetime-local"
                          label="Expiration date/time"
                          value={expireAt}
                          onChange={(e) => {
                            setExpireAt(e.target.value);
                            handleFieldChange('expireAt');
                          }}
                          onBlur={() => handleFieldChange('expireAt')}
                          InputLabelProps={{ shrink: true }}
                          error={!!fieldErrors.expireAt}
                          helperText={fieldErrors.expireAt || 'Leave empty for no expiration'}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                    
                    {/* What Changed */}
                    {(publishAction === 'publish-now' || publishAction === 'schedule') && (
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="What changed"
                        value={changeLog}
                        onChange={(e) => {
                          setChangeLog(e.target.value);
                          handleFieldChange('changeLog');
                        }}
                        onBlur={() => handleFieldChange('changeLog')}
                        placeholder="Describe what changed in this version..."
                        required
                        error={!!fieldErrors.changeLog}
                        helperText={fieldErrors.changeLog || 'Included in notifications'}
                        size="small"
                      />
                    )}
                  </Stack>
                )}
              </Box>
              
              {/* Inline Summary */}
              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.8 }}>
                  <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>Source:</Box> {summary.source}<br />
                  <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>Visibility:</Box> {summary.visibility}<br />
                  <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>Expiration:</Box> {summary.expiration}<br />
                  <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary' }}>Product:</Box> {summary.productSuite && summary.product ? `${summary.productSuite} - ${summary.product}` : 'Not set'}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
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
          mt: 4,
          zIndex: 1000,
          // Account for Container padding to span full width
          mx: { xs: -2, sm: -3 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Button onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                publishAction === 'draft' ? 'Create draft' : publishAction === 'schedule' ? 'Schedule' : 'Publish'
              )}
            </Button>
            {!loading && !isFormValid() && getDisabledReason() && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', maxWidth: 300 }}>
                {getDisabledReason()}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </PlaceholderPage>
  );
}
