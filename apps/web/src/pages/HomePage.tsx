/**
 * Home Page
 * 
 * Welcome page with quick access to main features
 */

import { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons/Icon';
import { track } from '../lib/telemetry';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin' || import.meta.env.VITE_DEV_ROLE === 'Admin';

  useEffect(() => {
    track('home_viewed');
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Enablement
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Access analytics and insights from your enablement platform
        </Typography>
      </Box>

      {/* Quick Access Cards */}
      <Grid container spacing={3}>
        {isAdmin && (
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{ height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => navigate('/enablement/analytics')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Icon name="analytics" size={48} color="primary.main" sx={{ mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View usage analytics and insights
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{ 
              height: '100%', 
              opacity: 0.6,
              cursor: 'not-allowed',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Icon name="sparkles" size={48} color="text.secondary" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  AI Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Coming soon
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
