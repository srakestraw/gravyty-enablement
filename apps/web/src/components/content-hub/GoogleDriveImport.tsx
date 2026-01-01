/**
 * Google Drive Import Component
 * 
 * Modal dialog for importing files from Google Drive
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  TextField,
  Box,
  Typography,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { Folder, InsertDriveFile, NavigateNext } from '@mui/icons-material';
import {
  browseGoogleDrive,
  importFromGoogleDrive,
  type GoogleDriveFile,
} from '../../api/googleDriveClient';
import { isErrorResponse } from '../../lib/apiClient';

export interface GoogleDriveImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (assetId: string) => void;
}

interface DriveFolder {
  file_id: string;
  name: string;
}

export function GoogleDriveImport({ open, onClose, onImport }: GoogleDriveImportProps) {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [title, setTitle] = useState('');
  
  useEffect(() => {
    if (open) {
      loadFiles();
    } else {
      // Reset state when dialog closes
      setFiles([]);
      setFolders([]);
      setCurrentFolderId(undefined);
      setFolderPath([]);
      setSelectedFile(null);
      setTitle('');
      setError(null);
    }
  }, [open, currentFolderId]);
  
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await browseGoogleDrive({
        folder_id: currentFolderId,
      });
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      const items = response.data.items;
      const fileItems = items.filter(item => !item.mime_type.includes('folder'));
      const folderItems = items.filter(item => item.mime_type.includes('folder'));
      
      setFiles(fileItems);
      setFolders(folderItems.map(f => ({ file_id: f.file_id, name: f.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFolderClick = (folder: DriveFolder) => {
    setFolderPath([...folderPath, folder]);
    setCurrentFolderId(folder.file_id);
    setSelectedFile(null);
  };
  
  const handleBreadcrumbClick = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    if (index === -1) {
      setCurrentFolderId(undefined);
    } else {
      setCurrentFolderId(newPath[index].file_id);
    }
    setSelectedFile(null);
  };
  
  const handleFileSelect = (file: GoogleDriveFile) => {
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name);
    }
  };
  
  const handleImport = async () => {
    if (!selectedFile) return;
    
    try {
      setImporting(true);
      setError(null);
      
      const response = await importFromGoogleDrive({
        file_id: selectedFile.file_id,
        title: title || selectedFile.name,
      });
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      onImport(response.data.asset.asset_id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setImporting(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import from Google Drive</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Breadcrumbs */}
        {folderPath.length > 0 && (
          <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
            <Link
              component="button"
              variant="body1"
              onClick={() => handleBreadcrumbClick(-1)}
              sx={{ cursor: 'pointer' }}
            >
              Drive
            </Link>
            {folderPath.map((folder, index) => (
              <Link
                key={folder.file_id}
                component="button"
                variant="body1"
                onClick={() => handleBreadcrumbClick(index)}
                sx={{ cursor: 'pointer' }}
              >
                {folder.name}
              </Link>
            ))}
          </Breadcrumbs>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Folders */}
            {folders.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Folders
                </Typography>
                <List>
                  {folders.map((folder) => (
                    <ListItem key={folder.file_id} disablePadding>
                      <ListItemButton onClick={() => handleFolderClick(folder)}>
                        <Folder sx={{ mr: 2 }} />
                        <ListItemText primary={folder.name} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {/* Files */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Files
              </Typography>
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {files.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No files found"
                      secondary={currentFolderId ? 'This folder is empty' : 'No files in root folder'}
                    />
                  </ListItem>
                ) : (
                  files.map((file) => (
                    <ListItem
                      key={file.file_id}
                      disablePadding
                    >
                      <ListItemButton
                        selected={selectedFile?.file_id === file.file_id}
                        onClick={() => handleFileSelect(file)}
                      >
                        <InsertDriveFile sx={{ mr: 2 }} />
                        <ListItemText
                          primary={file.name}
                          secondary={
                            <>
                              {file.size_bytes && (
                                <Typography variant="caption" display="block">
                                  {(file.size_bytes / 1024).toFixed(2)} KB
                                </Typography>
                              )}
                              <Typography variant="caption" display="block">
                                Modified: {new Date(file.modified_time).toLocaleString()}
                              </Typography>
                            </>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
            
            {/* Import Options */}
            {selectedFile && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Import Options
                </Typography>
                <TextField
                  fullWidth
                  label="Asset Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  File: {selectedFile.name}
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!selectedFile || importing}
        >
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

