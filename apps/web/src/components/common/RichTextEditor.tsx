/**
 * Rich Text Editor Component
 * 
 * A Material-UI styled wrapper around TipTap editor with toolbar
 * Supports advanced formatting: tables, code blocks, images, headings, etc.
 */

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Link } from '@tiptap/extension-link';
import {
  Box,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  FormHelperText,
  FormControl,
  InputLabel,
  OutlinedInput,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  Code,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Link as LinkIcon,
  Image as ImageIcon,
  TableChart,
  Title,
  DataObject,
  AutoAwesome,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { AIAssistantModal } from './AIAssistantModal';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  rows?: number;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLDivElement>;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  label,
  placeholder = 'Start typing...',
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  rows = 4,
  disabled = false,
  inputRef,
}: RichTextEditorProps) {
  const theme = useTheme();
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Exclude extensions that we're adding separately to avoid duplicates
        link: false,
        underline: false,
        codeBlock: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      CodeBlock,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Normalize empty content to empty string instead of '<p></p>'
      const normalizedHtml = html === '<p></p>' || html === '<p><br></p>' ? '' : html;
      onChange(normalizedHtml);
    },
    onBlur,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content',
        style: `min-height: ${rows * 24}px; padding: ${theme.spacing(1.5)};`,
      },
    },
  });

  // Sync editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const handleToggleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      default:
        break;
    }
  };

  const handleHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const handleLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleAIAssistant = () => {
    setAiModalOpen(true);
  };

  const handleApplyAIContent = (content: string) => {
    if (editor) {
      editor.commands.setContent(content);
      editor.commands.focus();
    }
  };

  return (
    <FormControl fullWidth={fullWidth} error={error} required={required}>
      {label && (
        <InputLabel shrink sx={{ position: 'relative', transform: 'none', mb: 1 }}>
          {label}
        </InputLabel>
      )}
      <Box
        ref={inputRef}
        sx={{
          border: `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
          borderRadius: `${theme.shape.borderRadius}px`,
          '&:hover': {
            borderColor: error ? theme.palette.error.main : theme.palette.text.primary,
          },
          '&:focus-within': {
            borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
            borderWidth: '2px',
          },
          bgcolor: disabled ? theme.palette.action.disabledBackground : 'background.paper',
        }}
      >
        {/* Toolbar */}
        <Paper
          elevation={0}
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            p: 0.5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            bgcolor: 'transparent',
          }}
        >
          {/* Text Formatting */}
          <ToggleButtonGroup size="small" exclusive>
            <Tooltip title="Bold">
              <ToggleButton
                value="bold"
                selected={editor.isActive('bold')}
                onClick={() => handleToggleFormat('bold')}
                disabled={disabled}
                aria-label="Bold"
              >
                <FormatBold fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Italic">
              <ToggleButton
                value="italic"
                selected={editor.isActive('italic')}
                onClick={() => handleToggleFormat('italic')}
                disabled={disabled}
                aria-label="Italic"
              >
                <FormatItalic fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Underline">
              <ToggleButton
                value="underline"
                selected={editor.isActive('underline')}
                onClick={() => handleToggleFormat('underline')}
                disabled={disabled}
                aria-label="Underline"
              >
                <FormatUnderlined fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Code">
              <ToggleButton
                value="code"
                selected={editor.isActive('code')}
                onClick={() => handleToggleFormat('code')}
                disabled={disabled}
                aria-label="Inline code"
              >
                <Code fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>

          {/* Headings */}
          <ToggleButtonGroup size="small" exclusive>
            <Tooltip title="Heading 1">
              <ToggleButton
                value="h1"
                selected={editor.isActive('heading', { level: 1 })}
                onClick={() => handleHeading(1)}
                disabled={disabled}
                aria-label="Heading 1"
              >
                <Title fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Heading 2">
              <ToggleButton
                value="h2"
                selected={editor.isActive('heading', { level: 2 })}
                onClick={() => handleHeading(2)}
                disabled={disabled}
                aria-label="Heading 2"
              >
                <Title fontSize="small" sx={{ fontSize: '0.875rem' }} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Heading 3">
              <ToggleButton
                value="h3"
                selected={editor.isActive('heading', { level: 3 })}
                onClick={() => handleHeading(3)}
                disabled={disabled}
                aria-label="Heading 3"
              >
                <Title fontSize="small" sx={{ fontSize: '0.75rem' }} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>

          {/* Lists */}
          <ToggleButtonGroup size="small" exclusive>
            <Tooltip title="Bullet List">
              <ToggleButton
                value="bulletList"
                selected={editor.isActive('bulletList')}
                onClick={() => handleToggleFormat('bulletList')}
                disabled={disabled}
                aria-label="Bullet list"
              >
                <FormatListBulleted fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Numbered List">
              <ToggleButton
                value="orderedList"
                selected={editor.isActive('orderedList')}
                onClick={() => handleToggleFormat('orderedList')}
                disabled={disabled}
                aria-label="Numbered list"
              >
                <FormatListNumbered fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>

          {/* Other Formatting */}
          <ToggleButtonGroup size="small" exclusive>
            <Tooltip title="Quote">
              <ToggleButton
                value="blockquote"
                selected={editor.isActive('blockquote')}
                onClick={() => handleToggleFormat('blockquote')}
                disabled={disabled}
                aria-label="Quote"
              >
                <FormatQuote fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Code Block">
              <ToggleButton
                value="codeBlock"
                selected={editor.isActive('codeBlock')}
                onClick={() => handleToggleFormat('codeBlock')}
                disabled={disabled}
                aria-label="Code block"
              >
                <DataObject fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>

          {/* Insert */}
          <ToggleButtonGroup size="small">
            <Tooltip title="Insert Link">
              <ToggleButton
                value="link"
                selected={editor.isActive('link')}
                onClick={handleLink}
                disabled={disabled}
                aria-label="Insert link"
              >
                <LinkIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Insert Image">
              <ToggleButton
                value="image"
                onClick={handleImage}
                disabled={disabled}
                aria-label="Insert image"
              >
                <ImageIcon fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Insert Table">
              <ToggleButton
                value="table"
                onClick={handleTable}
                disabled={disabled}
                aria-label="Insert table"
              >
                <TableChart fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>

          {/* AI Assistant */}
          <ToggleButtonGroup size="small">
            <Tooltip title="AI Assistant">
              <ToggleButton
                value="ai"
                onClick={handleAIAssistant}
                disabled={disabled}
                aria-label="AI Assistant"
              >
                <AutoAwesome fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Paper>

        {/* Editor Content */}
        <Box
          sx={{
            '& .rich-text-editor-content': {
              outline: 'none',
              '& p': {
                margin: 0,
                '&:not(:last-child)': {
                  marginBottom: theme.spacing(1),
                },
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                marginTop: theme.spacing(2),
                marginBottom: theme.spacing(1),
                fontWeight: 600,
              },
              '& h1': { fontSize: '2rem' },
              '& h2': { fontSize: '1.5rem' },
              '& h3': { fontSize: '1.25rem' },
              '& ul, & ol': {
                paddingLeft: theme.spacing(3),
                margin: `${theme.spacing(1)} 0`,
              },
              '& blockquote': {
                borderLeft: `4px solid ${theme.palette.divider}`,
                paddingLeft: theme.spacing(2),
                margin: `${theme.spacing(1)} 0`,
                fontStyle: 'italic',
                color: theme.palette.text.secondary,
              },
              '& code': {
                backgroundColor: theme.palette.action.hover,
                padding: `${theme.spacing(0.25)} ${theme.spacing(0.5)}`,
                borderRadius: theme.shape.borderRadius,
                fontFamily: 'monospace',
                fontSize: '0.9em',
              },
              '& pre': {
                backgroundColor: theme.palette.action.hover,
                padding: theme.spacing(1.5),
                borderRadius: theme.shape.borderRadius,
                overflow: 'auto',
                '& code': {
                  backgroundColor: 'transparent',
                  padding: 0,
                },
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: theme.shape.borderRadius,
                margin: `${theme.spacing(1)} 0`,
              },
              '& table': {
                borderCollapse: 'collapse',
                width: '100%',
                margin: `${theme.spacing(1)} 0`,
                '& td, & th': {
                  border: `1px solid ${theme.palette.divider}`,
                  padding: theme.spacing(1),
                  textAlign: 'left',
                },
                '& th': {
                  backgroundColor: theme.palette.action.hover,
                  fontWeight: 600,
                },
              },
              '& a': {
                color: theme.palette.primary.main,
                textDecoration: 'underline',
                '&:hover': {
                  textDecoration: 'none',
                },
              },
            },
            '& .ProseMirror': {
              outline: 'none',
              '& p.is-editor-empty:first-of-type::before': {
                content: 'attr(data-placeholder)',
                float: 'left',
                color: theme.palette.text.disabled,
                pointerEvents: 'none',
                height: 0,
              },
              '& ::selection': {
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
              },
            },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
      
      {/* AI Assistant Modal */}
      <AIAssistantModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onApply={handleApplyAIContent}
        context={label}
        existingContent={value || undefined}
      />
    </FormControl>
  );
}

