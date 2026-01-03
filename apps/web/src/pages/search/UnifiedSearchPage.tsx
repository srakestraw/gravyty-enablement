/**
 * Unified Search Page
 * 
 * Search and filter across all entity types (Courses, Learning Paths, Role Playing, Content, Content Kits)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  InputAdornment,
  Button,
} from '@mui/material';
import {
  SearchOutlined,
} from '@mui/icons-material';
import { searchUnified } from '../../api/searchClient';
import { UnifiedSearchCard } from '../../components/search/UnifiedSearchCard';
import { useMetadataOptions } from '../../hooks/useMetadataOptions';
import type { UnifiedSearchParams, UnifiedSearchResult } from '@gravyty/domain';
import { PageLayout } from '../../components/shell/PageLayout';

export function UnifiedSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>(['course', 'learning_path', 'content']);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedProductSuiteIds, setSelectedProductSuiteIds] = useState<string[]>([]);
  const [selectedTopicTagIds, setSelectedTopicTagIds] = useState<string[]>([]);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([]);
  
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { options: productOptions } = useMetadataOptions('product');
  const { options: productSuiteOptions } = useMetadataOptions('product_suite');
  const { options: topicTagOptions } = useMetadataOptions('topic_tag');
  const { options: audienceOptions } = useMetadataOptions('audience');
  
  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params: UnifiedSearchParams = {
          q: searchQuery || undefined,
          entity_types: selectedEntityTypes.length > 0 ? selectedEntityTypes as any : undefined,
          product_ids: selectedProductIds.length > 0 ? selectedProductIds : undefined,
          product_suite_ids: selectedProductSuiteIds.length > 0 ? selectedProductSuiteIds : undefined,
          topic_tag_ids: selectedTopicTagIds.length > 0 ? selectedTopicTagIds : undefined,
          audience_ids: selectedAudienceIds.length > 0 ? selectedAudienceIds : undefined,
          limit: 50,
        };
        
        const response = await searchUnified(params);
        if ('data' in response) {
          setResults(response.data.results);
        } else {
          setError(response.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to perform search');
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [
    searchQuery,
    selectedEntityTypes,
    selectedProductIds,
    selectedProductSuiteIds,
    selectedTopicTagIds,
    selectedAudienceIds,
  ]);
  
  const handleEntityTypeToggle = (entityType: string) => {
    setSelectedEntityTypes((prev) =>
      prev.includes(entityType)
        ? prev.filter((t) => t !== entityType)
        : [...prev, entityType]
    );
  };
  
  return (
    <PageLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Unified Search
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Search and filter across Courses, Learning Paths, Role Playing, Content, and Content Kits
        </Typography>
        
        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search across all content..."
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
        </Box>
        
        <Grid container spacing={3}>
          {/* Filters Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Filters
              </Typography>
              
              {/* Entity Type Filter */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Content Type
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedEntityTypes.includes('course')}
                        onChange={() => handleEntityTypeToggle('course')}
                      />
                    }
                    label="Courses"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedEntityTypes.includes('learning_path')}
                        onChange={() => handleEntityTypeToggle('learning_path')}
                      />
                    }
                    label="Learning Paths"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedEntityTypes.includes('role_playing')}
                        onChange={() => handleEntityTypeToggle('role_playing')}
                      />
                    }
                    label="Role Playing"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedEntityTypes.includes('content')}
                        onChange={() => handleEntityTypeToggle('content')}
                      />
                    }
                    label="Content"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedEntityTypes.includes('content_kit')}
                        onChange={() => handleEntityTypeToggle('content_kit')}
                      />
                    }
                    label="Content Kits"
                  />
                </FormGroup>
              </Box>
              
              {/* Metadata Filters */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Product Suite
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={selectedProductSuiteIds}
                    onChange={(e) => setSelectedProductSuiteIds(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const option = productSuiteOptions.find((o) => o.option_id === id);
                          return <Chip key={id} label={option?.label || id} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {productSuiteOptions.map((option) => (
                      <MenuItem key={option.option_id} value={option.option_id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Product
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={selectedProductIds}
                    onChange={(e) => setSelectedProductIds(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const option = productOptions.find((o) => o.option_id === id);
                          return <Chip key={id} label={option?.label || id} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {productOptions.map((option) => (
                      <MenuItem key={option.option_id} value={option.option_id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Topic Tags
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={selectedTopicTagIds}
                    onChange={(e) => setSelectedTopicTagIds(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const option = topicTagOptions.find((o) => o.option_id === id);
                          return <Chip key={id} label={option?.label || id} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {topicTagOptions.map((option) => (
                      <MenuItem key={option.option_id} value={option.option_id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Audience
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    multiple
                    value={selectedAudienceIds}
                    onChange={(e) => setSelectedAudienceIds(e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const option = audienceOptions.find((o) => o.option_id === id);
                          return <Chip key={id} label={option?.label || id} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {audienceOptions.map((option) => (
                      <MenuItem key={option.option_id} value={option.option_id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Grid>
          
          {/* Results */}
          <Grid item xs={12} md={9}>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {!loading && !error && results.length === 0 && (
              <Alert severity="info">
                No results found. Try adjusting your filters.
              </Alert>
            )}
            
            {!loading && !error && results.length > 0 && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Found {results.length} result{results.length !== 1 ? 's' : ''}
                </Typography>
                <Grid container spacing={2}>
                  {results.map((result) => (
                    <Grid item xs={12} sm={6} md={4} key={`${result.entity_type}-${result.entity_id}`}>
                      <UnifiedSearchCard result={result} />
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Grid>
        </Grid>
      </Box>
    </PageLayout>
  );
}

