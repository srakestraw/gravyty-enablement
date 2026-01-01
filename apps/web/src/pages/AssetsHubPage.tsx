/**
 * Content Hub Page
 * 
 * Landing page for the Content Hub with pinned, recently updated, expiring soon sections,
 * and tiles for Asset Library, Kits, Brand and Messaging, etc.
 */

import { useEffect } from 'react';
import { PlaceholderPage } from '../components/shared/PlaceholderPage';
import { track } from '../lib/telemetry';
import { useAuth } from '../contexts/AuthContext';
import { ContentHubLandingPage } from './content-hub/ContentHubLandingPage';

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
    track('content_hub_viewed', {
      user_id: user?.userId,
      role: user?.role,
      auth_mode: user?.authMode,
    });
  }, [user]);

  // Show Content Hub landing page
  return <ContentHubLandingPage />;
}




