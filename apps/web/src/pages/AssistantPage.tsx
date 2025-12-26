import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { track } from '../lib/telemetry';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you find enablement content and answer questions. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  useEffect(() => {
    track('page_view', { page: 'assistant' });
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    track('assistant_query', { query: input });

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about "${input}". This is a placeholder response. The AI assistant will be connected to OpenAI RAG brain in a future phase.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Assistant
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Ask questions about enablement content and get AI-powered answers
      </Typography>
      <Paper sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <ListItemText
                    primary={message.content}
                    secondary={message.timestamp.toLocaleTimeString()}
                  />
                </Paper>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={4}
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={handleSend}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

