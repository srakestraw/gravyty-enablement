/**
 * Admin Prompt Helper Detail Page
 * 
 * Edit prompt helper with version history and audit log
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import { Save as SaveIcon, Publish as PublishIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { PromptHelperForm } from '../../components/admin/promptHelpers/PromptHelperForm';
import { promptHelpersApi } from '../../api/promptHelpersClient';
import { isErrorResponse } from '../../lib/apiClient';
import type { PromptHelper, PromptHelperVersion, PromptHelperAuditLog } from '@gravyty/domain';

export function AdminPromptHelperDetailPage() {
  const { helperId } = useParams<{ helperId: string }>();
  const navigate = useNavigate();
  const [helper, setHelper] = useState<PromptHelper | null>(null);
  const [versions, setVersions] = useState<PromptHelperVersion[]>([]);
  const [auditLog, setAuditLog] = useState<PromptHelperAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (helperId && helperId !== 'new') {
      loadHelper();
    } else {
      setLoading(false);
    }
  }, [helperId]);

  const loadHelper = async () => {
    if (!helperId) return;
    setLoading(true);
    try {
      const [helperRes, versionsRes, auditRes] = await Promise.all([
        promptHelpersApi.get(helperId),
        promptHelpersApi.listVersions(helperId),
        promptHelpersApi.getAuditLog(helperId),
      ]);
      
      if (isErrorResponse(helperRes)) {
        setError(helperRes.error.message);
      } else {
        setHelper(helperRes.data.helper);
      }
      
      if (!isErrorResponse(versionsRes)) {
        setVersions(versionsRes.data.versions);
      }
      
      if (!isErrorResponse(auditRes)) {
        setAuditLog(auditRes.data.audit_log);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load helper');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    if (!helperId) return;
    setSaving(true);
    setError(null);
    
    try {
      const response = helperId === 'new'
        ? await promptHelpersApi.create(data)
        : await promptHelpersApi.update(helperId, data);
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
      } else {
        if (helperId === 'new') {
          navigate(`/enablement/admin/prompt-helpers/${response.data.helper.helper_id}`);
        } else {
          setHelper(response.data.helper);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!helperId || helperId === 'new') return;
    setSaving(true);
    try {
      const response = await promptHelpersApi.publish(helperId);
      if (isErrorResponse(response)) {
        alert(response.error.message);
      } else {
        loadHelper();
      }
    } catch (err) {
      alert('Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/enablement/admin/prompt-helpers')}>
          Back
        </Button>
        <Typography variant="h4">
          {helperId === 'new' ? 'Create Prompt Helper' : helper?.name || 'Prompt Helper'}
        </Typography>
        {helper && (
          <Chip
            label={helper.status}
            color={helper.status === 'published' ? 'success' : helper.status === 'archived' ? 'default' : 'warning'}
          />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Edit" />
        <Tab label="Versions" />
        <Tab label="Audit Log" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <PromptHelperForm helper={helper || undefined} onSubmit={handleSave} />
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => {
                const form = document.querySelector('form');
                form?.requestSubmit();
              }}
              disabled={saving}
            >
              {helperId === 'new' ? 'Create' : 'Save'}
            </Button>
            {helper && helper.status === 'draft' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<PublishIcon />}
                onClick={handlePublish}
                disabled={saving}
              >
                Publish
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Version History</Typography>
          {versions.length > 0 ? (
            <Stack spacing={2}>
              {versions.map((version) => (
                <Paper key={version.version_number} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1">Version {version.version_number}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Published {new Date(version.published_at).toLocaleString()} by {version.published_by}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">No versions yet</Typography>
          )}
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Audit Log</Typography>
          {auditLog.length > 0 ? (
            <Stack spacing={2}>
              {auditLog.map((log) => (
                <Paper key={log.action_id} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1">{log.action}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(log.timestamp).toLocaleString()} by {log.actor_id}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">No audit log entries</Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}

