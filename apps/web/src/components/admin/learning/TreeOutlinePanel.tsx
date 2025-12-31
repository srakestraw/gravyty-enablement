/**
 * Tree Outline Panel
 * 
 * Content-only outline showing Sections and Lessons (course metadata is separate)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Chip,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as SectionIcon,
  MenuBook as LessonIcon,
  School as CourseIcon,
} from '@mui/icons-material';
import type { CourseTreeNode, NodeType } from '../../../types/courseTree';
import { focusRegistry } from '../../../utils/focusRegistry';

export interface TreeOutlinePanelProps {
  tree: CourseTreeNode | null;
  selectedNodeId: string | null; // ID of selected section or lesson (not course)
  onSelectNode: (nodeId: string | null) => void;
  onAddSection: () => void;
  onAddLesson: (sectionId: string) => void;
  onRenameNode: (nodeId: string, newTitle: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onReorderNode: (nodeId: string, direction: 'up' | 'down') => void;
  shouldShowError?: (entityType: NodeType, entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: NodeType, entityId: string, fieldKey: string) => void;
}

export function TreeOutlinePanel({
  tree,
  selectedNodeId,
  onSelectNode,
  onAddSection,
  onAddLesson,
  onRenameNode,
  onDeleteNode,
  onReorderNode,
  shouldShowError,
  markFieldTouched,
}: TreeOutlinePanelProps) {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-expand sections when selected
  useEffect(() => {
    if (selectedNodeId && tree) {
      const node = findNodeInTree(tree, selectedNodeId);
      if (node && node.type === 'lesson' && node.parentId) {
        setExpandedSections((prev) => new Set(prev).add(node.parentId!));
      }
    }
  }, [selectedNodeId, tree]);

  // Auto-start editing when node is selected and has no title
  useEffect(() => {
    if (selectedNodeId && editingNodeId !== selectedNodeId) {
      const node = findNodeInTree(tree, selectedNodeId);
      if (node && (!node.title || node.title.trim() === '' || node.title.includes('Untitled'))) {
        setEditingNodeId(selectedNodeId);
        setEditTitle(node.title || '');
      }
    }
  }, [selectedNodeId, tree, editingNodeId]);

  // Register title field with focus registry when editing
  useEffect(() => {
    if (!editingNodeId || !titleInputRef.current || !tree) return;

    const node = findNodeInTree(tree, editingNodeId);
    if (!node) return;

    const unregister = focusRegistry.register({
      entityType: node.type,
      entityId: node.id,
      fieldKey: 'title',
      ref: titleInputRef as React.RefObject<HTMLElement>,
    });

    return () => {
      unregister();
    };
  }, [editingNodeId, tree]);

  const findNodeInTree = (node: CourseTreeNode, id: string): CourseTreeNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeInTree(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleStartEdit = (node: CourseTreeNode) => {
    setEditingNodeId(node.id);
    setEditTitle(node.title);
  };

  const handleSaveEdit = () => {
    if (editingNodeId && editTitle.trim()) {
      onRenameNode(editingNodeId, editTitle.trim());
      if (markFieldTouched) {
        const node = findNodeInTree(tree, editingNodeId);
        if (node) {
          markFieldTouched(node.type, node.id, 'title');
        }
      }
      setEditingNodeId(null);
      setEditTitle('');
    }
  };

  const handleCancelEdit = () => {
    setEditingNodeId(null);
    setEditTitle('');
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'section':
        return <SectionIcon fontSize="small" />;
      case 'lesson':
        return <LessonIcon fontSize="small" />;
      case 'course':
        return <CourseIcon fontSize="small" />;
    }
  };

  const renderNode = (node: CourseTreeNode, depth: number = 0): React.ReactNode => {
    const isSelected = selectedNodeId === node.id;
    const isEditing = editingNodeId === node.id;
    const isExpanded = node.type === 'section' && expandedSections.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const canAddLesson = node.type === 'section';

    return (
      <React.Fragment key={node.id}>
        <ListItem
          disablePadding
          sx={{
            pl: depth * 2,
            bgcolor: isSelected ? 'action.selected' : 'transparent',
            borderLeft: isSelected ? 3 : 0,
            borderColor: 'primary.main',
          }}
        >
          <ListItemButton
            onClick={() => {
              if (!isEditing) {
                onSelectNode(node.id);
                if (node.type === 'section') {
                  toggleSection(node.id);
                }
              }
            }}
            sx={{ py: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {getNodeIcon(node.type)}
            </ListItemIcon>

            {isEditing ? (
              <TextField
                inputRef={(el) => {
                  titleInputRef.current = el;
                }}
                size="small"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                onBlur={handleSaveEdit}
                placeholder={node.type === 'section' ? 'Untitled Section' : 'Untitled Lesson'}
                autoFocus
                error={shouldShowError && (!editTitle || editTitle.trim() === '') && shouldShowError(node.type, node.id, 'title')}
                helperText={shouldShowError && (!editTitle || editTitle.trim() === '') && shouldShowError(node.type, node.id, 'title') ? `${node.type === 'section' ? 'Section' : 'Lesson'} title is required` : ''}
                sx={{ flex: 1, mr: 1 }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: node.type === 'course' ? 600 : 400 }}>
                              {node.title}
                            </Typography>
                            {node.issuesCount && node.issuesCount > 0 && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'error.main',
                                  flexShrink: 0,
                                }}
                                title={`${node.issuesCount} error${node.issuesCount !== 1 ? 's' : ''}`}
                              />
                            )}
                          </Box>
                        }
                      />
                {node.type === 'section' && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection(node.id);
                    }}
                  >
                    {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                  </IconButton>
                )}
              </>
            )}

            {!isEditing && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {node.type === 'section' && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddLesson(node.id);
                    }}
                    title="Add Lesson"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(node);
                  }}
                  title="Rename"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  title="Delete"
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </ListItemButton>
        </ListItem>

        {/* Render children if expanded */}
        {node.type === 'section' && hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List dense disablePadding>
              {node.children!.map((child) => renderNode(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // Get sections only (skip course root)
  const sections = tree?.children || [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Course Outline header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Course Outline</Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddSection}
        >
          Add Section
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {sections.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
              No sections yet. Add your first section to publish.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddSection}
            >
              Add first section
            </Button>
          </Box>
        ) : (
          <List dense>
            {sections.map((section) => renderNode(section, 0))}
          </List>
        )}
      </Box>
    </Box>
  );
}

