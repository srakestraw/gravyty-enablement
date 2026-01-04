/**
 * Content Hub - Create Content Page
 * 
 * Full-page form for creating content with taxonomy classification, source selection,
 * and role-based publish behavior.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { 
  createAsset, 
  initUpload, 
  completeUpload, 
  publishVersion, 
  scheduleVersion, 
  setExpireAt, 
  saveRichTextContent,
  getAsset,
  getAssetVersion,
  createAssetVersion,
  updateAsset,
  updateAssetVersion,
  deleteAsset,
} from '../../api/contentHubClient';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { isErrorResponse, usersApi, type AdminUser } from '../../lib/apiClient';
import type { AssetType, AssetSourceType, Asset, AssetVersion } from '@gravyty/domain';
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
import { canDeleteAsset } from '../../lib/content-hub/assetHelpers';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';

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
  const { assetId } = useParams<{ assetId?: string }>();
  const [searchParams] = useSearchParams();
  const versionIdFromQuery = searchParams.get('versionId');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [existingAsset, setExistingAsset] = useState<Asset | null>(null);
  const [existingVersion, setExistingVersion] = useState<AssetVersion | null>(null);
  const [versionId, setVersionId] = useState<string | undefined>(versionIdFromQuery || undefined);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
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
  const [highlightAsNew, setHighlightAsNew] = useState(false);
  
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
  const canDelete = existingAsset ? canDeleteAsset(user, existingAsset) : false;
  
  // Determine if content type is text_content
  const isTextContent = assetType === 'text_content' || assetType === 'document';
  
  // Load existing asset and version when editing
  useEffect(() => {
    const loadExistingData = async () => {
      if (!assetId) {
        setIsEditMode(false);
        return;
      }
      
      setIsEditMode(true);
      setLoadingAsset(true);
      
      try {
        // Load asset
        const assetResponse = await getAsset(assetId);
        if (isErrorResponse(assetResponse)) {
          setError(assetResponse.error.message || 'Failed to load asset. Please check if the asset exists.');
          setIsEditMode(false); // Reset edit mode if asset load fails
          setLoadingAsset(false);
          return;
        }
        
        const asset = assetResponse.data.asset;
        setExistingAsset(asset);
        
        // Populate form with asset data
        setTitle(asset.title);
        setSummary(asset.short_description || '');
        setRichTextContent(asset.body_rich_text || asset.description_rich_text || '');
        setCoverImage(asset.cover_image || null);
        setAssetType(asset.asset_type);
        setOwnerId(asset.owner_id);
        setKeywords(asset.keywords || []);
        setAudienceIds(asset.audience_ids || []);
        
        // Parse metadata node IDs
        const metadataIds = asset.metadata_node_ids || [];
        const productSuiteIdsFromAsset = metadataIds.filter(id => 
          productSuiteOptions.some(opt => opt.option_id === id)
        );
        const productIdsFromAsset = metadataIds.filter(id => 
          productOptions.some(opt => opt.option_id === id)
        );
        const tagIdsFromAsset = metadataIds.filter(id => 
          !productSuiteIdsFromAsset.includes(id) && !productIdsFromAsset.includes(id)
        );
        setProductSuiteIds(productSuiteIdsFromAsset);
        setProductIds(productIdsFromAsset);
        setTagIds(tagIdsFromAsset);
        
        // Determine version to edit
        let targetVersionId = versionIdFromQuery;
        
        if (!targetVersionId) {
          // Check for existing draft version
          const versions = assetResponse.data.versions || [];
          const draftVersion = versions.find((v: any) => v.status === 'draft');
          
          if (draftVersion) {
            targetVersionId = draftVersion.id;
            setVersionId(draftVersion.id);
          } else {
            // Create a new draft version
            // If there's a published version, clone from it; otherwise create empty draft
            try {
              const createVersionResponse = await createAssetVersion(assetId, {
                ...(asset.current_published_version_id && { fromVersionId: asset.current_published_version_id }),
              });
              
              if (!isErrorResponse(createVersionResponse)) {
                targetVersionId = createVersionResponse.data.version.version_id;
                setVersionId(targetVersionId);
              }
              // If version creation fails, continue anyway - we can still load links from source_ref
            } catch (versionError) {
              // If version creation fails, continue anyway - we can still load links from source_ref
            }
          }
        }
        
        // Load attachments - check both version attachments and asset source_ref (for links)
        const loadedAttachments: Attachment[] = [];
        let attachmentIndex = 0;
        
        // Load version data if we have a version ID
        if (targetVersionId) {
          const versionResponse = await getAssetVersion(assetId, targetVersionId);
          if (!isErrorResponse(versionResponse)) {
            setExistingVersion(versionResponse.data.version);
            
            // Load attachments from version
            const versionAttachments = versionResponse.data.attachments.map((att: Attachment) => ({
              id: att.attachment_id,
              type: att.type,
              url: att.url,
              fileName: att.file_name,
              mimeType: att.mime_type,
              fileSize: att.file_size,
              isPrimary: att.is_primary,
              status: (att.status || 'ready') as 'ready' | 'uploading' | 'failed',
              sortOrder: att.sort_order || attachmentIndex++,
            }));
            loadedAttachments.push(...versionAttachments);
            attachmentIndex = loadedAttachments.length;
            
            // Load rich text content if available
            if (versionResponse.data.version.content_html) {
              setRichTextContent(versionResponse.data.version.content_html);
            }
          }
        }
        
        // For LINK type assets (check both source_type and asset_type), load links from source_ref
        // This should happen regardless of whether we have a version ID or attachments
        const isLinkAsset = asset.source_type === 'LINK' || asset.asset_type === 'link';
        if (isLinkAsset && asset.source_ref) {
          // Handle both single URL and multiple URLs formats
          let urls: string[] = [];
          if (Array.isArray(asset.source_ref.urls)) {
            urls = asset.source_ref.urls.filter((url: any) => typeof url === 'string' && url.trim().length > 0);
          } else if (typeof asset.source_ref.url === 'string' && asset.source_ref.url.trim().length > 0) {
            urls = [asset.source_ref.url];
          } else if (typeof asset.source_ref === 'object') {
            // Try to find any URL-like values in the source_ref object
            Object.values(asset.source_ref).forEach((value: any) => {
              if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                urls.push(value);
              } else if (Array.isArray(value)) {
                value.forEach((item: any) => {
                  if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
                    urls.push(item);
                  }
                });
              }
            });
          }
          
          if (urls.length > 0) {
            urls.forEach((url: string, index: number) => {
              // Check if this URL is already in attachments (from version)
              const existingLink = loadedAttachments.find(a => a.type === 'LINK' && a.url === url);
              if (!existingLink) {
                // Add link from source_ref if not already loaded as attachment
                loadedAttachments.push({
                  id: `link_${Date.now()}_${index}`,
                  type: 'LINK',
                  url: url.trim(),
                  status: 'ready',
                  isPrimary: loadedAttachments.length === 0 && index === 0,
                  sortOrder: attachmentIndex++,
                });
              }
            });
          }
        }
        
        // For GOOGLE_DRIVE type assets, load drive link from source_ref if not already loaded
        if (asset.source_type === 'GOOGLE_DRIVE' && asset.source_ref) {
          const driveLink = asset.source_ref.drive_web_view_link || asset.source_ref.driveWebViewLink;
          if (driveLink) {
            const existingDrive = loadedAttachments.find(a => a.type === 'DRIVE');
            if (!existingDrive) {
              loadedAttachments.push({
                id: 'drive_1',
                type: 'DRIVE',
                url: driveLink,
                fileName: asset.source_ref.drive_file_name || asset.source_ref.driveFileName,
                driveFileId: asset.source_ref.drive_file_id || asset.source_ref.driveFileId,
                driveFileName: asset.source_ref.drive_file_name || asset.source_ref.driveFileName,
                driveWebViewLink: driveLink,
                status: 'ready',
                isPrimary: loadedAttachments.length === 0,
                sortOrder: attachmentIndex++,
              });
            }
          }
        }
        
        setAttachments(loadedAttachments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset');
        setIsEditMode(false); // Reset edit mode if asset load fails
      } finally {
        setLoadingAsset(false);
      }
    };
    
    if (assetId) {
      loadExistingData();
    }
  }, [assetId, versionIdFromQuery, productSuiteOptions, productOptions]);
  
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

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmationText('');
  };

  const handleDelete = async () => {
    if (!assetId || !existingAsset) return;
    
    const isDeleteConfirmed = deleteConfirmationText === existingAsset.title;
    if (!isDeleteConfirmed) return;
    
    try {
      setDeleting(true);
      const response = await deleteAsset(assetId);
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setDeleting(false);
        return;
      }
      
      // Navigate to library page after successful delete
      navigate('/enablement/content-hub/library');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
      setDeleting(false);
    }
  };

  const isDeleteConfirmed = deleteConfirmationText === existingAsset?.title;
  
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
      
      let createdAsset: Asset;
      let currentVersionId: string | undefined = versionId;
      
      if (isEditMode && existingAsset && assetId) {
        // Edit mode: Update asset metadata and version content
        // Fix source_type if asset_type is 'link' but source_type is wrong
        let correctedSourceType = undefined;
        if (assetType === 'link' && existingAsset.source_type !== 'LINK') {
          // Check if we have links in attachments or source_ref
          const hasLinks = attachments.some(a => a.type === 'LINK') || 
                          (existingAsset.source_ref && (existingAsset.source_ref.url || existingAsset.source_ref.urls));
          if (hasLinks) {
            correctedSourceType = 'LINK';
          }
        }
        
        // Update asset metadata
        const updateAssetResponse = await updateAsset(existingAsset.asset_id, {
          title: title.trim(),
          short_description: summary.trim() || undefined,
          description_rich_text: descriptionRichText || undefined,
          body_rich_text: bodyRichText || undefined,
          cover_image: coverImage || undefined,
          metadata_node_ids: taxonomyNodeIds,
          audience_ids: audienceIds,
          keywords: keywords.length > 0 ? keywords : undefined,
          ...(correctedSourceType && { source_type: correctedSourceType }),
        });
        
        if (isErrorResponse(updateAssetResponse)) {
          setError(updateAssetResponse.error.message || 'Failed to update asset');
          return;
        }
        
        createdAsset = updateAssetResponse.data.asset;
        
        // Ensure we have a version ID - create one if missing
        if (!currentVersionId) {
          // Create a draft version if one doesn't exist
          const createVersionResponse = await createAssetVersion(existingAsset.asset_id, {
            ...(existingAsset.current_published_version_id && { fromVersionId: existingAsset.current_published_version_id }),
          });
          
          if (isErrorResponse(createVersionResponse)) {
            setError(createVersionResponse.error.message || 'Failed to create draft version');
            return;
          }
          
          currentVersionId = createVersionResponse.data.version.version_id;
          setVersionId(currentVersionId);
        }
        
        // Update version rich text content if changed
        if (richTextContent && (bodyRichText || descriptionRichText)) {
          await saveRichTextContent(existingAsset.asset_id, {
            version_id: currentVersionId,
            content_html: richTextContent,
          });
        }
        
        // Note: Attachments are handled separately via addAttachment/removeAttachment endpoints
        // For now, we'll rely on the existing attachment management in the form
      } else {
        // Create mode: Create asset and v1 draft version
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
          console.error('[CreateAssetPage] Error creating asset:', {
            error: createAssetResponse.error,
            request_id: createAssetResponse.request_id,
          });
          console.error('[CreateAssetPage] Error message:', createAssetResponse.error.message);
          console.error('[CreateAssetPage] Error code:', createAssetResponse.error.code);
          if (createAssetResponse.error.debug) {
            console.error('[CreateAssetPage] Error debug info:', createAssetResponse.error.debug);
          }
          setError(createAssetResponse.error.message || 'Failed to create asset');
          return;
        }
        
        createdAsset = createAssetResponse.data.asset;
        currentVersionId = createAssetResponse.data.version?.version_id;
      }
      
      // Handle file attachments uploads (for both create and edit modes)
      const fileAttachments = attachments.filter(a => a.type === 'FILE_UPLOAD' && a.file);
      if (fileAttachments.length > 0 && !currentVersionId) {
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
        
        currentVersionId = initResponse.data.version_id;
        
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
            version_id: currentVersionId,
            files: uploadedFiles,
          });
          
          if (isErrorResponse(completeResponse)) {
            setError(completeResponse.error.message);
            return;
          }
          
          currentVersionId = completeResponse.data.version.version_id;
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
            version_id: currentVersionId,
            storage_key: initResponse.data.s3_key!,
            size_bytes: file.size,
          });
          
          if (isErrorResponse(completeResponse)) {
            setError(completeResponse.error.message);
            return;
          }
          
          currentVersionId = completeResponse.data.version.version_id;
        }
      }
      
      // For text_content or if version was created automatically, use it
      if (!currentVersionId && !isEditMode && createAssetResponse.data.version) {
        currentVersionId = createAssetResponse.data.version.version_id;
      }
      
      // Handle publish action
      if (currentVersionId && publishAction === 'publish-now') {
        const publishResponse = await publishVersion(currentVersionId, {
          ...(changeLog.trim() && { change_log: changeLog.trim() }),
          highlight_as_new: highlightAsNew,
          notify_followers: highlightAsNew,
        });
        
        if (isErrorResponse(publishResponse)) {
          setError(publishResponse.error.message);
          return;
        }
      } else if (currentVersionId && publishAction === 'schedule') {
        const scheduleResponse = await scheduleVersion(currentVersionId, {
          publish_at: new Date(publishAt).toISOString(),
        });
        
        if (isErrorResponse(scheduleResponse)) {
          setError(scheduleResponse.error.message);
          return;
        }
        
        // Set expiration date if provided
        if (expireAt && currentVersionId) {
          const expireResponse = await setExpireAt(currentVersionId, new Date(expireAt).toISOString());
          if (isErrorResponse(expireResponse)) {
            setError(expireResponse.error.message);
            return;
          }
        }
      } else if (currentVersionId && expireAt) {
        // Set expiration date for draft versions too
        const expireResponse = await setExpireAt(currentVersionId, new Date(expireAt).toISOString());
        if (isErrorResponse(expireResponse)) {
          setError(expireResponse.error.message);
          return;
        }
      }
      
      // Success! Navigate to asset detail page
      if (isEditMode) {
        navigate(`/enablement/content-hub/assets/${createdAsset.asset_id}`);
      } else {
        navigate('/enablement/resources/library');
      }
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
  
  // Show loading state while loading asset data
  if (loadingAsset) {
    return (
      <PlaceholderPage title={isEditMode ? "Edit content" : "Create content"} description={isEditMode ? "Edit an enablement item" : "Create a new enablement item"}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </PlaceholderPage>
    );
  }

  return (
    <PlaceholderPage title={isEditMode ? "Edit content" : "Create content"} description={isEditMode ? "Edit an enablement item" : "Create a new enablement item"}>
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
          <Typography color="text.primary">{isEditMode ? "Edit content" : "Create content"}</Typography>
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            {isEditMode && canDelete && (
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                color="error"
                disabled={loading || deleting}
              >
                Delete
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {canPublish && !isEditMode && (
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
              {isEditMode && publishAction === 'publish-now' && (
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
              )}
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={loading || !isFormValid()}
              >
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  isEditMode 
                    ? (publishAction === 'draft' ? 'Save draft' : publishAction === 'schedule' ? 'Schedule' : 'Update')
                    : (publishAction === 'draft' ? 'Create draft' : publishAction === 'schedule' ? 'Schedule' : 'Publish')
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete Content Asset</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to delete "{existingAsset?.title || 'this asset'}"? This action cannot be undone.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            To confirm, please type the asset title: <strong>{existingAsset?.title || ''}</strong>
          </DialogContentText>
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
    </PlaceholderPage>
  );
}
