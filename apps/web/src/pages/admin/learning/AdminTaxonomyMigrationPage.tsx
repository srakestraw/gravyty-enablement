/**
 * Admin Taxonomy Migration Page
 * 
 * UI for migrating legacy taxonomy values to controlled options
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { taxonomyMigrationApi, taxonomyApi } from '../../../api/taxonomyClient';
import type { LegacyTaxonomyValues, ApplyMigrationRequest } from '../../../api/taxonomyClient';
import { useTaxonomyOptions } from '../../../hooks/useTaxonomyOptions';
import type { TaxonomyGroupKey, TaxonomyOption } from '@gravyty/domain';
import { track } from '../../../lib/telemetry';

const STEPS = ['Scan Legacy Values', 'Map Values', 'Dry Run', 'Apply Migration', 'Cleanup'];

type MappingAction = 'map_to_existing' | 'create_new' | 'ignore';
type MappingState = {
  action: MappingAction;
  target_option_id?: string;
  new_label?: string;
  parent_option_id?: string; // For product_suite
};

export function AdminTaxonomyMigrationPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [legacyValues, setLegacyValues] = useState<LegacyTaxonomyValues | null>(null);
  const [mappings, setMappings] = useState<{
    product: Record<string, MappingState>;
    product_suite: Record<string, MappingState>;
    topic_tags: Record<string, MappingState>;
  }>({
    product: {},
    product_suite: {},
    topic_tags: {},
  });
  const [dryRunResult, setDryRunResult] = useState<{ courses_updated: number; resources_updated: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ courses_updated: number; resources_updated: number } | null>(null);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);

  // Fetch taxonomy options for mapping
  const productOptions = useTaxonomyOptions('product', { include_archived: false });
  const productSuiteOptions = useTaxonomyOptions('product_suite', { include_archived: false });
  const topicTagOptions = useTaxonomyOptions('topic_tag', { include_archived: false });

  useEffect(() => {
    track('lms_taxonomy_migration_viewed');
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const response = await taxonomyMigrationApi.scanLegacyValues();
      if ('error' in response) {
        alert(`Failed to scan: ${response.error.message}`);
        return;
      }
      setLegacyValues(response.data);
      setActiveStep(1);
      track('lms_taxonomy_migration_scanned', {
        product_count: Object.keys(response.data.product).length,
        product_suite_count: Object.keys(response.data.product_suite).length,
        topic_tags_count: Object.keys(response.data.topic_tags).length,
      });
    } catch (err) {
      console.error('Error scanning:', err);
      alert('Failed to scan legacy values');
    } finally {
      setScanning(false);
    }
  };

  const handleDryRun = async () => {
    setScanning(true);
    try {
      const mappingRequest: ApplyMigrationRequest = {
        product: buildMapping('product'),
        product_suite: buildMapping('product_suite'),
        topic_tags: buildMapping('topic_tags'),
        dry_run: true,
      };

      const response = await taxonomyMigrationApi.applyMigration(mappingRequest);
      if ('error' in response) {
        alert(`Dry run failed: ${response.error.message}`);
        return;
      }

      setDryRunResult({
        courses_updated: response.data.courses_updated,
        resources_updated: response.data.resources_updated,
      });
      setActiveStep(3);
      track('lms_taxonomy_migration_dry_run', {
        courses: response.data.courses_updated,
        resources: response.data.resources_updated,
      });
    } catch (err) {
      console.error('Error running dry run:', err);
      alert('Failed to run dry run');
    } finally {
      setScanning(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const mappingRequest: ApplyMigrationRequest = {
        product: buildMapping('product'),
        product_suite: buildMapping('product_suite'),
        topic_tags: buildMapping('topic_tags'),
        dry_run: false,
      };

      const response = await taxonomyMigrationApi.applyMigration(mappingRequest);
      if ('error' in response) {
        alert(`Migration failed: ${response.error.message}`);
        return;
      }

      setApplyResult({
        courses_updated: response.data.courses_updated,
        resources_updated: response.data.resources_updated,
      });
      setActiveStep(4);
      track('lms_taxonomy_migration_applied', {
        courses: response.data.courses_updated,
        resources: response.data.resources_updated,
      });
    } catch (err) {
      console.error('Error applying migration:', err);
      alert('Failed to apply migration');
    } finally {
      setApplying(false);
    }
  };

  const buildMapping = (key: 'product' | 'product_suite' | 'topic_tags'): Record<string, string> => {
    const result: Record<string, string> = {};
    const keyMappings = mappings[key];

    for (const [legacyValue, mapping] of Object.entries(keyMappings)) {
      if (mapping.action === 'map_to_existing' && mapping.target_option_id) {
        result[legacyValue] = mapping.target_option_id;
      } else if (mapping.action === 'create_new' && mapping.new_label) {
        // For create_new, we'd need to create the option first
        // For now, skip it - user should create options manually first
      }
    }

    return result;
  };

  const updateMapping = (
    key: 'product' | 'product_suite' | 'topic_tags',
    legacyValue: string,
    mapping: MappingState
  ) => {
    setMappings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [legacyValue]: mapping,
      },
    }));
  };

  const renderScanStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 1: Scan Legacy Values
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Scan Courses and Resources to find legacy taxonomy values that need to be migrated.
      </Typography>
      <Button
        variant="contained"
        startIcon={scanning ? <CircularProgress size={20} /> : <PlayArrowIcon />}
        onClick={handleScan}
        disabled={scanning}
      >
        {scanning ? 'Scanning...' : 'Start Scan'}
      </Button>
    </Box>
  );

  const renderMappingStep = () => {
    if (!legacyValues) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Step 2: Map Legacy Values
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          For each legacy value, choose to map to an existing option, create a new option, or ignore.
        </Typography>

        {(['product', 'product_suite', 'topic_tags'] as const).map((key) => {
          const values = legacyValues[key];
          const options = key === 'product' ? productOptions.options : key === 'product_suite' ? productSuiteOptions.options : topicTagOptions.options;

          if (Object.keys(values).length === 0) return null;

          return (
            <Box key={key} sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, textTransform: 'capitalize' }}>
                {key.replace('_', ' ')}
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Legacy Value</TableCell>
                      <TableCell>Usage</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Target Option</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(values).map(([legacyValue, usage]) => {
                      const mapping = mappings[key][legacyValue] || { action: 'ignore' as MappingAction };
                      return (
                        <TableRow key={legacyValue}>
                          <TableCell>
                            <Typography variant="body2">{legacyValue}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {usage.courses} courses, {usage.resources} resources
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                              <Select
                                value={mapping.action}
                                onChange={(e) =>
                                  updateMapping(key, legacyValue, {
                                    ...mapping,
                                    action: e.target.value as MappingAction,
                                  })
                                }
                              >
                                <MenuItem value="ignore">Ignore</MenuItem>
                                <MenuItem value="map_to_existing">Map to Existing</MenuItem>
                                <MenuItem value="create_new">Create New</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            {mapping.action === 'map_to_existing' && (
                              <FormControl size="small" sx={{ minWidth: 200 }}>
                                <Select
                                  value={mapping.target_option_id || ''}
                                  onChange={(e) =>
                                    updateMapping(key, legacyValue, {
                                      ...mapping,
                                      target_option_id: e.target.value,
                                    })
                                  }
                                >
                                  <MenuItem value="">Select option...</MenuItem>
                                  {options.map((opt) => (
                                    <MenuItem key={opt.option_id} value={opt.option_id}>
                                      {opt.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                            {mapping.action === 'create_new' && (
                              <TextField
                                size="small"
                                placeholder="New option label"
                                value={mapping.new_label || ''}
                                onChange={(e) =>
                                  updateMapping(key, legacyValue, {
                                    ...mapping,
                                    new_label: e.target.value,
                                  })
                                }
                                sx={{ minWidth: 200 }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setActiveStep(0)}>Back</Button>
          <Button variant="contained" onClick={() => setActiveStep(2)}>
            Continue to Dry Run
          </Button>
        </Box>
      </Box>
    );
  };

  const renderDryRunStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 3: Dry Run Preview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Preview how many items will be updated without making changes.
      </Typography>
      <Button variant="contained" onClick={handleDryRun} disabled={scanning}>
        {scanning ? 'Running...' : 'Run Dry Run'}
      </Button>
      {dryRunResult && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Preview:</strong> {dryRunResult.courses_updated} courses and {dryRunResult.resources_updated}{' '}
            resources will be updated.
          </Typography>
        </Alert>
      )}
      {dryRunResult && (
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setActiveStep(1)}>Back</Button>
          <Button variant="contained" onClick={() => setActiveStep(3)}>
            Continue to Apply
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderApplyStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 4: Apply Migration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Apply the migration mapping to update Courses and Resources.
      </Typography>
      {dryRunResult && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This will update {dryRunResult.courses_updated} courses and {dryRunResult.resources_updated} resources.
        </Alert>
      )}
      <Button variant="contained" color="primary" onClick={handleApply} disabled={applying}>
        {applying ? 'Applying...' : 'Apply Migration'}
      </Button>
      {applyResult && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            Migration completed successfully! {applyResult.courses_updated} courses and{' '}
            {applyResult.resources_updated} resources were updated.
          </Typography>
        </Alert>
      )}
      {applyResult && (
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setActiveStep(2)}>Back</Button>
          <Button variant="contained" onClick={() => setActiveStep(4)}>
            Continue to Cleanup
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderCleanupStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step 5: Cleanup
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Optional: Clean up legacy fields and unused options after migration.
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Cleanup options:
        <ul>
          <li>Clear legacy string fields (product, product_suite, topic_tags) after successful migration</li>
          <li>Archive or delete unused taxonomy options</li>
        </ul>
      </Alert>
      <Button variant="outlined" onClick={() => setCleanupDialogOpen(true)}>
        Open Cleanup Options
      </Button>
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button onClick={() => navigate('/enablement/admin/learning/taxonomy')}>
          Return to Taxonomy
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/enablement/admin/learning')}
          sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          Learning Admin
        </Link>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/enablement/admin/learning/taxonomy')}
          sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          Taxonomy
        </Link>
        <Typography color="text.primary">Migration</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        Taxonomy Migration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Migrate legacy free-form taxonomy values to controlled options.
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {activeStep === 0 && renderScanStep()}
        {activeStep === 1 && renderMappingStep()}
        {activeStep === 2 && renderDryRunStep()}
        {activeStep === 3 && renderApplyStep()}
        {activeStep === 4 && renderCleanupStep()}
      </Paper>
    </Box>
  );
}

