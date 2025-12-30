/**
 * Ask AI Hub Page
 * 
 * Landing page for the Ask AI module with tiles for Chat and Saved Answers.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
} from '@mui/material';
import {
  ChatOutlined,
  BookmarksOutlined,
  ArrowForwardOutlined,
} from '@mui/icons-material';
import { PlaceholderPage } from '../components/shared/PlaceholderPage';
import { track } from '../lib/telemetry';
import { useAuth } from '../contexts/AuthContext';

interface HubTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  comingSoon?: boolean;
}

function HubTile({ title, description, icon, path, comingSoon = false }: HubTileProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!comingSoon) {
      navigate(path);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: comingSoon ? 0.7 : 1,
        cursor: comingSoon ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': comingSoon ? {} : {
          bgcolor: 'action.hover',
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea
        onClick={handleClick}
        disabled={comingSoon}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mr: 2,
              }}
            >
              {icon}
            </Box>
            {comingSoon && (
              <Chip
                label="Coming soon"
                size="small"
                color="default"
                sx={{ ml: 'auto' }}
              />
            )}
          </Box>
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          {!comingSoon && (
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', mt: 'auto' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Open
              </Typography>
              <ArrowForwardOutlined sx={{ ml: 0.5, fontSize: 16 }} />
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function AskAIHubPage() {
  const { user } = useAuth();

  useEffect(() => {
    track('ask_ai_hub_viewed', {
      user_id: user?.userId,
      role: user?.role,
      auth_mode: user?.authMode,
    });
  }, [user]);

  return (
    <PlaceholderPage
      title="Ask AI"
      description="Get instant answers powered by AI and verified knowledge sources"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Chat"
            description="Ask questions and get AI-powered answers"
            icon={<ChatOutlined />}
            path="/enablement/ai/chat"
            comingSoon
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Saved Answers"
            description="View and manage your saved AI answers"
            icon={<BookmarksOutlined />}
            path="/enablement/ai/saved"
            comingSoon
          />
        </Grid>
      </Grid>
    </PlaceholderPage>
  );
}



