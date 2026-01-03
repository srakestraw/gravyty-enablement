/**
 * Assessment Card Component
 * 
 * Displays assessment status and controls on course detail page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { lmsApi } from '../../api/lmsClient';
import { isErrorResponse } from '../../lib/apiClient';

interface AssessmentCardProps {
  courseId: string;
  summary: {
    assessment_config: any;
    question_count: number;
    attempts: any[];
    best_score: number | null;
    latest_score: number | null;
    can_start_attempt: boolean;
    attempts_remaining: number | null;
  };
  onStartAttempt?: () => void;
}

export function AssessmentCard({ courseId, summary, onStartAttempt }: AssessmentCardProps) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const handleStartAttempt = async () => {
    if (onStartAttempt) {
      onStartAttempt();
      return;
    }

    setStarting(true);
    try {
      const res = await lmsApi.startAssessmentAttempt(courseId);
      if (isErrorResponse(res)) {
        alert(`Failed to start attempt: ${res.error.message}`);
      } else {
        navigate(`/enablement/learn/courses/${courseId}/assessment/${res.data.attempt.attempt_id}`);
      }
    } catch (err) {
      alert(`Failed to start attempt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setStarting(false);
    }
  };

  const { assessment_config, attempts, best_score, latest_score, can_start_attempt, attempts_remaining } = summary;
  const effectiveScore = assessment_config.score_mode === 'best' ? best_score : latest_score;
  const hasPassed = effectiveScore !== null && effectiveScore >= assessment_config.passing_score;
  const inProgressAttempt = attempts.find((a) => a.status === 'in_progress');

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <QuizIcon sx={{ mr: 1 }} />
          <Typography variant="h6">{assessment_config.title}</Typography>
        </Box>

        {assessment_config.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {assessment_config.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
          </Typography>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Passing Score: {assessment_config.passing_score}%
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Questions: {summary.question_count}
          </Typography>
          {attempts_remaining !== null && (
            <Typography variant="body2" color="text.secondary">
              Attempts Remaining: {attempts_remaining}
            </Typography>
          )}
        </Box>

        {effectiveScore !== null && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {assessment_config.score_mode === 'best' ? 'Best Score' : 'Latest Score'}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {effectiveScore}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={effectiveScore}
              color={hasPassed ? 'success' : 'primary'}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {hasPassed ? (
                <Chip icon={<CheckCircleIcon />} label="Passed" color="success" size="small" />
              ) : (
                <Chip icon={<CancelIcon />} label="Not Passed" color="error" size="small" />
              )}
            </Box>
          </Box>
        )}

        {inProgressAttempt ? (
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate(`/enablement/learn/courses/${courseId}/assessment/${inProgressAttempt.attempt_id}`)}
          >
            Continue Assessment
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={handleStartAttempt}
            disabled={!can_start_attempt || starting}
          >
            {starting ? 'Starting...' : can_start_attempt ? 'Start Assessment' : 'Max Attempts Reached'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


