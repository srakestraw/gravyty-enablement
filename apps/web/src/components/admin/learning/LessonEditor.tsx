/**
 * Lesson Editor Component
 * 
 * Editor for lesson details supporting all lesson types
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  VideoLibrary as VideoIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { MediaSelectModal } from './MediaSelectModal';
import { useAdminMedia } from '../../../hooks/useAdminMedia';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Lesson, MediaRef, LessonContent, QuizQuestion } from '@gravyty/domain';
import type { NodeType } from '../../../types/courseTree';
import { v4 as uuidv4 } from 'uuid';

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
  const [lessonType, setLessonType] = useState<Lesson['type']>('video');
  const [content, setContent] = useState<LessonContent | null>(null);
  const [resources, setResources] = useState<MediaRef[]>([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);
  const [typeChangeDialogOpen, setTypeChangeDialogOpen] = useState(false);
  const [pendingType, setPendingType] = useState<Lesson['type'] | null>(null);

  // Refs for focus registry
  const titleRef = useRef<HTMLInputElement>(null);

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

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [lesson?.lesson_id]);

  // Initialize state from lesson
  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setDescription(lesson.description || '');
      setLessonType(lesson.type);
      setContent(lesson.content || null);
      setResources(lesson.resources || []);
    } else {
      setTitle('');
      setDescription('');
      setLessonType('video');
      setContent(null);
      setResources([]);
    }
  }, [lesson]);

  // Create default content for a lesson type
  const createDefaultContent = (type: Lesson['type']): LessonContent => {
    switch (type) {
      case 'video':
        return {
          kind: 'video',
          video_id: '',
          duration_seconds: 0,
          transcript: undefined,
        };
      case 'reading':
        return {
          kind: 'reading',
          format: 'markdown',
          markdown: '',
        };
      case 'quiz':
        return {
          kind: 'quiz',
          passing_score_percent: 70,
          allow_retry: false,
          show_answers_after_submit: false,
          questions: [],
        };
      case 'assignment':
        return {
          kind: 'assignment',
          instructions_markdown: '',
          submission_type: 'none',
          due_at: undefined,
        };
      case 'interactive':
        return {
          kind: 'interactive',
          provider: 'embed',
          embed_url: '',
          height_px: 600,
          allow_fullscreen: true,
        };
    }
  };

  const handleTypeChange = (newType: Lesson['type']) => {
    if (!lesson) return;

    // Check if current content has meaningful data
    const hasData = content && (
      (content.kind === 'video' && content.video_id) ||
      (content.kind === 'reading' && content.markdown.trim()) ||
      (content.kind === 'quiz' && content.questions.length > 0) ||
      (content.kind === 'assignment' && content.instructions_markdown.trim()) ||
      (content.kind === 'interactive' && content.embed_url)
    );

    if (hasData && lessonType !== newType) {
      setPendingType(newType);
      setTypeChangeDialogOpen(true);
    } else {
      applyTypeChange(newType);
    }
  };

  const applyTypeChange = (newType: Lesson['type']) => {
    setLessonType(newType);
    const newContent = createDefaultContent(newType);
    setContent(newContent);
    handleSave({ type: newType, content: newContent });
  };

  const handleSave = (overrides?: Partial<Lesson>) => {
    if (!lesson) return;

    const updates: Partial<Lesson> = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: lessonType,
      content: content || createDefaultContent(lessonType),
      resources: resources.length > 0 ? resources : undefined,
      ...overrides,
    };

    onUpdate(updates);
  };

  const handleContentChange = (newContent: LessonContent) => {
    setContent(newContent);
    handleSave({ content: newContent });
  };

  const handleAddResource = (mediaRef: MediaRef) => {
    if (!lesson) return;
    if (!resources.find((r) => r.media_id === mediaRef.media_id)) {
      const newResources = [...resources, mediaRef];
      setResources(newResources);
      handleSave({ resources: newResources });
    }
  };

  const handleRemoveResource = (mediaId: string) => {
    if (!lesson) return;
    const newResources = resources.filter((r) => r.media_id !== mediaId);
    setResources(newResources);
    handleSave({ resources: newResources });
  };

  // Video content editor
  const renderVideoEditor = () => {
    if (content?.kind !== 'video') return null;
    const videoContent = content;

    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Video Content
        </Typography>
        <TextField
          label="Video ID"
          value={videoContent.video_id}
          onChange={(e) => {
            handleContentChange({
              ...videoContent,
              video_id: e.target.value,
            });
          }}
          onBlur={() => {
            handleSave();
            if (markFieldTouched && lesson) {
              markFieldTouched('lesson', lesson.lesson_id, 'content.video_id');
            }
          }}
          fullWidth
          required
          error={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.video_id')}
          helperText={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.video_id') ? 'Video ID is required' : ''}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Duration (seconds)"
          type="number"
          value={videoContent.duration_seconds || ''}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            handleContentChange({
              ...videoContent,
              duration_seconds: isNaN(val) ? 0 : val,
            });
          }}
          onBlur={handleSave}
          fullWidth
          required
          error={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.duration_seconds')}
          helperText={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.duration_seconds') ? 'Duration must be > 0' : ''}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Transcript (optional)"
          value={videoContent.transcript || ''}
          onChange={(e) => {
            handleContentChange({
              ...videoContent,
              transcript: e.target.value || undefined,
            });
          }}
          onBlur={handleSave}
          multiline
          rows={5}
          fullWidth
        />
      </Paper>
    );
  };

  // Reading content editor
  const renderReadingEditor = () => {
    if (content?.kind !== 'reading') return null;
    const readingContent = content;

    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Reading Content
        </Typography>
        <TextField
          label="Markdown Content"
          value={readingContent.markdown}
          onChange={(e) => {
            handleContentChange({
              ...readingContent,
              markdown: e.target.value,
            });
          }}
          onBlur={() => {
            handleSave();
            if (markFieldTouched && lesson) {
              markFieldTouched('lesson', lesson.lesson_id, 'content.markdown');
            }
          }}
          multiline
          rows={15}
          fullWidth
          required
          error={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.markdown')}
          helperText={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.markdown') ? 'Markdown content is required' : ''}
        />
      </Paper>
    );
  };

  // Quiz content editor
  const renderQuizEditor = () => {
    if (content?.kind !== 'quiz') return null;
    const quizContent = content;

    const addQuestion = () => {
      const newQuestion: QuizQuestion = {
        question_id: uuidv4(),
        kind: 'single_choice',
        prompt: '',
        options: [
          { option_id: uuidv4(), text: '' },
          { option_id: uuidv4(), text: '' },
        ],
        correct_option_id: '',
        explanation: undefined,
      };
      handleContentChange({
        ...quizContent,
        questions: [...quizContent.questions, newQuestion],
      });
    };

    const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
      handleContentChange({
        ...quizContent,
        questions: quizContent.questions.map((q) =>
          q.question_id === questionId ? { ...q, ...updates } : q
        ),
      });
    };

    const deleteQuestion = (questionId: string) => {
      handleContentChange({
        ...quizContent,
        questions: quizContent.questions.filter((q) => q.question_id !== questionId),
      });
    };

    const addOption = (questionId: string) => {
      updateQuestion(questionId, {
        options: [
          ...quizContent.questions.find((q) => q.question_id === questionId)!.options,
          { option_id: uuidv4(), text: '' },
        ],
      });
    };

    const updateOption = (questionId: string, optionId: string, text: string) => {
      const question = quizContent.questions.find((q) => q.question_id === questionId);
      if (!question) return;
      updateQuestion(questionId, {
        options: question.options.map((opt) =>
          opt.option_id === optionId ? { ...opt, text } : opt
        ),
      });
    };

    const deleteOption = (questionId: string, optionId: string) => {
      const question = quizContent.questions.find((q) => q.question_id === questionId);
      if (!question || question.options.length <= 2) return;
      updateQuestion(questionId, {
        options: question.options.filter((opt) => opt.option_id !== optionId),
        correct_option_id: question.correct_option_id === optionId ? '' : question.correct_option_id,
      });
    };

    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2">Quiz Content</Typography>
          <Button startIcon={<AddIcon />} onClick={addQuestion} size="small">
            Add Question
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            label="Passing Score (%)"
            type="number"
            value={quizContent.passing_score_percent || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              handleContentChange({
                ...quizContent,
                passing_score_percent: isNaN(val) ? undefined : val,
              });
            }}
            onBlur={handleSave}
            sx={{ width: 200, mr: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={quizContent.allow_retry || false}
                onChange={(e) => {
                  handleContentChange({
                    ...quizContent,
                    allow_retry: e.target.checked,
                  });
                }}
              />
            }
            label="Allow Retry"
          />
          <FormControlLabel
            control={
              <Switch
                checked={quizContent.show_answers_after_submit || false}
                onChange={(e) => {
                  handleContentChange({
                    ...quizContent,
                    show_answers_after_submit: e.target.checked,
                  });
                }}
              />
            }
            label="Show Answers After Submit"
          />
        </Box>

        {quizContent.questions.map((question, qIndex) => (
          <Paper key={question.question_id} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2">Question {qIndex + 1}</Typography>
              <IconButton size="small" onClick={() => deleteQuestion(question.question_id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
            <TextField
              label="Question Prompt"
              value={question.prompt}
              onChange={(e) => updateQuestion(question.question_id, { prompt: e.target.value })}
              onBlur={handleSave}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" sx={{ mb: 1 }}>
              Options:
            </Typography>
            {question.options.map((option, optIndex) => (
              <Box key={option.option_id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <FormControlLabel
                  control={
                    <input
                      type="radio"
                      checked={question.correct_option_id === option.option_id}
                      onChange={() => updateQuestion(question.question_id, { correct_option_id: option.option_id })}
                    />
                  }
                  label=""
                />
                <TextField
                  value={option.text}
                  onChange={(e) => updateOption(question.question_id, option.option_id, e.target.value)}
                  onBlur={handleSave}
                  fullWidth
                  size="small"
                  placeholder={`Option ${optIndex + 1}`}
                />
                {question.options.length > 2 && (
                  <IconButton
                    size="small"
                    onClick={() => deleteOption(question.question_id, option.option_id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addOption(question.question_id)}
              sx={{ mt: 1 }}
            >
              Add Option
            </Button>
            <TextField
              label="Explanation (optional)"
              value={question.explanation || ''}
              onChange={(e) => updateQuestion(question.question_id, { explanation: e.target.value || undefined })}
              onBlur={handleSave}
              multiline
              rows={2}
              fullWidth
              sx={{ mt: 2 }}
            />
          </Paper>
        ))}
      </Paper>
    );
  };

  // Assignment content editor
  const renderAssignmentEditor = () => {
    if (content?.kind !== 'assignment') return null;
    const assignmentContent = content;

    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Assignment Content
        </Typography>
        <TextField
          label="Instructions (Markdown)"
          value={assignmentContent.instructions_markdown}
          onChange={(e) => {
            handleContentChange({
              ...assignmentContent,
              instructions_markdown: e.target.value,
            });
          }}
          onBlur={() => {
            handleSave();
            if (markFieldTouched && lesson) {
              markFieldTouched('lesson', lesson.lesson_id, 'content.instructions_markdown');
            }
          }}
          multiline
          rows={10}
          fullWidth
          required
          error={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.instructions_markdown')}
          helperText={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.instructions_markdown') ? 'Instructions are required' : ''}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Submission Type</InputLabel>
          <Select
            value={assignmentContent.submission_type}
            onChange={(e) => {
              handleContentChange({
                ...assignmentContent,
                submission_type: e.target.value as 'none' | 'text' | 'file' | 'link',
              });
            }}
            label="Submission Type"
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="file">File</MenuItem>
            <MenuItem value="link">Link</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Due Date (optional)"
          type="datetime-local"
          value={assignmentContent.due_at ? assignmentContent.due_at.slice(0, 16) : ''}
          onChange={(e) => {
            handleContentChange({
              ...assignmentContent,
              due_at: e.target.value ? new Date(e.target.value).toISOString() : undefined,
            });
          }}
          onBlur={handleSave}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Paper>
    );
  };

  // Interactive content editor
  const renderInteractiveEditor = () => {
    if (content?.kind !== 'interactive') return null;
    const interactiveContent = content;

    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Interactive Content
        </Typography>
        <TextField
          label="Embed URL"
          value={interactiveContent.embed_url}
          onChange={(e) => {
            handleContentChange({
              ...interactiveContent,
              embed_url: e.target.value,
            });
          }}
          onBlur={() => {
            handleSave();
            if (markFieldTouched && lesson) {
              markFieldTouched('lesson', lesson.lesson_id, 'content.embed_url');
            }
          }}
          fullWidth
          required
          error={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.embed_url')}
          helperText={lesson && shouldShowError && shouldShowError('lesson', lesson.lesson_id, 'content.embed_url') ? 'Embed URL is required' : ''}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Height (px)"
          type="number"
          value={interactiveContent.height_px || ''}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            handleContentChange({
              ...interactiveContent,
              height_px: isNaN(val) ? undefined : val,
            });
          }}
          onBlur={handleSave}
          sx={{ width: 200, mr: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={interactiveContent.allow_fullscreen !== false}
              onChange={(e) => {
                handleContentChange({
                  ...interactiveContent,
                  allow_fullscreen: e.target.checked,
                });
              }}
            />
          }
          label="Allow Fullscreen"
        />
      </Paper>
    );
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

        <FormControl fullWidth>
          <InputLabel>Lesson Type</InputLabel>
          <Select
            value={lessonType}
            onChange={(e) => handleTypeChange(e.target.value as Lesson['type'])}
            label="Lesson Type"
          >
            <MenuItem value="video">Video</MenuItem>
            <MenuItem value="reading">Reading</MenuItem>
            <MenuItem value="quiz">Quiz</MenuItem>
            <MenuItem value="assignment">Assignment</MenuItem>
            <MenuItem value="interactive">Interactive</MenuItem>
          </Select>
        </FormControl>

        {/* Type-specific editors */}
        {renderVideoEditor()}
        {renderReadingEditor()}
        {renderQuizEditor()}
        {renderAssignmentEditor()}
        {renderInteractiveEditor()}

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
          {resources.length > 0 ? (
            <List dense>
              {resources.map((resource) => (
                <ListItem key={resource.media_id}>
                  <ListItemIcon>
                    <AttachFileIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={resource.filename || resource.media_id}
                    secondary={resource.url}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleRemoveResource(resource.media_id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No resources attached
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Type change confirmation dialog */}
      <Dialog open={typeChangeDialogOpen} onClose={() => setTypeChangeDialogOpen(false)}>
        <DialogTitle>Change Lesson Type?</DialogTitle>
        <DialogContent>
          <Typography>
            Changing the lesson type will reset the content. Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeChangeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (pendingType) {
                applyTypeChange(pendingType);
                setTypeChangeDialogOpen(false);
                setPendingType(null);
              }
            }}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Media Selection Modals */}
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
