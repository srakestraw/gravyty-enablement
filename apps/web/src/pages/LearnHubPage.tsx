/**
 * Learn Hub Page
 * 
 * Landing page for the Learn module with tiles for Courses, Certifications, Assignments, etc.
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
  MenuBookOutlined,
  WorkspacePremiumOutlined,
  AssignmentOutlined,
  SchoolOutlined,
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

export function LearnHubPage() {
  const { user } = useAuth();

  useEffect(() => {
    track('learn_hub_viewed', {
      user_id: user?.userId,
      role: user?.role,
      auth_mode: user?.authMode,
    });
  }, [user]);

  return (
    <PlaceholderPage
      title="Learn"
      description="Access courses, certifications, learning paths, and assignments"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Courses"
            description="Browse and access enablement courses"
            icon={<MenuBookOutlined />}
            path="/enablement/learn/courses"
            comingSoon
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Certifications"
            description="View available certifications and track your progress"
            icon={<WorkspacePremiumOutlined />}
            path="/enablement/learn/certifications"
            comingSoon
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Assignments"
            description="View and complete assigned learning tasks"
            icon={<AssignmentOutlined />}
            path="/enablement/learn/assignments"
            comingSoon
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="My Learning"
            description="Track your learning progress and achievements"
            icon={<SchoolOutlined />}
            path="/enablement/learn/my"
            comingSoon
          />
        </Grid>
      </Grid>
    </PlaceholderPage>
  );
}


