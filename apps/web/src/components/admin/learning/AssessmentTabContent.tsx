/**
 * Assessment Tab Content Component
 * 
 * Admin UI for authoring course assessments
 */

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { isErrorResponse } from '../../../lib/apiClient';
import { RichTextEditor } from '../../common/RichTextEditor';
import type { Course } from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';

export interface AssessmentTabContentProps {
  course: Course;
}

interface AssessmentQuestion {
  question_id?: string;
  type: 'multiple_choice' | 'true_false';
  prompt: string;
  points: number;
  order_index: number;
  is_required: boolean;
  correct_boolean_answer?: boolean;
  options?: Array<{
    option_id?: string;
    label: string;
    order_index: number;
    is_correct: boolean;
  }>;
}

export function AssessmentTabContent({ course }: AssessmentTabContentProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessment();
  }, [course.course_id]);

  const loadAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const configRes = await lmsAdminApi.getAssessmentConfig(course.course_id);
      if (isErrorResponse(configRes)) {
        if (configRes.error.code === 'NOT_FOUND') {
          setConfig(null);
        } else {
          setError(configRes.error.message);
        }
      } else {
        setConfig(configRes.data.config);
      }

      const questionsRes = await lmsAdminApi.getAssessmentQuestions(course.course_id);
      if (!isErrorResponse(questionsRes)) {
        setQuestions(questionsRes.data.questions || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: any) => {
    setSaving(true);
    setError(null);
    try {
      const newConfig = { ...config, ...updates };
      const res = await lmsAdminApi.saveAssessmentConfig(course.course_id, newConfig);
      if (isErrorResponse(res)) {
        setError(res.error.message);
      } else {
        setConfig(res.data.config);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assessment config');
    } finally {
      setSaving(false);
    }
  };

  const saveQuestions = async (updatedQuestions: AssessmentQuestion[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await lmsAdminApi.saveAssessmentQuestions(course.course_id, updatedQuestions);
      if (isErrorResponse(res)) {
        setError(res.error.message);
      } else {
        setQuestions(res.data.questions || []);
        setQuestionDialogOpen(false);
        setEditingQuestion(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      type: 'multiple_choice',
      prompt: '',
      points: 1,
      order_index: questions.length,
      is_required: true,
      options: [],
    });
    setQuestionDialogOpen(true);
  };

  const handleEditQuestion = (question: AssessmentQuestion) => {
    setEditingQuestion({ ...question });
    setQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    const updated = questions.filter((q) => q.question_id !== questionId);
    await saveQuestions(updated.map((q, i) => ({ ...q, order_index: i })));
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const updated = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    await saveQuestions(updated.map((q, i) => ({ ...q, order_index: i })));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentConfig = config || {
    is_enabled: false,
    title: 'Assessment',
    description: '',
    passing_score: 80,
    score_mode: 'best' as const,
    max_attempts: null,
    required_for_completion: false,
    is_certification: false,
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h5" gutterBottom>
        Assessment Settings
      </Typography>

      {/* Config Panel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={currentConfig.is_enabled}
              onChange={(e) => saveConfig({ is_enabled: e.target.checked })}
              disabled={saving}
            />
          }
          label="Enable Assessment"
        />

        {currentConfig.is_enabled && (
          <>
            <TextField
              fullWidth
              label="Title"
              value={currentConfig.title}
              onChange={(e) => saveConfig({ title: e.target.value })}
              disabled={saving}
              sx={{ mt: 2 }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Description
              </Typography>
              <RichTextEditor
                value={currentConfig.description || ''}
                onChange={(html) => saveConfig({ description: html })}
                disabled={saving}
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography gutterBottom>
                Passing Score: {currentConfig.passing_score}%
              </Typography>
              <Slider
                value={currentConfig.passing_score}
                onChange={(_, value) => saveConfig({ passing_score: value as number })}
                min={0}
                max={100}
                step={1}
                disabled={saving}
              />
            </Box>

            <FormControl sx={{ mt: 3 }}>
              <FormLabel>Score Mode</FormLabel>
              <RadioGroup
                value={currentConfig.score_mode}
                onChange={(e) => saveConfig({ score_mode: e.target.value })}
              >
                <FormControlLabel value="best" control={<Radio />} label="Best Score" />
                <FormControlLabel value="latest" control={<Radio />} label="Latest Score" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label="Max Attempts (leave empty for unlimited)"
              type="number"
              value={currentConfig.max_attempts || ''}
              onChange={(e) =>
                saveConfig({
                  max_attempts: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              disabled={saving}
              sx={{ mt: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={currentConfig.required_for_completion}
                  onChange={(e) => saveConfig({ required_for_completion: e.target.checked })}
                  disabled={saving}
                />
              }
              label="Required for Course Completion"
              sx={{ mt: 2, display: 'block' }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={currentConfig.is_certification}
                  onChange={(e) => saveConfig({ is_certification: e.target.checked })}
                  disabled={saving}
                />
              }
              label="Certification Course"
              sx={{ mt: 1, display: 'block' }}
            />
          </>
        )}
      </Paper>

      {/* Questions Panel */}
      {currentConfig.is_enabled && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Questions</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddQuestion}
              disabled={saving}
            >
              Add Question
            </Button>
          </Box>

          {questions.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No questions yet. Add your first question to get started.
            </Typography>
          ) : (
            <List>
              {questions
                .sort((a, b) => a.order_index - b.order_index)
                .map((question, index) => (
                  <ListItem
                    key={question.question_id || index}
                    secondaryAction={
                      <Box>
                        <IconButton
                          onClick={() => handleMoveQuestion(index, 'up')}
                          disabled={index === 0 || saving}
                        >
                          <ArrowUpIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleMoveQuestion(index, 'down')}
                          disabled={index === questions.length - 1 || saving}
                        >
                          <ArrowDownIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleEditQuestion(question)}
                          disabled={saving}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteQuestion(question.question_id!)}
                          disabled={saving}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={`${index + 1}. ${question.prompt.substring(0, 50)}...`}
                      secondary={`${question.type} • ${question.points} point${question.points !== 1 ? 's' : ''}`}
                    />
                  </ListItem>
                ))}
            </List>
          )}
        </Paper>
      )}

      {/* Question Editor Dialog */}
      <QuestionEditorDialog
        open={questionDialogOpen}
        question={editingQuestion}
        onClose={() => {
          setQuestionDialogOpen(false);
          setEditingQuestion(null);
        }}
        onSave={async (question) => {
          const updated = editingQuestion?.question_id
            ? questions.map((q) =>
                q.question_id === editingQuestion.question_id ? question : q
              )
            : [...questions, { ...question, question_id: `question_${uuidv4()}` }];
          await saveQuestions(updated);
        }}
        saving={saving}
      />
    </Box>
  );
}

function QuestionEditorDialog({
  open,
  question,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  question: AssessmentQuestion | null;
  onSave: (question: AssessmentQuestion) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [type, setType] = useState<'multiple_choice' | 'true_false'>('multiple_choice');
  const [prompt, setPrompt] = useState('');
  const [points, setPoints] = useState(1);
  const [isRequired, setIsRequired] = useState(true);
  const [correctBooleanAnswer, setCorrectBooleanAnswer] = useState<boolean>(true);
  const [options, setOptions] = useState<Array<{ option_id?: string; label: string; order_index: number; is_correct: boolean }>>([]);

  useEffect(() => {
    if (question) {
      setType(question.type);
      setPrompt(question.prompt);
      setPoints(question.points);
      setIsRequired(question.is_required);
      setCorrectBooleanAnswer(question.correct_boolean_answer ?? true);
      setOptions(question.options || []);
    } else {
      setType('multiple_choice');
      setPrompt('');
      setPoints(1);
      setIsRequired(true);
      setCorrectBooleanAnswer(true);
      setOptions([]);
    }
  }, [question]);

  const handleSave = () => {
    if (!prompt.trim()) {
      alert('Please enter a question prompt');
      return;
    }

    if (type === 'multiple_choice' && options.length < 2) {
      alert('Multiple choice questions need at least 2 options');
      return;
    }

    if (type === 'multiple_choice' && !options.some((o) => o.is_correct)) {
      alert('Please mark at least one option as correct');
      return;
    }

    onSave({
      ...question,
      type,
      prompt,
      points,
      is_required: isRequired,
      correct_boolean_answer: type === 'true_false' ? correctBooleanAnswer : undefined,
      options: type === 'multiple_choice' ? options : undefined,
      order_index: question?.order_index ?? 0,
    });
  };

  const addOption = () => {
    setOptions([
      ...options,
      {
        option_id: `option_${uuidv4()}`,
        label: '',
        order_index: options.length,
        is_correct: false,
      },
    ]);
  };

  const updateOption = (index: number, updates: Partial<typeof options[0]>) => {
    const updated = [...options];
    updated[index] = { ...updated[index], ...updates };
    setOptions(updated);
  };

  const deleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order_index: i })));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{question?.question_id ? 'Edit Question' : 'Add Question'}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <FormLabel>Question Type</FormLabel>
          <RadioGroup value={type} onChange={(e) => setType(e.target.value as any)}>
            <FormControlLabel value="multiple_choice" control={<Radio />} label="Multiple Choice" />
            <FormControlLabel value="true_false" control={<Radio />} label="True/False" />
          </RadioGroup>
        </FormControl>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            Question Prompt
          </Typography>
          <RichTextEditor value={prompt} onChange={setPrompt} disabled={saving} />
        </Box>

        <TextField
          fullWidth
          label="Points"
          type="number"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value, 10) || 1)}
          disabled={saving}
          sx={{ mt: 2 }}
        />

        <FormControlLabel
          control={<Switch checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />}
          label="Required"
          sx={{ mt: 2, display: 'block' }}
        />

        {type === 'true_false' ? (
          <FormControl sx={{ mt: 3 }}>
            <FormLabel>Correct Answer</FormLabel>
            <RadioGroup
              value={correctBooleanAnswer ? 'true' : 'false'}
              onChange={(e) => setCorrectBooleanAnswer(e.target.value === 'true')}
            >
              <FormControlLabel value="true" control={<Radio />} label="True" />
              <FormControlLabel value="false" control={<Radio />} label="False" />
            </RadioGroup>
          </FormControl>
        ) : (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2">Options</Typography>
              <Button size="small" onClick={addOption} disabled={saving}>
                Add Option
              </Button>
            </Box>
            {options.map((option, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={option.label}
                  onChange={(e) => updateOption(index, { label: e.target.value })}
                  placeholder="Option text"
                />
                <FormControlLabel
                  control={
                    <Radio
                      checked={option.is_correct}
                      onChange={() => {
                        // Only one correct answer
                        setOptions(
                          options.map((o, i) => ({
                            ...o,
                            is_correct: i === index,
                          }))
                        );
                      }}
                    />
                  }
                  label="Correct"
                />
                <IconButton onClick={() => deleteOption(index)} size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


