/**
 * Admin Learning Certificates Page
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Publish as PublishIcon, Archive as ArchiveIcon } from '@mui/icons-material';
import { useAdminCertificateTemplates } from '../../../hooks/useAdminCertificateTemplates';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { useAuth } from '../../../contexts/AuthContext';
import { normalizeRole } from '../../../lib/roles';

export function AdminLearningCertificatesPage() {
  const { data: templates, loading, error, refetch } = useAdminCertificateTemplates();
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);
  const canPublish = userRole === 'Approver' || userRole === 'Admin';
  const canArchive = userRole === 'Approver' || userRole === 'Admin';
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [appliesTo, setAppliesTo] = useState<'course' | 'path'>('course');
  const [appliesToId, setAppliesToId] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');
  const [issuedCopyTitle, setIssuedCopyTitle] = useState('');
  const [issuedCopyBody, setIssuedCopyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAppliesTo('course');
    setAppliesToId('');
    setBadgeText('');
    setSignatoryName('');
    setSignatoryTitle('');
    setIssuedCopyTitle('');
    setIssuedCopyBody('');
    setEditingTemplate(null);
  };

  const handleCreate = async () => {
    if (!name || !appliesToId || !badgeText || !issuedCopyTitle || !issuedCopyBody) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await lmsAdminApi.createCertificateTemplate({
        name,
        description: description || undefined,
        applies_to: appliesTo,
        applies_to_id: appliesToId,
        badge_text: badgeText,
        signatory_name: signatoryName || undefined,
        signatory_title: signatoryTitle || undefined,
        issued_copy: {
          title: issuedCopyTitle,
          body: issuedCopyBody,
        },
      });
      setOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      console.error('Failed to create template:', err);
      alert('Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description || '');
    setAppliesTo(template.applies_to);
    setAppliesToId(template.applies_to_id);
    setBadgeText(template.badge_text);
    setSignatoryName(template.signatory_name || '');
    setSignatoryTitle(template.signatory_title || '');
    setIssuedCopyTitle(template.issued_copy?.title || '');
    setIssuedCopyBody(template.issued_copy?.body || '');
    setOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingTemplate || !name || !appliesToId || !badgeText || !issuedCopyTitle || !issuedCopyBody) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await lmsAdminApi.updateCertificateTemplate(editingTemplate.template_id, {
        name,
        description: description || undefined,
        applies_to: appliesTo,
        applies_to_id: appliesToId,
        badge_text: badgeText,
        signatory_name: signatoryName || undefined,
        signatory_title: signatoryTitle || undefined,
        issued_copy: {
          title: issuedCopyTitle,
          body: issuedCopyBody,
        },
      });
      setOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      console.error('Failed to update template:', err);
      alert('Failed to update template');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (templateId: string) => {
    if (!confirm('Publish this certificate template?')) return;
    try {
      await lmsAdminApi.publishCertificateTemplate(templateId);
      refetch();
    } catch (err) {
      console.error('Failed to publish template:', err);
      alert('Failed to publish template');
    }
  };

  const handleArchive = async (templateId: string) => {
    if (!confirm('Archive this certificate template?')) return;
    try {
      await lmsAdminApi.archiveCertificateTemplate(templateId);
      refetch();
    } catch (err) {
      console.error('Failed to archive template:', err);
      alert('Failed to archive template');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Certificate Templates</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setOpen(true); }}>
          Create Template
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Applies To</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates && templates.length > 0 ? (
              templates.map((template: any) => (
                <TableRow key={template.template_id}>
                  <TableCell>{template.name}</TableCell>
                  <TableCell>
                    <Chip label={template.applies_to} size="small" /> {template.applies_to_id}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.status || 'draft'}
                      color={template.status === 'published' ? 'success' : template.status === 'archived' ? 'default' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{template.updated_at ? new Date(template.updated_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(template)} title="Edit">
                      <EditIcon />
                    </IconButton>
                    {template.status !== 'published' && canPublish && (
                      <IconButton size="small" onClick={() => handlePublish(template.template_id)} title="Publish (Approver+)">
                        <PublishIcon />
                      </IconButton>
                    )}
                    {template.status !== 'archived' && canArchive && (
                      <IconButton size="small" onClick={() => handleArchive(template.template_id)} title="Archive (Approver+)">
                        <ArchiveIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No certificate templates found. Create your first template to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => { setOpen(false); resetForm(); }} maxWidth="md" fullWidth>
        <DialogTitle>{editingTemplate ? 'Edit Certificate Template' : 'Create Certificate Template'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Applies To</InputLabel>
            <Select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as 'course' | 'path')}>
              <MenuItem value="course">Course</MenuItem>
              <MenuItem value="path">Path</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Applies To ID"
            value={appliesToId}
            onChange={(e) => setAppliesToId(e.target.value)}
            margin="normal"
            required
            helperText="Course ID or Path ID"
          />
          <TextField
            fullWidth
            label="Badge Text"
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            margin="normal"
            required
            helperText="Text displayed on certificate badge"
          />
          <TextField
            fullWidth
            label="Signatory Name"
            value={signatoryName}
            onChange={(e) => setSignatoryName(e.target.value)}
            margin="normal"
            helperText="Optional - name of signatory"
          />
          <TextField
            fullWidth
            label="Signatory Title"
            value={signatoryTitle}
            onChange={(e) => setSignatoryTitle(e.target.value)}
            margin="normal"
            helperText="Optional - title of signatory"
          />
          <TextField
            fullWidth
            label="Certificate Title"
            value={issuedCopyTitle}
            onChange={(e) => setIssuedCopyTitle(e.target.value)}
            margin="normal"
            required
            helperText="Title displayed on certificate"
          />
          <TextField
            fullWidth
            label="Certificate Body"
            value={issuedCopyBody}
            onChange={(e) => setIssuedCopyBody(e.target.value)}
            margin="normal"
            required
            multiline
            rows={3}
            helperText="Body text displayed on certificate"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
          <Button
            onClick={editingTemplate ? handleUpdate : handleCreate}
            variant="contained"
            disabled={submitting || !name || !appliesToId || !badgeText || !issuedCopyTitle || !issuedCopyBody}
          >
            {submitting ? (editingTemplate ? 'Updating...' : 'Creating...') : (editingTemplate ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
