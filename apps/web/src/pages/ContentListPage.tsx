import { useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { track } from '../lib/telemetry';

// Fake data - will be replaced with API calls later
const fakeContent = [
  {
    id: '1',
    title: 'Product Overview: Gravyty AI',
    description: 'Introduction to Gravyty AI capabilities and use cases',
    tags: ['AI', 'Product'],
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Sales Playbook: Enterprise Deals',
    description: 'Step-by-step guide for closing enterprise deals',
    tags: ['Sales', 'Playbook'],
    updatedAt: '2024-01-10',
  },
  {
    id: '3',
    title: 'Customer Success: Onboarding Best Practices',
    description: 'Best practices for onboarding new customers',
    tags: ['CSM', 'Onboarding'],
    updatedAt: '2024-01-08',
  },
];

export function ContentListPage() {
  const navigate = useNavigate();

  useEffect(() => {
    track('page_view', { page: 'content_list' });
  }, []);

  const handleContentClick = (id: string) => {
    track('download', { contentId: id });
    navigate(`/enablement/content/${id}`);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Enablement Content
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Browse and search enablement materials
      </Typography>
      <List>
        {fakeContent.map((item) => (
          <Card key={item.id} sx={{ mb: 2 }}>
            <CardContent>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleContentClick(item.id)}>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {item.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {item.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Updated: {item.updatedAt}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            </CardContent>
          </Card>
        ))}
      </List>
    </Box>
  );
}

