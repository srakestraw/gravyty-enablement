/**
 * Assets Hub Page
 * 
 * Landing page for the Assets module with tiles for Asset Library, Kits, Brand and Messaging, etc.
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
  Inventory2Outlined,
  ViewModuleOutlined,
  CampaignOutlined,
  UpdateOutlined,
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

export function AssetsHubPage() {
  const { user } = useAuth();

  useEffect(() => {
    track('assets_hub_viewed', {
      user_id: user?.userId,
      role: user?.role,
      auth_mode: user?.authMode,
    });
  }, [user]);

  return (
    <PlaceholderPage
      title="Assets"
      description="Access enablement assets, kits, brand materials, and updates"
    >
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Asset Library"
            description="Browse and search enablement assets"
            icon={<Inventory2Outlined />}
            path="/enablement/assets/library"
            comingSoon
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Kits"
            description="Curated collections of enablement assets"
            icon={<ViewModuleOutlined />}
            path="/enablement/assets/kits"
            comingSoon
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Brand and Messaging"
            description="Access brand guidelines and messaging resources"
            icon={<CampaignOutlined />}
            path="/enablement/assets/brand"
            comingSoon
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <HubTile
            title="Updates and Expiring"
            description="View recent updates and expiring content"
            icon={<UpdateOutlined />}
            path="/enablement/assets/updates"
            comingSoon
          />
        </Grid>
      </Grid>
    </PlaceholderPage>
  );
}



