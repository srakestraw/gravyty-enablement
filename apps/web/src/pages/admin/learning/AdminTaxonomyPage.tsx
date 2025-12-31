/**
 * Admin Taxonomy Landing Page
 * 
 * Landing page for taxonomy management - shows cards for each taxonomy key
 */

import { useNavigate } from 'react-router-dom';
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
import { useTaxonomyOptions } from '../../../hooks/useTaxonomyOptions';
import type { TaxonomyGroupKey } from '@gravyty/domain';
import { track } from '../../../lib/telemetry';

interface TaxonomyKeyInfo {
  key: TaxonomyGroupKey;
  label: string;
  description: string;
}

const TAXONOMY_KEYS: TaxonomyKeyInfo[] = [
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
];

export function AdminTaxonomyPage() {
  const navigate = useNavigate();

  // Fetch counts for each taxonomy key
  const productQuery = useTaxonomyOptions('product', { include_archived: true });
  const productSuiteQuery = useTaxonomyOptions('product_suite', { include_archived: true });
  const topicTagQuery = useTaxonomyOptions('topic_tag', { include_archived: true });

  const loading = productQuery.loading || productSuiteQuery.loading || topicTagQuery.loading;

  const getCounts = (key: TaxonomyGroupKey) => {
    let options: typeof productQuery.options = [];
    if (key === 'product') options = productQuery.options;
    else if (key === 'product_suite') options = productSuiteQuery.options;
    else if (key === 'topic_tag') options = topicTagQuery.options;

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

  const handleCardClick = (key: TaxonomyGroupKey) => {
    track('lms_taxonomy_options_viewed', { key });
    navigate(`/enablement/admin/learning/taxonomy/${key}`);
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
          Taxonomy
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage controlled values used across Courses and Resources.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {TAXONOMY_KEYS.map((info) => {
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

