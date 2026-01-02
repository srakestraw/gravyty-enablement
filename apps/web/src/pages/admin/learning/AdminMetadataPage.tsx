/**
 * Admin Metadata Landing Page
 * 
 * Landing page for metadata management - shows cards for each metadata key
 */

import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CategoryOutlined } from '@mui/icons-material';
import { useMetadataOptions } from '../../../hooks/useMetadataOptions';
import type { MetadataGroupKey } from '@gravyty/domain';
import { track } from '../../../lib/telemetry';

interface MetadataKeyInfo {
  key: MetadataGroupKey;
  label: string;
  description: string;
}

const METADATA_KEYS: MetadataKeyInfo[] = [
  {
    key: 'product',
    label: 'Product',
    description: 'Primary product categorization',
  },
  {
    key: 'product_suite',
    label: 'Product Suite',
    description: 'Product suite categorization',
  },
  {
    key: 'topic_tag',
    label: 'Topic Tags',
    description: 'Topic tags for content tagging',
  },
  {
    key: 'badge',
    label: 'Badges',
    description: 'Badges that can be earned by completing courses',
  },
  {
    key: 'audience',
    label: 'Audience',
    description: 'Target audience for courses and content',
  },
];

export function AdminMetadataPage() {
  const navigate = useNavigate();

  // Fetch counts for each metadata key
  const productQuery = useMetadataOptions('product', { include_archived: true });
  const productSuiteQuery = useMetadataOptions('product_suite', { include_archived: true });
  const topicTagQuery = useMetadataOptions('topic_tag', { include_archived: true });
  const badgeQuery = useMetadataOptions('badge', { include_archived: true });
  const audienceQuery = useMetadataOptions('audience', { include_archived: true });

  const loading = productQuery.loading || productSuiteQuery.loading || topicTagQuery.loading || badgeQuery.loading || audienceQuery.loading;

  // Sort metadata keys alphabetically by label
  const sortedMetadataKeys = useMemo(() => {
    return [...METADATA_KEYS].sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const getCounts = (key: MetadataGroupKey) => {
    let options: typeof productQuery.options = [];
    if (key === 'product') options = productQuery.options;
    else if (key === 'product_suite') options = productSuiteQuery.options;
    else if (key === 'topic_tag') options = topicTagQuery.options;
    else if (key === 'badge') options = badgeQuery.options;
    else if (key === 'audience') options = audienceQuery.options;

    const active = options.filter((opt) => !opt.archived_at).length;
    const archived = options.filter((opt) => opt.archived_at).length;
    const lastUpdated = options.length > 0
      ? options.reduce((latest, opt) => {
          const optDate = new Date(opt.updated_at);
          return optDate > latest ? optDate : latest;
        }, new Date(0))
      : null;

    return { active, archived, lastUpdated };
  };

  const handleCardClick = (key: MetadataGroupKey) => {
    track('lms_metadata_options_viewed', { key });
    navigate(`/enablement/admin/metadata/${key}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Metadata
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage controlled values used across Courses and Resources.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {sortedMetadataKeys.map((info) => {
          const { active, archived, lastUpdated } = getCounts(info.key);
          return (
            <Grid item xs={12} sm={6} md={4} key={info.key}>
              <Card>
                <CardActionArea onClick={() => handleCardClick(info.key)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CategoryOutlined sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{info.label}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {info.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2">
                        <strong>{active}</strong> active
                      </Typography>
                      {archived > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>{archived}</strong> archived
                        </Typography>
                      )}
                    </Box>
                    {lastUpdated && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Last updated: {lastUpdated.toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

