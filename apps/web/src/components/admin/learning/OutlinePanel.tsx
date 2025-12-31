/**
 * Course Outline Panel
 * 
 * Left panel showing sections and lessons in a tree structure
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
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import type { CourseSection, Lesson } from '@gravyty/domain';
import { focusRegistry } from '../../../utils/focusRegistry';

export interface OutlinePanelProps {
  sections: CourseSection[];
  lessons: Lesson[];
  selectedLessonId: string | null;
  selectedSectionId?: string | null;
  onSelectLesson: (lessonId: string | null) => void;
  onSelectSection?: (sectionId: string | null) => void;
  onAddSection: () => void;
  onRenameSection: (sectionId: string, newTitle: string) => void;
  onReorderSection: (sectionId: string, direction: 'up' | 'down') => void;
  onDeleteSection: (sectionId: string) => void;
  onAddLesson: (sectionId: string) => void;
  onReorderLesson: (lessonId: string, direction: 'up' | 'down') => void;
  onMoveLesson: (lessonId: string, targetSectionId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  shouldShowError?: (entityType: 'course' | 'section' | 'lesson', entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: 'course' | 'section' | 'lesson', entityId: string, fieldKey: string) => void;
}

export function OutlinePanel({
  sections,
  lessons,
  selectedLessonId,
  selectedSectionId,
  onSelectLesson,
  onSelectSection,
  onAddSection,
  onRenameSection,
  onReorderSection,
  onDeleteSection,
  onAddLesson,
  onReorderLesson,
  onMoveLesson,
  onDeleteLesson,
  shouldShowError,
  markFieldTouched,
}: OutlinePanelProps) {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const sectionTitleRef = useRef<HTMLInputElement | null>(null);

  // Auto-start editing when a section is selected and not already editing
  useEffect(() => {
    if (selectedSectionId && editingSectionId !== selectedSectionId) {
      const section = sections.find((s) => s.section_id === selectedSectionId);
      if (section && (!section.title || section.title.trim() === '')) {
        // Auto-start editing if section has no title
        setEditingSectionId(selectedSectionId);
        setEditTitle('');
      }
    }
  }, [selectedSectionId, sections, editingSectionId]);

  // Register section title field with focus registry when editing
  useEffect(() => {
    if (!editingSectionId || !sectionTitleRef.current) return;

    const section = sections.find((s) => s.section_id === editingSectionId);
    if (!section) return;

    const unregister = focusRegistry.register({
      entityType: 'section',
      entityId: section.section_id,
      fieldKey: 'title',
      ref: sectionTitleRef as React.RefObject<HTMLElement>,
    });

    return () => {
      unregister();
    };
  }, [editingSectionId, sections]);

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const handleStartEditSection = (section: CourseSection) => {
    setEditingSectionId(section.section_id);
    setEditTitle(section.title || '');
    if (onSelectSection) {
      onSelectSection(section.section_id);
    }
  };

  const handleSaveEditSection = () => {
    if (editingSectionId) {
      const finalTitle = editTitle.trim() || 'Untitled section';
      onRenameSection(editingSectionId, finalTitle);
      if (markFieldTouched) {
        markFieldTouched('section', editingSectionId, 'title');
      }
      setEditingSectionId(null);
      setEditTitle('');
    }
  };

  const handleCancelEditSection = () => {
    setEditingSectionId(null);
    setEditTitle('');
  };

  const getSectionLessons = (sectionId: string) => {
    const section = sections.find((s) => s.section_id === sectionId);
    if (!section) return [];
    return section.lesson_ids
      .map((lessonId) => lessons.find((l) => l.lesson_id === lessonId))
      .filter((l): l is Lesson => l !== undefined)
      .sort((a, b) => a.order - b.order);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        {sortedSections.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              No sections yet. Add your first section to get started.
            </Typography>
          </Box>
        ) : (
          sortedSections.map((section, sectionIndex) => {
            const sectionLessons = getSectionLessons(section.section_id);
            const isEditing = editingSectionId === section.section_id;

            return (
              <Box key={section.section_id} sx={{ mb: 2 }}>
                {/* Section Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    bgcolor: selectedSectionId === section.section_id ? 'action.selected' : 'grey.100',
                    borderRadius: 1,
                    mb: 0.5,
                    border: selectedSectionId === section.section_id ? 2 : 0,
                    borderColor: 'primary.main',
                  }}
                >
                  {isEditing ? (
                    <TextField
                      inputRef={(el) => {
                        sectionTitleRef.current = el;
                      }}
                      size="small"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditSection();
                        if (e.key === 'Escape') handleCancelEditSection();
                      }}
                      onBlur={handleSaveEditSection}
                      placeholder="Untitled section"
                      autoFocus
                      error={shouldShowError && (!editTitle || editTitle.trim() === '') && shouldShowError('section', section.section_id, 'title')}
                      helperText={shouldShowError && (!editTitle || editTitle.trim() === '') && shouldShowError('section', section.section_id, 'title') ? 'Section title is required' : ''}
                      sx={{ flex: 1, mr: 1 }}
                    />
                  ) : (
                    <>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ flex: 1, fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => {
                          handleStartEditSection(section);
                        }}
                      >
                        {section.title || 'Untitled section'}
                      </Typography>
                      <Chip label={`${sectionLessons.length} lesson${sectionLessons.length !== 1 ? 's' : ''}`} size="small" />
                    </>
                  )}

                  {!isEditing && (
                    <Box sx={{ ml: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleStartEditSection(section)}
                        title="Rename section"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={sectionIndex === 0}
                        onClick={() => onReorderSection(section.section_id, 'up')}
                        title="Move up"
                      >
                        <ArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={sectionIndex === sortedSections.length - 1}
                        onClick={() => onReorderSection(section.section_id, 'down')}
                        title="Move down"
                      >
                        <ArrowDownIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onDeleteSection(section.section_id)}
                        title="Delete section"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}

                  {isEditing && (
                    <Box sx={{ ml: 1 }}>
                      <IconButton size="small" onClick={handleSaveEditSection} color="primary">
                        <Typography variant="caption">Save</Typography>
                      </IconButton>
                      <IconButton size="small" onClick={handleCancelEditSection}>
                        <Typography variant="caption">Cancel</Typography>
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {/* Lessons in Section */}
                <List dense>
                  {sectionLessons.length === 0 ? (
                    <ListItem disablePadding sx={{ pl: 2, mb: 1 }}>
                      <Alert 
                        severity="info" 
                        sx={{ width: '100%', py: 0.5 }}
                        action={
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => onAddLesson(section.section_id)}
                            sx={{ textTransform: 'none' }}
                          >
                            Add Lesson
                          </Button>
                        }
                      >
                        <Typography variant="caption">
                          Add a lesson to publish
                        </Typography>
                      </Alert>
                    </ListItem>
                  ) : (
                    <>
                      {sectionLessons.map((lesson, lessonIndex) => (
                        <ListItem
                          key={lesson.lesson_id}
                          disablePadding
                          sx={{
                            pl: 2,
                            bgcolor: selectedLessonId === lesson.lesson_id ? 'action.selected' : 'transparent',
                          }}
                        >
                          <ListItemButton
                            onClick={() => onSelectLesson(lesson.lesson_id)}
                            sx={{ py: 0.5 }}
                          >
                            <ListItemText
                              primary={lesson.title || 'Untitled Lesson'}
                              secondary={lesson.type}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <IconButton
                                size="small"
                                disabled={lessonIndex === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReorderLesson(lesson.lesson_id, 'up');
                                }}
                                title="Move up"
                              >
                                <ArrowUpIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                disabled={lessonIndex === sectionLessons.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReorderLesson(lesson.lesson_id, 'down');
                                }}
                                title="Move down"
                              >
                                <ArrowDownIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLesson(lesson.lesson_id);
                                }}
                                title="Delete lesson"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      ))}
                      <ListItem disablePadding sx={{ pl: 2 }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => onAddLesson(section.section_id)}
                          sx={{ textTransform: 'none' }}
                        >
                          Add Lesson
                        </Button>
                      </ListItem>
                    </>
                  )}
                </List>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}



