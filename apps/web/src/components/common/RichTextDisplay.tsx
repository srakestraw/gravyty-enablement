/**
 * Rich Text Display Component
 * 
 * Renders HTML content from RichTextEditor in read-only mode
 * Used for displaying saved rich text content
 */

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface RichTextDisplayProps {
  content: string;
  className?: string;
  sx?: object;
}

export function RichTextDisplay({ content, className, sx }: RichTextDisplayProps) {
  const theme = useTheme();

  if (!content) {
    return null;
  }

  return (
    <Box
      className={className}
      sx={{
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
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}


