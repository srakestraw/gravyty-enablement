/**
 * Assessment Page
 * 
 * Full page for taking an assessment
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { lmsApi } from '../../api/lmsClient';
import { isErrorResponse } from '../../lib/apiClient';

export function AssessmentPage() {
  const { courseId, attemptId } = useParams<{ courseId: string; attemptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selected_option_id?: string; boolean_answer?: boolean }>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId && attemptId) {
      loadAssessment();
    }
  }, [courseId, attemptId]);

  const loadAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get attempt
      const attemptRes = await lmsApi.getAttemptResults(courseId!, attemptId!);
      if (isErrorResponse(attemptRes)) {
        setError(attemptRes.error.message);
        return;
      }

      setAttempt(attemptRes.data.attempt);
      
      // Questions are included in attempt response for in-progress attempts
      if (attemptRes.data.questions) {
        setQuestions(attemptRes.data.questions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!courseId || !attemptId) return;

    // Validate required questions
    const requiredQuestions = questions.filter((q) => q.is_required);
    for (const question of requiredQuestions) {
      if (!answers[question.question_id]) {
        alert(`Please answer required question: ${question.prompt.substring(0, 50)}...`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        ...answer,
      }));

      const res = await lmsApi.submitAssessmentAttempt(courseId, attemptId, answersArray);
      if (isErrorResponse(res)) {
        setError(res.error.message);
      } else {
        // Navigate to results
        navigate(`/enablement/learn/courses/${courseId}/assessment/${attemptId}/results`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!attempt) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Assessment attempt not found.</Alert>
      </Box>
    );
  }

  if (attempt.status !== 'in_progress') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          This assessment attempt has been {attempt.status === 'graded' ? 'completed' : 'submitted'}.
          {attempt.status === 'graded' && (
            <Button
              sx={{ ml: 2 }}
              onClick={() => navigate(`/enablement/learn/courses/${courseId}/assessment/${attemptId}/results`)}
            >
              View Results
            </Button>
          )}
        </Alert>
      </Box>
    );
  }

  if (questions.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No questions available for this assessment.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Assessment
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        {questions.map((question, index) => (
          <Box key={question.question_id} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {index + 1}. {question.prompt.replace(/<[^>]*>/g, '')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {question.points} point{question.points !== 1 ? 's' : ''}
              {question.is_required && ' • Required'}
            </Typography>

            {question.type === 'multiple_choice' ? (
              <FormControl component="fieldset">
                <RadioGroup
                  value={answers[question.question_id]?.selected_option_id || ''}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      [question.question_id]: { selected_option_id: e.target.value },
                    })
                  }
                >
                  {question.options?.map((option: any) => (
                    <FormControlLabel
                      key={option.option_id}
                      value={option.option_id}
                      control={<Radio />}
                      label={option.label.replace(/<[^>]*>/g, '')}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            ) : (
              <FormControl component="fieldset">
                <RadioGroup
                  value={
                    answers[question.question_id]?.boolean_answer === undefined
                      ? ''
                      : answers[question.question_id]?.boolean_answer
                        ? 'true'
                        : 'false'
                  }
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      [question.question_id]: { boolean_answer: e.target.value === 'true' },
                    })
                  }
                >
                  <FormControlLabel value="true" control={<Radio />} label="True" />
                  <FormControlLabel value="false" control={<Radio />} label="False" />
                </RadioGroup>
              </FormControl>
            )}
          </Box>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

