/**
 * Admin Hub Page
 * 
 * Landing page for Admin module with tiles for Users and Roles, Governance, Integrations, etc.
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
  Divider,
} from '@mui/material';
import {
  ManageAccountsOutlined,
  PolicyOutlined,
  HubOutlined,
  HealthAndSafetyOutlined,
  FactCheckOutlined,
  MenuBookOutlined,
  AltRouteOutlined,
  AssignmentIndOutlined,
  WorkspacePremiumOutlined,
  PermMediaOutlined,
  CategoryOutlined,
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
}

function HubTile({ title, description, icon, path }: HubTileProps) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          bgcolor: 'action.hover',
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(path)}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
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
              mb: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', mt: 'auto' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Open
            </Typography>
            <ArrowForwardOutlined sx={{ ml: 0.5, fontSize: 16 }} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function AdminHubPage() {
  const { user } = useAuth();

  useEffect(() => {
    track('admin_hub_viewed', {
      user_id: user?.userId,
      role: user?.role,
      auth_mode: user?.authMode,
    });
  }, [user]);

  return (
    <PlaceholderPage
      title="Admin"
      description="Manage users, governance, integrations, and system settings"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Users and Roles"
            description="Manage user accounts and role assignments"
            icon={<ManageAccountsOutlined />}
            path="/enablement/admin/users"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Governance"
            description="Configure governance policies and rules"
            icon={<PolicyOutlined />}
            path="/enablement/admin/governance"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Integrations"
            description="Manage third-party integrations and connections"
            icon={<HubOutlined />}
            path="/enablement/admin/integrations"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="System Health"
            description="Monitor system status and health metrics"
            icon={<HealthAndSafetyOutlined />}
            path="/enablement/admin/health"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Audit Log"
            description="View system audit logs and activity history"
            icon={<FactCheckOutlined />}
            path="/enablement/admin/audit"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Learning Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage courses, learning paths, assignments, certificates, and media assets
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Courses"
            description="Manage courses, create new content, and configure course settings"
            icon={<MenuBookOutlined />}
            path="/enablement/admin/learning/courses"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Learning Paths"
            description="Create and manage structured learning paths"
            icon={<AltRouteOutlined />}
            path="/enablement/admin/learning/paths"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Assignments"
            description="Manage course assignments and track submissions"
            icon={<AssignmentIndOutlined />}
            path="/enablement/admin/learning/assignments"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Certificate Templates"
            description="Design and manage certificate templates"
            icon={<WorkspacePremiumOutlined />}
            path="/enablement/admin/learning/certificates"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Media Library"
            description="Manage media assets for courses and learning content"
            icon={<PermMediaOutlined />}
            path="/enablement/admin/learning/media"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Lists"
            description="Manage controlled values used across Courses and Resources"
            icon={<CategoryOutlined />}
            path="/enablement/admin/taxonomy"
          />
        </Grid>
      </Grid>
    </PlaceholderPage>
  );
}


