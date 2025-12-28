import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  IconButton,
  Paper,
  Avatar,
  Button,
} from '@mui/material';
import {
  SendOutlined,
  AddOutlined,
  HistoryOutlined,
  BookmarkBorderOutlined,
} from '@mui/icons-material';

type TabValue = 'chat' | 'history' | 'saved';

export function AiAssistantPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('chat');
  const [messageInput, setMessageInput] = useState('');

  // Placeholder conversation history
  const placeholderConversations = [
    { id: '1', title: 'How to handle objections?', timestamp: '2 hours ago' },
    { id: '2', title: 'Product pricing questions', timestamp: 'Yesterday' },
    { id: '3', title: 'Competitive analysis', timestamp: '3 days ago' },
  ];

  // Placeholder messages for current chat
  const placeholderMessages = [
    { id: '1', role: 'user', content: 'What are the key features of our product?' },
    { id: '2', role: 'assistant', content: 'Our product includes advanced analytics, AI-powered insights, and seamless integrations with popular CRM platforms.' },
    { id: '3', role: 'user', content: 'How does it compare to competitors?' },
    { id: '4', role: 'assistant', content: 'Our solution offers superior customization options and a more intuitive user interface compared to leading competitors.' },
  ];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Placeholder - would send message here
      console.log('Sending message:', messageInput);
      setMessageInput('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            px: 2,
            '& .MuiTab-root': {
              minWidth: 100,
            },
          }}
        >
          <Tab
            label="Chat"
            value="chat"
            icon={<AddOutlined fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label="History"
            value="history"
            icon={<HistoryOutlined fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label="Saved"
            value="saved"
            icon={<BookmarkBorderOutlined fontSize="small" />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar - History */}
        <Box
          sx={{
            width: 280,
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" component="h2">
              {activeTab === 'chat' ? 'Recent Conversations' : activeTab === 'history' ? 'Conversation History' : 'Saved Answers'}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {placeholderConversations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No conversations yet
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {placeholderConversations.map((conv) => (
                  <ListItem key={conv.id} disablePadding>
                    <ListItemButton
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {conv.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {conv.timestamp}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          {activeTab === 'chat' && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddOutlined />}
                sx={{
                  textTransform: 'none',
                }}
              >
                New Chat
              </Button>
            </Box>
          )}
        </Box>

        {/* Right Panel - Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          {activeTab === 'chat' ? (
            <>
              {/* Messages Area */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {placeholderMessages.length === 0 ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Start a new chat
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ask questions about products, sales strategies, or get help with enablement content.
                    </Typography>
                  </Box>
                ) : (
                  placeholderMessages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {message.role === 'assistant' && (
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            width: 32,
                            height: 32,
                          }}
                        >
                          AI
                        </Avatar>
                      )}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                          color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 2,
                          border: message.role === 'assistant' ? 1 : 0,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                      </Paper>
                      {message.role === 'user' && (
                        <Avatar
                          sx={{
                            bgcolor: 'action.selected',
                            width: 32,
                            height: 32,
                          }}
                        >
                          U
                        </Avatar>
                      )}
                    </Box>
                  ))
                )}
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                      },
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'action.disabledBackground',
                        color: 'action.disabled',
                      },
                    }}
                  >
                    <SendOutlined />
                  </IconButton>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Press Enter to send, Shift+Enter for new line
                </Typography>
              </Box>
            </>
          ) : activeTab === 'history' ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <HistoryOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Conversation History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your past conversations will appear here
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <BookmarkBorderOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Saved Answers
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Answers you've saved will appear here
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

