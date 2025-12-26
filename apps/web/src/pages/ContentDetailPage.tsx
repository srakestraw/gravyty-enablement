import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { track } from '../lib/telemetry';

// Fake data - will be replaced with API calls later
const fakeContentDetail: Record<string, any> = {
  '1': {
    title: 'Product Overview: Gravyty AI',
    description: 'Introduction to Gravyty AI capabilities and use cases',
    tags: ['AI', 'Product'],
    updatedAt: '2024-01-15',
    content: `
      # Gravyty AI Overview

      Gravyty AI is a powerful platform that helps organizations build better relationships with their stakeholders through intelligent automation and personalization.

      ## Key Features

      - **AI-Powered Personalization**: Automatically personalize communications at scale
      - **Relationship Intelligence**: Understand and track relationship strength
      - **Workflow Automation**: Streamline repetitive tasks
      - **Analytics & Insights**: Measure impact and optimize performance

      ## Use Cases

      - Fundraising for non-profits
      - Alumni engagement for universities
      - Donor relations for healthcare organizations
    `,
  },
  '2': {
    title: 'Sales Playbook: Enterprise Deals',
    description: 'Step-by-step guide for closing enterprise deals',
    tags: ['Sales', 'Playbook'],
    updatedAt: '2024-01-10',
    content: `
      # Enterprise Sales Playbook

      This playbook outlines the process for closing enterprise deals.

      ## Discovery Phase
      - Identify key stakeholders
      - Understand pain points
      - Map decision-making process

      ## Proposal Phase
      - Customize solution
      - Present ROI analysis
      - Address concerns

      ## Closing Phase
      - Negotiate terms
      - Finalize contract
      - Onboard customer
    `,
  },
  '3': {
    title: 'Customer Success: Onboarding Best Practices',
    description: 'Best practices for onboarding new customers',
    tags: ['CSM', 'Onboarding'],
    updatedAt: '2024-01-08',
    content: `
      # Onboarding Best Practices

      Effective onboarding sets the foundation for long-term customer success.

      ## Week 1: Setup
      - Complete technical setup
      - Schedule kickoff call
      - Assign success manager

      ## Week 2-4: Training
      - Product training sessions
      - Use case identification
      - Initial configuration

      ## Month 2-3: Optimization
      - Review performance
      - Identify improvements
      - Expand usage
    `,
  },
};

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const content = id ? fakeContentDetail[id] : null;

  useEffect(() => {
    track('page_view', { page: 'content_detail', contentId: id });
  }, [id]);

  if (!content) {
    return (
      <Box>
        <Typography variant="h4">Content not found</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/enablement/content')}>
          Back to Content
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/enablement/content')}
        sx={{ mb: 2 }}
      >
        Back to Content
      </Button>
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            {content.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {content.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {content.tags.map((tag: string) => (
              <Chip key={tag} label={tag} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Updated: {content.updatedAt}
          </Typography>
          <Divider sx={{ my: 3 }} />
          <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
            {content.content}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

