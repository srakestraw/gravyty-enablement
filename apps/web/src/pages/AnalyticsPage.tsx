import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { apiFetch, isErrorResponse } from '../lib/apiClient';
import { track } from '../lib/telemetry';

interface AnalyticsOverview {
  active_users: number;
  total_events: number;
  views: number;
  downloads: number;
  notification_clicks: number;
  days: number;
}

interface ContentAnalytics {
  content_id: string;
  views: number;
  downloads: number;
  notification_clicks: number;
}

interface UserAnalytics {
  user_id: string;
  event_count: number;
  last_seen: string;
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [contentStats, setContentStats] = useState<ContentAnalytics[]>([]);
  const [userStats, setUserStats] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    track('page_view', { page: 'analytics' });
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load overview
      const overviewResponse = await apiFetch<AnalyticsOverview>(`/v1/analytics/overview?days=${days}`);
      if (isErrorResponse(overviewResponse)) {
        setError(overviewResponse.error.message);
        setLoading(false);
        return;
      }
      setOverview(overviewResponse.data);

      // Load content analytics
      const contentResponse = await apiFetch<{ items: ContentAnalytics[] }>(`/v1/analytics/content?days=${days}`);
      if (!isErrorResponse(contentResponse)) {
        setContentStats(contentResponse.data.items);
      }

      // Load user analytics
      const userResponse = await apiFetch<{ items: UserAnalytics[] }>(`/v1/analytics/users?days=${days}`);
      if (!isErrorResponse(userResponse)) {
        setUserStats(userResponse.data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
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
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load analytics: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Usage analytics and insights from the last {days} days
          </Typography>
        </Box>
        <Chip label={`Last ${days} days`} color="primary" />
      </Box>

      {overview && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Active Users
                </Typography>
                <Typography variant="h4">{overview.active_users}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Total Events
                </Typography>
                <Typography variant="h4">{overview.total_events}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Views
                </Typography>
                <Typography variant="h4">{overview.views}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Downloads
                </Typography>
                <Typography variant="h4">{overview.downloads}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Content (by Downloads)
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Content ID</TableCell>
                      <TableCell align="right">Views</TableCell>
                      <TableCell align="right">Downloads</TableCell>
                      <TableCell align="right">Clicks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contentStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No content analytics available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contentStats.map((stat) => (
                        <TableRow key={stat.content_id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {stat.content_id.substring(0, 20)}...
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{stat.views}</TableCell>
                          <TableCell align="right">
                            <strong>{stat.downloads}</strong>
                          </TableCell>
                          <TableCell align="right">{stat.notification_clicks}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Active Users
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User ID</TableCell>
                      <TableCell align="right">Events</TableCell>
                      <TableCell>Last Seen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No user analytics available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      userStats.map((stat) => (
                        <TableRow key={stat.user_id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {stat.user_id.substring(0, 20)}...
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <strong>{stat.event_count}</strong>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(stat.last_seen).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

