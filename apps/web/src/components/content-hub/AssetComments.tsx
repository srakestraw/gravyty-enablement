/**
 * Asset Comments Component
 * 
 * Displays and manages comments for an asset
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Send, CheckCircle } from '@mui/icons-material';
import { createComment, listComments, resolveComment, type CreateCommentRequest } from '../../api/contentHubClient';
import { isErrorResponse } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { isApproverOrHigher } from '../../lib/roles';
import type { Comment } from '@gravyty/domain';
import type { Asset } from '@gravyty/domain';

interface AssetCommentsProps {
  asset: Asset;
  versionId?: string;
}

export function AssetComments({ asset, versionId }: AssetCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCommentBody, setNewCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const isApprover = isApproverOrHigher(user?.role);
  const canResolve = isApprover || asset.owner_id === user?.userId;
  
  useEffect(() => {
    loadComments();
  }, [asset.asset_id, versionId]);
  
  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await listComments(asset.asset_id, {
        version_id: versionId,
      });
      
      if (isErrorResponse(response)) {
        setError(response.error.message);
        return;
      }
      
      setComments(response.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitComment = async () => {
    if (!newCommentBody.trim() || submitting) return;
    
    try {
      setSubmitting(true);
      
      const request: CreateCommentRequest = {
        body: newCommentBody.trim(),
        version_id: versionId,
      };
      
      const response = await createComment(asset.asset_id, request);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      setNewCommentBody('');
      await loadComments();
    } catch (err) {
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleResolve = async (commentId: string) => {
    if (!canResolve) return;
    
    try {
      const response = await resolveComment(commentId);
      
      if (isErrorResponse(response)) {
        alert(response.error.message);
        return;
      }
      
      await loadComments();
    } catch (err) {
      alert('Failed to resolve comment');
    }
  };
  
  // Group comments by parent (threading)
  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const repliesByParent = comments
    .filter(c => c.parent_comment_id)
    .reduce((acc, reply) => {
      const parentId = reply.parent_comment_id!;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(reply);
      return acc;
    }, {} as Record<string, Comment[]>);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Comments ({comments.length})
      </Typography>
      
      {/* New Comment Form */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Add a comment... Use @username to mention someone"
          value={newCommentBody}
          onChange={(e) => setNewCommentBody(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSubmitComment}
            disabled={!newCommentBody.trim() || submitting}
          >
            Post Comment
          </Button>
        </Box>
      </Box>
      
      {/* Comments List */}
      {topLevelComments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No comments yet. Be the first to comment!
        </Typography>
      ) : (
        <List>
          {topLevelComments.map((comment) => (
            <Box key={comment.comment_id}>
              <ListItem
                sx={{
                  bgcolor: comment.resolved_at ? 'action.hover' : 'transparent',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemAvatar>
                  <Avatar>{comment.user_id.charAt(0).toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">{comment.user_id}</Typography>
                      {comment.resolved_at && (
                        <Chip
                          icon={<CheckCircle />}
                          label="Resolved"
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                        {comment.body}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(comment.created_at).toLocaleString()}
                      </Typography>
                      {comment.resolved_at && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          • Resolved by {comment.resolved_by} on {new Date(comment.resolved_at).toLocaleString()}
                        </Typography>
                      )}
                    </>
                  }
                />
                {canResolve && !comment.resolved_at && (
                  <Button
                    size="small"
                    onClick={() => handleResolve(comment.comment_id)}
                  >
                    Resolve
                  </Button>
                )}
              </ListItem>
              
              {/* Replies */}
              {repliesByParent[comment.comment_id]?.map((reply) => (
                <ListItem
                  key={reply.comment_id}
                  sx={{
                    pl: 8,
                    bgcolor: reply.resolved_at ? 'action.hover' : 'transparent',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {reply.user_id.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{reply.user_id}</Typography>
                        {reply.resolved_at && (
                          <Chip
                            icon={<CheckCircle />}
                            label="Resolved"
                            size="small"
                            color="success"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                          {reply.body}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reply.created_at).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  {canResolve && !reply.resolved_at && (
                    <Button
                      size="small"
                      onClick={() => handleResolve(reply.comment_id)}
                    >
                      Resolve
                    </Button>
                  )}
                </ListItem>
              ))}
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
}


