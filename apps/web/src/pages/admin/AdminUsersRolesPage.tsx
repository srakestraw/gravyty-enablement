/**
 * Admin Users and Roles Page
 * 
 * Manage user accounts and role assignments
 */

import { useState, useEffect, useCallback } from 'react';
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
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { usersApi, AdminUser, isErrorResponse } from '../../lib/apiClient';
import { eventsApi } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

type Role = 'Viewer' | 'Contributor' | 'Approver' | 'Admin';
type EnabledFilter = 'all' | 'enabled' | 'disabled';

export function AdminUsersRolesPage() {
  const { user: currentUser, checkAuth } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [newRole, setNewRole] = useState<Role>('Viewer');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Viewer');
  const [confirmDisableSelf, setConfirmDisableSelf] = useState(false);
  const [confirmDeleteSelf, setConfirmDeleteSelf] = useState(false);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersApi.listUsers({
        query: debouncedQuery || undefined,
        limit: 50,
      });

      if (isErrorResponse(response)) {
        // Check if it's a permission error
        if (response.error.code === 'FORBIDDEN' || response.error.message.includes('Requires Admin role')) {
          const apiRole = response.error.message.match(/Current role: (\w+)/)?.[1] || 'Unknown';
          const frontendRole = currentUser?.role || 'Unknown';
          
          // Log full error details including debug info
          console.error('[AdminUsersRolesPage] ❌ 403 Forbidden error:', {
            apiRole,
            frontendRole,
            error: response.error,
            debug: response.error.debug,
            fullResponse: response,
          });
          
          if (frontendRole === 'Admin' && apiRole !== 'Admin') {
            // Token mismatch - frontend thinks Admin but API sees different role
            const debugInfo = response.error.debug;
            const debugMessage = debugInfo 
              ? `\n\nAPI Debug Info:\n- Groups from token: ${JSON.stringify(debugInfo.groupsFromToken)}\n- Groups from payload: ${JSON.stringify(debugInfo.groupsFromPayload)}\n- User object: ${JSON.stringify(debugInfo.reqUserObject)}`
              : '';
            
            setError(
              `Token mismatch detected! Frontend shows "${frontendRole}" but API received "${apiRole}". ` +
              `This means your JWT token doesn't include the Admin group. ` +
              `Please sign out completely and sign back in to get a fresh token with updated permissions. ` +
              `Check browser console and API server logs for detailed debugging info.${debugMessage}`
            );
          } else {
            const debugInfo = response.error.debug;
            const debugMessage = debugInfo 
              ? `\n\nAPI Debug Info:\n- Groups from token: ${JSON.stringify(debugInfo.groupsFromToken)}\n- Groups from payload: ${JSON.stringify(debugInfo.groupsFromPayload)}\n- User object: ${JSON.stringify(debugInfo.reqUserObject)}`
              : '';
            
            setError(
              `Permission denied: ${response.error.message}. ` +
              `Your current role is "${frontendRole}". ` +
              `If you were recently added to the Admin group, please sign out and sign back in to refresh your token.${debugMessage}`
            );
          }
        } else {
          setError(response.error.message);
        }
        setUsers([]);
      } else {
        setUsers(response.data.items);
        setNextCursor(response.data.next_cursor);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    fetchUsers();
    // Track page view
    eventsApi.track({
      event_name: 'admin_users_roles_viewed',
    });
  }, [fetchUsers]);

  useEffect(() => {
    // Track filter changes
    if (debouncedQuery || roleFilter !== 'all' || enabledFilter !== 'all') {
      eventsApi.track({
        event_name: 'admin_users_roles_filtered',
        metadata: {
          query: debouncedQuery,
          role: roleFilter,
          enabled: enabledFilter,
        },
      });
    }
  }, [debouncedQuery, roleFilter, enabledFilter]);

  // Filter users client-side (server doesn't support role/enabled filters yet)
  const filteredUsers = users.filter((user) => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (enabledFilter === 'enabled' && !user.enabled) return false;
    if (enabledFilter === 'disabled' && user.enabled) return false;
    return true;
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: AdminUser) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedUser here - it's needed for dialogs
    // setSelectedUser(null);
  };

  const handleInvite = async () => {
    try {
      const response = await usersApi.inviteUser({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
      });

      if (isErrorResponse(response)) {
        setSnackbar({ message: response.error.message, severity: 'error' });
      } else {
        setSnackbar({ message: 'User invited successfully', severity: 'success' });
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('Viewer');
        fetchUsers();
        // Track and audit
        eventsApi.track({
          event_name: 'admin_user_invited',
          metadata: { email: inviteEmail, role: inviteRole },
        });
        eventsApi.track({
          event_name: 'admin_users_invite',
          metadata: {
            actor: currentUser?.email || currentUser?.userId,
            target_email: inviteEmail,
            role: inviteRole,
          },
        });
      }
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to invite user',
        severity: 'error',
      });
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser) return;

    const oldRole = selectedUser.role;
    try {
      const response = await usersApi.setUserRole(selectedUser.username, newRole);

      if (isErrorResponse(response)) {
        setSnackbar({ message: response.error.message, severity: 'error' });
      } else {
        setSnackbar({ message: 'Role updated successfully', severity: 'success' });
        setRoleDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
        // Track and audit
        eventsApi.track({
          event_name: 'admin_user_role_changed',
          metadata: { username: selectedUser.username, oldRole, newRole },
        });
        eventsApi.track({
          event_name: 'admin_users_role_change',
          metadata: {
            actor: currentUser?.email || currentUser?.userId,
            target_username: selectedUser.username,
            target_email: selectedUser.email,
            old_role: oldRole,
            new_role: newRole,
          },
        });
      }
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to update role',
        severity: 'error',
      });
    }
  };

  const handleDisable = async () => {
    if (!selectedUser) return;

    // Check if disabling self
    const isSelf = currentUser?.email === selectedUser.email || currentUser?.userId === selectedUser.username;
    if (isSelf && !confirmDisableSelf) {
      setSnackbar({ message: 'Please confirm that you want to disable your own account', severity: 'error' });
      return;
    }

    try {
      const response = await usersApi.disableUser(selectedUser.username);

      if (isErrorResponse(response)) {
        setSnackbar({ message: response.error.message, severity: 'error' });
      } else {
        setSnackbar({ message: 'User disabled successfully', severity: 'success' });
        setDisableDialogOpen(false);
        setConfirmDisableSelf(false);
        setSelectedUser(null);
        fetchUsers();
        // Track and audit
        eventsApi.track({
          event_name: 'admin_user_disabled',
          metadata: { username: selectedUser.username },
        });
        eventsApi.track({
          event_name: 'admin_users_disable',
          metadata: {
            actor: currentUser?.email || currentUser?.userId,
            target_username: selectedUser.username,
            target_email: selectedUser.email,
            enabled_before: true,
            enabled_after: false,
          },
        });
      }
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to disable user',
        severity: 'error',
      });
    }
  };

  const handleEnable = async () => {
    if (!selectedUser) return;

    try {
      const response = await usersApi.enableUser(selectedUser.username);

      if (isErrorResponse(response)) {
        setSnackbar({ message: response.error.message, severity: 'error' });
      } else {
        setSnackbar({ message: 'User enabled successfully', severity: 'success' });
        setEnableDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
        // Track and audit
        eventsApi.track({
          event_name: 'admin_user_enabled',
          metadata: { username: selectedUser.username },
        });
        eventsApi.track({
          event_name: 'admin_users_enable',
          metadata: {
            actor: currentUser?.email || currentUser?.userId,
            target_username: selectedUser.username,
            target_email: selectedUser.email,
            enabled_before: false,
            enabled_after: true,
          },
        });
      }
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to enable user',
        severity: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    // Check if deleting self
    const deletingSelf = currentUser?.email === selectedUser.email || currentUser?.userId === selectedUser.username;
    if (deletingSelf && (!confirmDeleteSelf || confirmDeleteEmail !== selectedUser.email)) {
      setSnackbar({ 
        message: 'Please confirm deletion by checking the box and typing the email address', 
        severity: 'error' 
      });
      return;
    }

    try {
      const response = await usersApi.deleteUser(selectedUser.username);

      if (isErrorResponse(response)) {
        setSnackbar({ message: response.error.message, severity: 'error' });
      } else {
        setSnackbar({ message: 'User deleted successfully', severity: 'success' });
        setDeleteDialogOpen(false);
        setConfirmDeleteSelf(false);
        setConfirmDeleteEmail('');
        setSelectedUser(null);
        fetchUsers();
        // Track and audit
        eventsApi.track({
          event_name: 'admin_user_deleted',
          metadata: { username: selectedUser.username },
        });
        eventsApi.track({
          event_name: 'admin_users_delete',
          metadata: {
            actor: currentUser?.email || currentUser?.userId,
            target_username: selectedUser.username,
            target_email: selectedUser.email,
          },
        });
      }
    } catch (err) {
      setSnackbar({
        message: err instanceof Error ? err.message : 'Failed to delete user',
        severity: 'error',
      });
    }
  };

  const isSelf = selectedUser && (currentUser?.email === selectedUser.email || currentUser?.userId === selectedUser.username);

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users & Roles</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setInviteDialogOpen(true)}
        >
          Invite User
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          placeholder="Name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={roleFilter}
            label="Role"
            onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="Viewer">Viewer</MenuItem>
            <MenuItem value="Contributor">Contributor</MenuItem>
            <MenuItem value="Approver">Approver</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={enabledFilter}
            label="Status"
            onChange={(e) => setEnabledFilter(e.target.value as EnabledFilter)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="enabled">Enabled</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            (error.includes('Requires Admin role') || error.includes('Permission denied')) ? (
              <Button
                color="inherit"
                size="small"
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await checkAuth(true); // Force refresh token
                    // Wait a moment for auth to refresh, then retry
                    setTimeout(() => {
                      fetchUsers();
                      setRefreshing(false);
                    }, 1000);
                  } catch (err) {
                    setRefreshing(false);
                    setError('Failed to refresh authentication. Please sign out and sign back in to get a fresh token.');
                  }
                }}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Auth'}
              </Button>
            ) : null
          }
        >
          <Box>
            <Typography variant="body2">{error}</Typography>
            {(error.includes('Requires Admin role') || error.includes('Permission denied')) && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Current user: {currentUser?.email || currentUser?.userId || 'Unknown'} | 
                  Role: {currentUser?.role || 'Unknown'}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  If you were recently added to the Admin group, you need to sign out and sign back in 
                  to get a fresh token with updated permissions.
                </Typography>
              </Box>
            )}
          </Box>
        </Alert>
      )}

      {filteredUsers.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No users found. Try adjusting your filters.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.username}>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip label={user.role} size="small" color={user.role === 'Admin' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.user_status}
                      size="small"
                      color={
                        user.user_status === 'CONFIRMED' || user.user_status === 'EXTERNAL_PROVIDER'
                          ? 'success'
                          : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.enabled ? 'Yes' : 'No'}
                      size="small"
                      color={user.enabled ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(user.modified_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, user)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            setNewRole(selectedUser?.role || 'Viewer');
            setRoleDialogOpen(true);
            handleMenuClose();
          }}
        >
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Change Role
        </MenuItem>
        {selectedUser?.enabled ? (
          <MenuItem
            onClick={() => {
              setDisableDialogOpen(true);
              handleMenuClose();
            }}
          >
            <BlockIcon sx={{ mr: 1 }} fontSize="small" />
            Disable
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              setEnableDialogOpen(true);
              handleMenuClose();
            }}
          >
            <CheckCircleIcon sx={{ mr: 1 }} fontSize="small" />
            Enable
          </MenuItem>
        )}
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            setDeleteDialogOpen(true);
            setConfirmDeleteSelf(false);
            setConfirmDeleteEmail('');
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteRole}
              label="Role"
              onChange={(e) => setInviteRole(e.target.value as Role)}
            >
              <MenuItem value="Viewer">Viewer - View-only access to approved content</MenuItem>
              <MenuItem value="Contributor">Contributor - Can create and edit content</MenuItem>
              <MenuItem value="Approver">Approver - Can approve, deprecate, and expire content</MenuItem>
              <MenuItem value="Admin">Admin - Full administrative access</MenuItem>
            </Select>
          </FormControl>
          {inviteRole === 'Admin' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Warning:</strong> Admin role grants full access to the system, including user management and all content.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} variant="contained" disabled={!inviteEmail || !inviteName}>
            Invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Role</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current role: <strong>{selectedUser?.role}</strong>
          </Typography>
          {newRole === 'Admin' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You are about to grant Admin privileges. This user will have full access to the system.
            </Alert>
          )}
          <FormControl fullWidth>
            <InputLabel>New Role</InputLabel>
            <Select
              value={newRole}
              label="New Role"
              onChange={(e) => setNewRole(e.target.value as Role)}
            >
              <MenuItem value="Viewer">Viewer</MenuItem>
              <MenuItem value="Contributor">Contributor</MenuItem>
              <MenuItem value="Approver">Approver</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRoleChange} variant="contained" disabled={newRole === selectedUser?.role}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableDialogOpen} onClose={() => {
        setDisableDialogOpen(false);
        setSelectedUser(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Disable User</DialogTitle>
        <DialogContent>
          {isSelf ? (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>Warning:</strong> You are about to disable your own account. This will prevent you from accessing the system.
              </Alert>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmDisableSelf}
                    onChange={(e) => setConfirmDisableSelf(e.target.checked)}
                  />
                }
                label="I understand that disabling my account will prevent me from accessing the system"
              />
            </>
          ) : (
            <Typography>
              Are you sure you want to disable <strong>{selectedUser?.name || selectedUser?.email}</strong>? They will not be able to access the system.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDisable}
            variant="contained"
            color="error"
            disabled={isSelf && !confirmDisableSelf}
          >
            Disable
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enable Dialog */}
      <Dialog open={enableDialogOpen} onClose={() => {
        setEnableDialogOpen(false);
        setSelectedUser(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Enable User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to enable <strong>{selectedUser?.name || selectedUser?.email}</strong>? They will be able to access the system.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnableDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEnable} variant="contained" color="success">
            Enable
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        setConfirmDeleteSelf(false);
        setConfirmDeleteEmail('');
        setSelectedUser(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          {selectedUser && (currentUser?.email === selectedUser.email || currentUser?.userId === selectedUser.username) ? (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>Warning:</strong> You are about to delete your own account. This action cannot be undone and you will immediately lose access to the system.
              </Alert>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmDeleteSelf}
                    onChange={(e) => setConfirmDeleteSelf(e.target.checked)}
                  />
                }
                label="I understand that deleting my account is permanent and cannot be undone"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Type email to confirm"
                placeholder={selectedUser?.email}
                value={confirmDeleteEmail}
                onChange={(e) => setConfirmDeleteEmail(e.target.value)}
                error={confirmDeleteEmail !== selectedUser?.email && confirmDeleteEmail.length > 0}
                helperText={confirmDeleteEmail !== selectedUser?.email && confirmDeleteEmail.length > 0 ? 'Email does not match' : 'Type the user email to confirm deletion'}
              />
            </>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Warning:</strong> This action cannot be undone. The user will be permanently deleted from the system.
              </Alert>
              <Typography>
                Are you sure you want to delete <strong>{selectedUser?.name || selectedUser?.email}</strong>? This will permanently remove their account and all associated data.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setConfirmDeleteSelf(false);
            setConfirmDeleteEmail('');
            setSelectedUser(null);
          }}>Cancel</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={selectedUser && (currentUser?.email === selectedUser.email || currentUser?.userId === selectedUser.username) && (!confirmDeleteSelf || confirmDeleteEmail !== selectedUser?.email)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
      />
    </Box>
  );
}
