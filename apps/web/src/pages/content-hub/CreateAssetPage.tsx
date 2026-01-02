/**
 * Content Hub - Create Content Page
 * 
 * Full-page form for creating content with taxonomy classification, source selection,
 * and role-based publish behavior.
 */

import { useState, useEffect, useCallback } from 'react';
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
  Info as InfoIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { createAsset, initUpload, completeUpload, publishVersion, scheduleVersion, setExpireAt, saveRichTextContent } from '../../api/contentHubClient';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { isErrorResponse, usersApi, type AdminUser } from '../../lib/apiClient';
import type { AssetType, AssetSourceType } from '@gravyty/domain';
import { AttachmentsSection, type Attachment } from '../../components/content-hub/AttachmentsSection';
import { useAuth } from '../../contexts/AuthContext';
import { isContributorOrHigher, isApproverOrHigher, isAdmin } from '../../lib/roles';
import { MetadataSelect } from '../../components/metadata/MetadataSelect';
import { MetadataMultiSelect } from '../../components/metadata/MetadataMultiSelect';
import { MetadataSection } from '../../components/metadata';
import { PlaceholderPage } from '../../components/shared/PlaceholderPage';
import { CoverImageSelector } from '../../components/shared/CoverImageSelector';
import { useMetadataOptions } from '../../hooks/useMetadataOptions';
import { KeywordsInput } from '../../components/content-hub/KeywordsInput';
import { metadataApi } from '../../api/metadataClient';
import type { MetadataOption, MediaRef } from '@gravyty/domain';

type PublishAction = 'draft' | 'publish-now' | 'schedule';

interface FieldErrors {
  title?: string;
  summary?: string;
  body?: string; // For text_content type
  description?: string; // For non-text_content types
  assetType?: string;
  productSuite?: string;
  product?: string;
  attachments?: string;
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
  
  // Content Details
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState(''); // Renamed from shortDescription
  const [richTextContent, setRichTextContent] = useState(''); // RTE content (Body for text_content, Description for others)
  const [coverImage, setCoverImage] = useState<MediaRef | null>(null);
  const [assetType, setAssetType] = useState<AssetType>('doc');
  const [productSuiteIds, setProductSuiteIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [ownerUser, setOwnerUser] = useState<AdminUser | null>(null);
  
  // Attachments (unified) - single source of truth
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Publish settings
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
  
  // Determine if content type is text_content
  const isTextContent = assetType === 'text_content' || assetType === 'document';
  
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
        return undefined;
      case 'product':
        return undefined;
      case 'summary':
        if (!summary.trim()) return 'Summary is required';
        return undefined;
      case 'body':
        if (isTextContent && !richTextContent.trim()) {
          return 'Body is required for Text Content';
        }
        return undefined;
      case 'description':
        // Description is optional for non-text content
        return undefined;
      case 'attachments':
        if (!isTextContent && attachments.length === 0) {
          return 'Add at least one attachment to publish.';
        }
        // Check for uploading/failed attachments when publishing
        if ((publishAction === 'publish-now' || publishAction === 'schedule') && !isTextContent) {
          const uploading = attachments.filter(a => a.status === 'uploading');
          const failed = attachments.filter(a => a.status === 'failed');
          if (uploading.length > 0) {
            return 'Please wait for uploads to complete before publishing.';
          }
          if (failed.length > 0) {
            return 'Please remove failed attachments or retry uploads before publishing.';
          }
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
        // Change log is optional
        return undefined;
      default:
        return undefined;
    }
  };
  
  // Validate all fields
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const fields: (keyof FieldErrors)[] = ['title', 'summary', 'body', 'description', 'assetType', 'productSuite', 'product', 'attachments', 'publishAt', 'expireAt', 'changeLog'];
    
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
    
    // Content-type-specific validation
    if (!summary.trim()) return false;
    if (isTextContent && !richTextContent.trim()) return false; // Body required for text content
    if (!isTextContent) {
      // Attachments required for non-text content
      if (attachments.length === 0) return false;
      // All attachments must be ready (not uploading/failed) when publishing
      if (publishAction === 'publish-now' || publishAction === 'schedule') {
        const notReady = attachments.filter(a => a.status !== 'ready');
        if (notReady.length > 0) return false;
      }
    }
    
    // Publish/schedule validation
    if (publishAction === 'schedule') {
      if (!publishAt || new Date(publishAt) <= new Date()) return false;
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
  
  // Attachment handlers - single source of truth
  const handleAttachmentsChange = (newAttachments: Attachment[]) => {
    setAttachments(newAttachments);
    // Clear attachment error immediately when attachments are added
    if (newAttachments.length > 0) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated.attachments;
        return updated;
      });
    }
    // Trigger validation
    handleFieldChange('attachments');
  };
  
  const handleSetPrimaryAttachment = (attachmentId: string) => {
    const updated = attachments.map(a => ({
      ...a,
      isPrimary: a.id === attachmentId,
    }));
    setAttachments(updated);
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
      
      // Prepare source_ref from attachments (links)
      const linkAttachments = attachments.filter(a => a.type === 'LINK' && a.url);
      let sourceRef: Record<string, unknown> | undefined;
      if (linkAttachments.length > 0) {
        const validUrls = linkAttachments.map(a => a.url!).filter(url => url.startsWith('https://'));
        if (validUrls.length === 1) {
          sourceRef = { url: validUrls[0] };
        } else if (validUrls.length > 1) {
          sourceRef = { urls: validUrls };
        }
      }
      
      // Determine rich text fields based on content type
      const bodyRichText = isTextContent ? richTextContent : undefined;
      const descriptionRichText = !isTextContent ? richTextContent : undefined;
      
      // Create content
      const createAssetResponse = await createAsset({
        title: title.trim(),
        short_description: summary.trim() || undefined,
        description_rich_text: descriptionRichText || undefined,
        body_rich_text: bodyRichText || undefined,
        cover_image: coverImage || undefined,
        asset_type: assetType,
        owner_id: ownerId,
        metadata_node_ids: taxonomyNodeIds,
        audience_ids: audienceIds,
        keywords: keywords.length > 0 ? keywords : undefined,
        source_ref: sourceRef,
      });
      
      if (isErrorResponse(createAssetResponse)) {
        setError(createAssetResponse.error.message);
        return;
      }
      
      const createdAsset = createAssetResponse.data.asset;
      let versionId: string | undefined = createAssetResponse.data.version?.version_id;
      
      // Handle file attachments uploads
      const fileAttachments = attachments.filter(a => a.type === 'FILE_UPLOAD' && a.file);
      if (fileAttachments.length > 0 && !versionId) {
        // Initialize upload for multiple files
        const initResponse = await initUpload(createdAsset.asset_id, {
          files: fileAttachments.map(att => ({
            filename: att.fileName || att.file!.name,
            content_type: att.mimeType || att.file!.type,
            size_bytes: att.fileSize || att.file!.size,
          })),
        });
        
        if (isErrorResponse(initResponse)) {
          setError(initResponse.error.message);
          return;
        }
        
        versionId = initResponse.data.version_id;
        
        // Upload all files to S3
        if (initResponse.data.uploads) {
          // Multiple files
          const uploadPromises = initResponse.data.uploads.map(async (uploadInfo, index) => {
            const attachment = fileAttachments[index];
            const file = attachment.file!;
            const uploadResponse = await fetch(uploadInfo.upload_url, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type,
              },
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload ${file.name} to S3`);
            }
            
            return {
              storage_key: uploadInfo.s3_key,
              filename: file.name,
              size_bytes: file.size,
            };
          });
          
          const uploadedFiles = await Promise.all(uploadPromises);
          
          // Complete upload
          const completeResponse = await completeUpload(createdAsset.asset_id, {
            version_id: versionId,
            files: uploadedFiles,
          });
          
          if (isErrorResponse(completeResponse)) {
            setError(completeResponse.error.message);
            return;
          }
          
          versionId = completeResponse.data.version.version_id;
        } else if (initResponse.data.upload_url) {
          // Single file (backward compatible)
          const attachment = fileAttachments[0];
          const file = attachment.file!;
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
            storage_key: initResponse.data.s3_key!,
            size_bytes: file.size,
          });
          
          if (isErrorResponse(completeResponse)) {
            setError(completeResponse.error.message);
            return;
          }
          
          versionId = completeResponse.data.version.version_id;
        }
      }
      
      // For text_content or if version was created automatically, use it
      if (!versionId && createAssetResponse.data.version) {
        versionId = createAssetResponse.data.version.version_id;
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
  
  // Removed getSummary - no longer needed with new UX
  
  // Get disabled state reason for footer
  const getDisabledReason = (): string | null => {
    if (loading) return null;
    if (!title.trim()) return 'Enter a title';
    if (!assetType) return 'Select a content type';
    if (!summary.trim()) return 'Enter a summary';
    if (isTextContent && !richTextContent.trim()) return 'Enter body content';
    if (!isTextContent && attachments.length === 0) return 'Add at least one attachment to publish.';
    if (!isTextContent && (publishAction === 'publish-now' || publishAction === 'schedule')) {
      const uploading = attachments.filter(a => a.status === 'uploading');
      const failed = attachments.filter(a => a.status === 'failed');
      if (uploading.length > 0) return 'Please wait for uploads to complete.';
      if (failed.length > 0) return 'Please remove failed attachments or retry uploads.';
    }
    if (publishAction === 'schedule' && (!publishAt || new Date(publishAt) <= new Date())) {
      return 'Set a future publish date/time';
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
            
            <FormControl fullWidth sx={{ mb: 1.5 }} required error={!!fieldErrors.assetType}>
              <InputLabel>Content type</InputLabel>
              <Select
                value={assetType}
                onChange={(e) => {
                  const newAssetType = e.target.value as AssetType;
                  setAssetType(newAssetType);
                  handleFieldChange('assetType');
                }}
                onBlur={() => handleFieldChange('assetType')}
                label="Content type"
              >
                <MenuItem value="deck">Deck</MenuItem>
                <MenuItem value="doc">Document</MenuItem>
                <MenuItem value="text_content">Text Content</MenuItem>
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="logo">Logo</MenuItem>
                <MenuItem value="worksheet">Worksheet</MenuItem>
                <MenuItem value="link">Link</MenuItem>
              </Select>
              {fieldErrors.assetType && <FormHelperText>{fieldErrors.assetType}</FormHelperText>}
            </FormControl>
            
            <TextField
              fullWidth
              label="Summary (for cards)"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                handleFieldChange('summary');
              }}
              onBlur={() => handleFieldChange('summary')}
              multiline
              rows={2}
              required
              error={!!fieldErrors.summary}
              helperText={fieldErrors.summary || 'Brief description displayed on asset cards'}
              sx={{ mb: 1.5 }}
            />
            
            {/* Rich Text Editor - conditional label and required */}
            <Box sx={{ mb: 2 }}>
              <RichTextEditor
                value={richTextContent}
                onChange={(value) => {
                  setRichTextContent(value);
                  handleFieldChange(isTextContent ? 'body' : 'description');
                }}
                onBlur={() => handleFieldChange(isTextContent ? 'body' : 'description')}
                label={isTextContent ? 'Body' : 'Description'}
                placeholder={isTextContent ? 'Start writing your content...' : 'Add a description (optional)...'}
                required={isTextContent}
                error={!!(isTextContent ? fieldErrors.body : fieldErrors.description)}
                helperText={isTextContent ? fieldErrors.body : fieldErrors.description}
                rows={12}
                fullWidth
              />
            </Box>
            
            
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
            </Box>
            
            {/* Search & Discovery Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
                Search & Discovery
              </Typography>
              <KeywordsInput
                value={keywords}
                onChange={setKeywords}
                label="Keywords"
                placeholder="Type to add keywords (e.g., ADA, Accessibility, VPAT)..."
                helperText="Add search terms to help users find this content"
                fullWidth
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <CoverImageSelector
                entityType="asset"
                coverImage={coverImage}
                entityTitle={title}
                entityDescription={summary}
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
                value={user.name || user.email}
                disabled
                helperText="You are the owner"
                sx={{ mb: 2 }}
              />
            )}
          </Paper>
        </Box>
        
        {/* Right Column: Attachments + Publish */}
        <Box>
          <Stack spacing={3}>
            {/* Attachments */}
            <Paper sx={{ p: 3 }}>
              <AttachmentsSection
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
                onSetPrimary={handleSetPrimaryAttachment}
                requiresAttachments={!isTextContent}
                canUseDrive={false}
                disabled={loading}
                error={fieldErrors.attachments}
              />
            </Paper>
            
            {/* Publish Settings */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Publish
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
                  
                  {/* What Changed - Optional */}
                  {(publishAction === 'publish-now' || publishAction === 'schedule') && (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="What changed (optional)"
                      value={changeLog}
                      onChange={(e) => {
                        setChangeLog(e.target.value);
                        handleFieldChange('changeLog');
                      }}
                      onBlur={() => handleFieldChange('changeLog')}
                      placeholder="Describe what changed in this version..."
                      error={!!fieldErrors.changeLog}
                      helperText={fieldErrors.changeLog || 'Optional: Included in notifications if provided'}
                      size="small"
                    />
                  )}
                </Stack>
              )}
            </Paper>
          </Stack>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Button onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {canPublish && (
                <Button
                  onClick={() => {
                    setPublishAction('draft');
                    handleSubmit();
                  }}
                  variant="outlined"
                  disabled={loading || !title.trim() || !summary.trim() || (isTextContent && !richTextContent.trim())}
                >
                  {loading ? <CircularProgress size={20} /> : 'Save draft'}
                </Button>
              )}
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
            </Box>
            {!loading && !isFormValid() && getDisabledReason() && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', maxWidth: 400 }}>
                {getDisabledReason()}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </PlaceholderPage>
  );
}
