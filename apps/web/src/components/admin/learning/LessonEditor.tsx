/**
 * Lesson Editor Component
 * 
 * Editor for lesson details including transcript and resources
 */

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { MediaSelectModal } from './MediaSelectModal';
import { useAdminMedia } from '../../../hooks/useAdminMedia';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Lesson, MediaRef } from '@gravyty/domain';
import type { NodeType } from '../../../types/courseTree';

export interface LessonEditorProps {
  lesson: Lesson | null;
  onUpdate: (updates: Partial<Lesson>) => void;
  courseId?: string;
  shouldShowError?: (entityType: NodeType, entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: NodeType, entityId: string, fieldKey: string) => void;
}

export function LessonEditor({ lesson, onUpdate, courseId, shouldShowError, markFieldTouched }: LessonEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>();
  const [transcriptFullText, setTranscriptFullText] = useState('');
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);
  const [posterModalOpen, setPosterModalOpen] = useState(false);

  // Refs for focus registry
  const titleRef = useRef<HTMLInputElement>(null);
  const videoMediaRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);

  // Fetch media details for resources
  const { data: allMedia } = useAdminMedia();

  // Register lesson fields with focus registry
  useEffect(() => {
    if (!lesson) return;

    const unregisters: Array<() => void> = [];

    if (titleRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'lesson',
        entityId: lesson.lesson_id,
        fieldKey: 'title',
        ref: titleRef,
      }));
    }

    if (videoMediaRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'lesson',
        entityId: lesson.lesson_id,
        fieldKey: 'video_media',
        ref: videoMediaRef,
      }));
    }

    if (transcriptRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'lesson',
        entityId: lesson.lesson_id,
        fieldKey: 'transcript.full_text',
        ref: transcriptRef,
      }));
    }

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [lesson?.lesson_id]);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setDescription(lesson.description || '');
      setDurationSeconds(lesson.estimated_duration_minutes ? lesson.estimated_duration_minutes * 60 : undefined);
      setTranscriptFullText(lesson.transcript?.full_text || '');
    } else {
      setTitle('');
      setDescription('');
      setDurationSeconds(undefined);
      setTranscriptFullText('');
    }
  }, [lesson]);

  const handleSave = () => {
    if (!lesson) return;

    const updates: Partial<Lesson> = {
      title: title.trim(),
      description: description.trim() || undefined,
      estimated_duration_minutes: durationSeconds ? Math.round(durationSeconds / 60) : undefined,
    };

    if (transcriptFullText.trim()) {
      updates.transcript = {
        ...lesson.transcript,
        full_text: transcriptFullText.trim(),
        segments: lesson.transcript?.segments || [],
      };
    } else if (lesson.transcript) {
      updates.transcript = {
        ...lesson.transcript,
        full_text: undefined,
      };
    }

    onUpdate(updates);
  };

  const handleMediaSelect = (mediaRef: MediaRef) => {
    if (!lesson) return;
    onUpdate({
      video_media: {
        media_id: mediaRef.media_id,
        url: mediaRef.url,
      },
    });
  };

  const handleAddResource = (mediaRef: MediaRef) => {
    if (!lesson) return;
    const currentRefs = lesson.resource_refs || [];
    if (!currentRefs.includes(mediaRef.media_id)) {
      onUpdate({
        resource_refs: [...currentRefs, mediaRef.media_id],
      });
    }
  };

  // Get media details for resource_refs
  const getResourceMedia = (mediaId: string) => {
    return allMedia?.find((m: any) => m.media_id === mediaId);
  };

  const handleRemoveResource = (mediaId: string) => {
    if (!lesson) return;
    const currentRefs = lesson.resource_refs || [];
    onUpdate({
      resource_refs: currentRefs.filter((id) => id !== mediaId),
    });
  };

  if (!lesson) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Select a lesson from the outline to edit
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Edit Lesson
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          inputRef={titleRef}
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            handleSave();
            if (markFieldTouched && lesson) {
              markFieldTouched('lesson', lesson.lesson_id, 'title');
            }
          }}
          required
          fullWidth
          error={lesson && shouldShowError && (!title || title.trim() === '') && shouldShowError('lesson', lesson.lesson_id, 'title')}
          helperText={lesson && shouldShowError && (!title || title.trim() === '') && shouldShowError('lesson', lesson.lesson_id, 'title') ? 'Lesson title is required' : ''}
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleSave}
          multiline
          rows={3}
          fullWidth
        />

        <TextField
          label="Duration (seconds)"
          type="number"
          value={durationSeconds || ''}
          onChange={(e) => {
            const val = e.target.value;
            setDurationSeconds(val ? parseInt(val, 10) : undefined);
          }}
          onBlur={handleSave}
          fullWidth
          helperText="Optional: Estimated duration in seconds"
        />

        {/* Video Media */}
        <Paper ref={videoMediaRef} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Video Media</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<VideoIcon />}
              onClick={() => setMediaModalOpen(true)}
            >
              {lesson.video_media ? 'Change Video' : 'Attach Video'}
            </Button>
          </Box>
          {lesson.video_media ? (
            <Box>
              <Chip
                label={lesson.video_media.filename || lesson.video_media.media_id}
                onDelete={() => onUpdate({ video_media: undefined })}
                color="primary"
                sx={{ mb: 1 }}
              />
              {lesson.video_media.url && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {lesson.video_media.url}
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No video attached
              </Typography>
              {lesson.type === 'video' && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'video_media') && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Video lesson must have a video media reference
                </Alert>
              )}
            </Box>
          )}
        </Paper>

        {/* Resources */}
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Resources</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AttachFileIcon />}
              onClick={() => setResourcesModalOpen(true)}
            >
              Add Resource
            </Button>
          </Box>
          {lesson.resource_refs && lesson.resource_refs.length > 0 ? (
            <List dense>
              {lesson.resource_refs.map((mediaId) => {
                const media = getResourceMedia(mediaId);
                return (
                  <ListItem key={mediaId}>
                    <ListItemIcon>
                      <AttachFileIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={media?.filename || mediaId}
                      secondary={media?.created_at ? new Date(media.created_at).toLocaleDateString() : ''}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveResource(mediaId)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No resources attached
            </Typography>
          )}
        </Paper>

        {/* Transcript */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Transcript
          </Typography>
          <TextField
            inputRef={transcriptRef}
            label="Full Transcript Text"
            value={transcriptFullText}
            onChange={(e) => setTranscriptFullText(e.target.value)}
            onBlur={() => {
              handleSave();
              if (markFieldTouched && lesson) {
                markFieldTouched('lesson', lesson.lesson_id, 'transcript.full_text');
              }
            }}
            multiline
            rows={10}
            fullWidth
            helperText="Optional: Full transcript text for search and accessibility"
            error={lesson && shouldShowError && transcriptFullText !== undefined && transcriptFullText.trim() === '' && lesson.transcript?.full_text !== undefined && shouldShowError('lesson', lesson.lesson_id, 'transcript.full_text')}
          />
        </Paper>
      </Box>

      {/* Media Selection Modals */}
      <MediaSelectModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={handleMediaSelect}
        mediaType="video"
        title="Select or Upload Video"
        courseId={courseId}
        lessonId={lesson?.lesson_id}
      />

      <MediaSelectModal
        open={resourcesModalOpen}
        onClose={() => setResourcesModalOpen(false)}
        onSelect={handleAddResource}
        mediaType="attachment"
        title="Select or Upload Resource"
        courseId={courseId}
        lessonId={lesson?.lesson_id}
      />
    </Box>
  );
}

