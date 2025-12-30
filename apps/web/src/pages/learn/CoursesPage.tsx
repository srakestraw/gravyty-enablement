/**
 * Courses Catalog Page
 * 
 * Browse and filter enablement courses
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CardMedia,
  Grid,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  SearchOutlined,
  PlayArrowOutlined,
} from '@mui/icons-material';
import { useLmsCourses } from '../../hooks/useLmsCourses';
import { track } from '../../lib/telemetry';
import { CourseCard } from '../../components/lms/CourseCard';

export function CoursesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [productSuite, setProductSuite] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { courses, loading, error, nextCursor, refetch } = useLmsCourses(
    {
      q: debouncedQuery || undefined,
      product_suite: productSuite || undefined,
      topics: selectedTopics.length > 0 ? selectedTopics : undefined,
      limit: 20,
    },
    {
      telemetry: {
        source_page: 'courses_catalog',
      },
    }
  );

  useEffect(() => {
    track('page_view', { page: 'courses_catalog' });
  }, []);

  // Extract unique topics and product suites for filters
  const allTopics = Array.from(
    new Set(courses.flatMap((c) => c.topic_tags || []))
  ).sort();
  const allProductSuites = Array.from(
    new Set(courses.map((c) => c.product_suite).filter(Boolean) as string[])
  ).sort();

  const handleLoadMore = () => {
    // TODO: Implement pagination with cursor
    refetch();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Courses
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Browse and access enablement courses
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Product Suite</InputLabel>
              <Select
                value={productSuite}
                onChange={(e) => setProductSuite(e.target.value)}
                label="Product Suite"
              >
                <MenuItem value="">All</MenuItem>
                {allProductSuites.map((suite) => (
                  <MenuItem key={suite} value={suite}>
                    {suite}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Topic Tags */}
        {allTopics.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Topics:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {allTopics.map((topic) => (
                <Chip
                  key={topic}
                  label={topic}
                  size="small"
                  onClick={() => {
                    setSelectedTopics((prev) =>
                      prev.includes(topic)
                        ? prev.filter((t) => t !== topic)
                        : [...prev, topic]
                    );
                  }}
                  color={selectedTopics.includes(topic) ? 'primary' : 'default'}
                  variant={selectedTopics.includes(topic) ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Results */}
      {loading && courses.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : courses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No courses found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {courses.map((course) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={course.course_id}>
                <CourseCard
                  course={course}
                  onClick={() => navigate(`/enablement/learn/courses/${course.course_id}`)}
                />
              </Grid>
            ))}
          </Grid>
          {nextCursor && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button variant="outlined" onClick={handleLoadMore}>
                Load More
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
