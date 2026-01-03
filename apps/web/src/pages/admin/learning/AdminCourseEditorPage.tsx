/**
 * Admin Course Editor Page v2
 * 
 * Structured UI for editing courses with outline builder
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Visibility as PreviewIcon,
  CheckCircle as SavedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAdminCourse } from '../../../hooks/useAdminCourse';
import { useCourseEditorState } from '../../../hooks/useCourseEditorState';
import { useCourseValidation } from '../../../hooks/useCourseValidation';
import { useCourseEditorActions } from '../../../hooks/useCourseEditorActions';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { validateCourseDraft } from '../../../validations/lmsValidations';
import { TreeOutlinePanel } from '../../../components/admin/learning/TreeOutlinePanel';
import { EditorPanel } from '../../../components/admin/learning/EditorPanel';
import { CourseAuthoringLayout } from '../../../components/admin/learning/CourseAuthoringLayout';
import { Inspector } from '../../../components/admin/learning/Inspector';
import { buildCourseTree, findNodeById, type CourseTreeNode } from '../../../types/courseTree';
import { focusRegistry } from '../../../utils/focusRegistry';
import { parseSelectionFromUrl, selectionToUrlParam, type CourseSelection } from '../../../types/courseSelection';
import type { Course, CourseSection, Lesson } from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';

export function AdminCourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = courseId === 'new';

  // Phase 1: State Management Hook (handles useAdminCourse internally)
  const {
    course,
    lessons,
    loading: stateLoading,
    error: stateError,
    updateCourse,
    updateLessons,
    refetch: refetchCourseFn,
  } = useCourseEditorState({
    courseId: courseId || 'new',
    isNew,
  });
  
  // Track temporary media IDs for cleanup (for new courses)
  const [temporaryMediaIds, setTemporaryMediaIds] = useState<Set<string>>(new Set());
  
  // Cleanup temporary media function
  const cleanupTemporaryMedia = useCallback(async (mediaIdsToCleanup?: Set<string>) => {
    const idsToDelete = mediaIdsToCleanup || temporaryMediaIds;
    if (idsToDelete.size === 0) return;
    
    // Delete all temporary media in parallel
    const deletePromises = Array.from(idsToDelete).map((mediaId) =>
      lmsAdminApi.deleteMedia(mediaId).catch((err) => {
        // Log but don't fail - cleanup should be best effort
        console.warn(`Failed to delete temporary media ${mediaId}:`, err);
      })
    );
    
    await Promise.all(deletePromises);
    if (!mediaIdsToCleanup) {
      setTemporaryMediaIds(new Set());
    }
  }, [temporaryMediaIds]);
  
  // Track temporary media when uploaded
  const handleTemporaryMediaCreated = useCallback((mediaId: string) => {
    setTemporaryMediaIds((prev) => new Set(prev).add(mediaId));
  }, []);
  
  // Cleanup on unmount or navigation away (for new courses)
  useEffect(() => {
    if (!isNew) return;
    
    return () => {
      // Cleanup on component unmount (when navigating away)
      if (temporaryMediaIds.size > 0) {
        // Use a copy of the set since we're in cleanup
        const idsToCleanup = new Set(temporaryMediaIds);
        // Fire and forget - cleanup should not block navigation
        cleanupTemporaryMedia(idsToCleanup).catch((err) => {
          console.warn('Failed to cleanup temporary media on unmount:', err);
        });
      }
    };
  }, [isNew, temporaryMediaIds, cleanupTemporaryMedia]);
  
  
  // Inspector panel state - persist in localStorage
  // Always default to closed, only restore from localStorage for existing courses
  const [inspectorOpen, setInspectorOpen] = useState(false);
  
  // Editor tab state (Details or Course Outline) - persist in localStorage
  // For new courses, always default to 'details' tab
  const [editorTab, setEditorTab] = useState<'details' | 'outline'>(() => {
    // For new courses, always start on Details tab
    if (isNew) {
      return 'details';
    }
    // For existing courses, restore from localStorage or default to 'details'
    const stored = localStorage.getItem('lms.courseEditor.editorTab');
    return (stored === 'details' || stored === 'outline') ? stored : 'details';
  });
  
  // Reset to Details tab when switching to a new course
  useEffect(() => {
    if (isNew) {
      setEditorTab('details');
    }
  }, [isNew, courseId]);
  
  // Persist editor tab selection (but not for new courses)
  useEffect(() => {
    if (!isNew) {
      localStorage.setItem('lms.courseEditor.editorTab', editorTab);
    }
  }, [editorTab, isNew]);
  
  // Restore inspector state from localStorage only for existing courses (not new)
  useEffect(() => {
    if (!isNew && courseId) {
      const storedOpen = localStorage.getItem('lms.courseEditor.inspectorOpen');
      if (storedOpen === 'true') {
        setInspectorOpen(true);
      }
    } else {
      // Explicitly close for new courses
      setInspectorOpen(false);
    }
  }, [isNew, courseId]);
  
  // Persist inspector state to localStorage (but not for new courses)
  useEffect(() => {
    if (!isNew) {
      localStorage.setItem('lms.courseEditor.inspectorOpen', String(inspectorOpen));
    }
  }, [inspectorOpen, isNew]);
  
  // Handler to open inspector (called from Issues chip)
  const handleOpenInspectorToIssues = () => {
    // If inspector is already open, do nothing
    if (inspectorOpen) {
      return;
    }
    
    // Open inspector
    setInspectorOpen(true);
    
    // Scroll to first issue after a brief delay to allow panel to open and errors to expand
    setTimeout(() => {
      // Expand errors section if collapsed
      const errorsButton = document.querySelector('[aria-label*="Expand errors"]');
      if (errorsButton) {
        (errorsButton as HTMLElement).click();
      }
      // Then scroll to first issue
      setTimeout(() => {
        const firstIssue = document.querySelector('[data-issue-item]');
        if (firstIssue) {
          firstIssue.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    }, 100);
  };
  
  // Selection state - what is currently being edited
  const [selection, setSelection] = useState<CourseSelection | null>(() => {
    const selected = searchParams.get('selected');
    return parseSelectionFromUrl(selected);
  });
  const [publishedCourses, setPublishedCourses] = useState<Array<{ course_id: string; title: string }>>([]);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  // Assessment data for validation
  const [assessmentConfig, setAssessmentConfig] = useState<{ is_enabled: boolean; required_for_completion: boolean } | null>(null);
  const [assessmentQuestionCount, setAssessmentQuestionCount] = useState<number>(0);
  
  // Fetch assessment data for validation
  useEffect(() => {
    if (!courseId || isNew) {
      setAssessmentConfig(null);
      setAssessmentQuestionCount(0);
      return;
    }
    
    Promise.all([
      lmsAdminApi.getAssessmentConfig(courseId).catch(() => null),
      lmsAdminApi.getAssessmentQuestions(courseId).catch(() => null),
    ]).then(([configResponse, questionsResponse]) => {
      if (configResponse && !('error' in configResponse)) {
        setAssessmentConfig({
          is_enabled: configResponse.data.is_enabled,
          required_for_completion: configResponse.data.required_for_completion,
        });
      } else {
        setAssessmentConfig(null);
      }
      
      if (questionsResponse && !('error' in questionsResponse)) {
        setAssessmentQuestionCount(questionsResponse.data.questions?.length ?? 0);
      } else {
        setAssessmentQuestionCount(0);
      }
    });
  }, [courseId, isNew]);
  
  // Phase 2: Validation Hook (must be before editorActions)
  const validation = useCourseValidation({
    course,
    lessons,
    assessmentConfig,
    assessmentQuestionCount,
  });


  // Load published courses for related courses selector
  useEffect(() => {
    if (!isNew) {
      lmsAdminApi.listCourses({ status: 'published' })
        .then((response) => {
          if ('data' in response) {
            setPublishedCourses(
              response.data.courses
                .filter((c) => c.course_id !== courseId)
                .map((c) => ({ course_id: c.course_id, title: c.title }))
            );
          }
        })
        .catch(() => {
          // Ignore errors for now
        });
    }
  }, [courseId, isNew]);

  // Draft validation with warnings (for Inspector display)
  const draftValidation = useMemo(() => {
    if (!course) return { errors: [], warnings: [] };
    return validateCourseDraft(course, lessons, assessmentConfig, assessmentQuestionCount);
  }, [course, lessons, assessmentConfig, assessmentQuestionCount]);

  // Build tree from course data
  const courseTree = useMemo(() => {
    const allIssues = [...draftValidation.errors, ...draftValidation.warnings];
    return buildCourseTree(course, course?.sections || [], lessons, allIssues);
  }, [course, lessons, draftValidation]);

  // Handle selection changes (for sections/lessons from outline)
  const handleSelectNode = useCallback((nodeId: string | null) => {
    if (!nodeId || !courseTree) {
      setSelection(null);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('selected');
      setSearchParams(newParams, { replace: true });
      return;
    }
    
    const node = findNodeById(courseTree, nodeId);
    if (!node) return;
    
    // Only handle sections and lessons (not course)
    if (node.type === 'section') {
      const newSelection: CourseSelection = { kind: 'section', id: nodeId };
      setSelection(newSelection);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('selected', selectionToUrlParam(newSelection)!);
      setSearchParams(newParams, { replace: true });
      
      setTimeout(() => {
        focusRegistry.focus('section', nodeId, 'title');
      }, 100);
    } else if (node.type === 'lesson') {
      const newSelection: CourseSelection = { kind: 'lesson', id: nodeId };
      setSelection(newSelection);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('selected', selectionToUrlParam(newSelection)!);
      setSearchParams(newParams, { replace: true });
      
      setTimeout(() => {
        focusRegistry.focus('lesson', nodeId, 'title');
      }, 100);
    }
  }, [courseTree, searchParams, setSearchParams]);

  // Handle course details selection
  const handleSelectCourseDetails = useCallback(() => {
    const newSelection: CourseSelection = { kind: 'course_details' };
    setSelection(newSelection);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('selected', selectionToUrlParam(newSelection)!);
    setSearchParams(newParams, { replace: true });
    
    setTimeout(() => {
      if (course) {
        focusRegistry.focus('course', course.course_id, 'title');
      }
    }, 100);
  }, [course, searchParams, setSearchParams]);
  
  // When switching back to Details tab from Outline tab, reset selection to course_details
  useEffect(() => {
    if (editorTab === 'details' && selection?.kind !== 'course_details') {
      handleSelectCourseDetails();
    }
  }, [editorTab, selection?.kind, handleSelectCourseDetails]);

  // Get selected node (for sections/lessons)
  const selectedNode = useMemo(() => {
    if (!selection || selection.kind === 'course_details' || !courseTree) return null;
    if (!selection.id) return null;
    return findNodeById(courseTree, selection.id);
  }, [selection, courseTree]);

  // Default selection logic: course_details if missing required metadata, else no selection
  useEffect(() => {
    if (!course) return;
    
    const urlSelection = parseSelectionFromUrl(searchParams.get('selected'));
    if (urlSelection) {
      setSelection(urlSelection);
      return;
    }
    
    // Check if course has missing required metadata
    const hasMissingMetadata = !course.title || !course.short_description;
    if (hasMissingMetadata) {
      handleSelectCourseDetails();
    }
    // Otherwise, no default selection (user must select section/lesson or click "Edit details")
  }, [course?.course_id]); // Only run on initial load
  
  // Removed auto-open on errors - inspector should only open when user clicks Issues chip

  // Helper to determine if inline error should be shown (only for selected node)
  const shouldShowError = useCallback((entityType: 'course' | 'section' | 'lesson', entityId: string, fieldKey: string): boolean => {
    // Only show errors for the selected entity
    if (entityType === 'course') {
      if (selection?.kind !== 'course_details') return false;
    } else {
      if (selection?.kind !== entityType || selection?.id !== entityId) return false;
    }
    
    // Use validation hook's shouldShowError
    return validation.shouldShowError(entityType, entityId, fieldKey);
  }, [validation, selection]);

  // Helper to mark field as touched
  const markFieldTouched = useCallback((entityType: 'course' | 'section' | 'lesson', entityId: string, fieldKey: string) => {
    validation.markFieldTouched(entityType, entityId, fieldKey);
  }, [validation]);

  // Phase 4: Editor Actions Hook (must come after handlers are defined)
  const editorActions = useCourseEditorActions({
    course,
    lessons,
    isNew,
    validation,
    onUpdateCourse: updateCourse,
    onUpdateLessons: updateLessons,
    refetchCourse: async () => {
      await refetchCourseFn();
    },
    temporaryMediaIds,
    cleanupTemporaryMedia,
    onSelectCourseDetails: handleSelectCourseDetails,
    onSelectNode: handleSelectNode,
    onOpenInspector: handleOpenInspectorToIssues,
  });

  // Debounced auto-save for course metadata
  // Course update handler (uses hook's updateCourse)
  const handleUpdateCourse = useCallback((updates: Partial<Course>) => {
    updateCourse(updates);
  }, [updateCourse]);

  // Section update handler
  const handleUpdateSection = useCallback((sectionId: string, updates: Partial<CourseSection>) => {
    if (!course) return;

    const updatedSections = course.sections.map((s) =>
      s.section_id === sectionId ? { ...s, ...updates } : s
    );
    updateCourse({ sections: updatedSections });
  }, [course, updateCourse]);

  // Lesson update handler
  const handleUpdateLesson = useCallback((updates: Partial<Lesson>) => {
    if (!selectedNode || selectedNode.type !== 'lesson' || !course) return;

    const updatedLesson = { ...selectedNode.lessonData!, ...updates };
    const updatedLessons = lessons.map((l) =>
      l.lesson_id === selectedNode.id ? updatedLesson : l
    );
    updateLessons(updatedLessons);
  }, [selectedNode, course, lessons, updateLessons]);

  // Outline handlers
  const handleAddSection = () => {
    if (!course) return;

    const newSection: CourseSection = {
      section_id: uuidv4(),
      title: '', // Start with empty title to trigger placeholder
      order: course.sections.length,
      lesson_ids: [],
    };

    const updatedSections = [...course.sections, newSection];
    updateCourse({ sections: updatedSections });
    
    // Set selection directly since the section isn't in courseTree yet
    const newSelection: CourseSelection = { kind: 'section', id: newSection.section_id };
    setSelection(newSelection);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('selected', selectionToUrlParam(newSelection)!);
    setSearchParams(newParams, { replace: true });
    
    // Focus the section title field after the tree updates
    setTimeout(() => {
      focusRegistry.focus('section', newSection.section_id, 'title');
    }, 100);
    
    // Note: Save is handled by explicit Save Draft button
  };

  const handleRenameNode = (nodeId: string, newTitle: string) => {
    if (!course || !courseTree) return;

    const node = findNodeById(courseTree, nodeId);
    if (!node) return;

    if (node.type === 'course') {
      handleUpdateCourse({ title: newTitle });
    } else if (node.type === 'section') {
      handleUpdateSection(nodeId, { title: newTitle });
    } else if (node.type === 'lesson') {
      handleUpdateLesson({ title: newTitle });
    }
  };

  const handleReorderSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    if (!course) return;

    const sections = [...course.sections].sort((a, b) => a.order - b.order);
    const index = sections.findIndex((s) => s.section_id === sectionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    sections[index].order = index;
    sections[newIndex].order = newIndex;

    updateCourse({ sections });
    // Note: Save is handled by explicit Save Draft button
  }, [course, updateCourse]);

  const handleDeleteNode = (nodeId: string) => {
    if (!course || !courseTree) return;

    const node = findNodeById(courseTree, nodeId);
    if (!node) return;

    if (node.type === 'section') {
      const section = course.sections.find((s) => s.section_id === nodeId);
      if (!section) return;

      // Remove lessons in this section
      const updatedLessons = lessons.filter((l) => l.section_id !== nodeId);
      updateLessons(updatedLessons);

      // Remove section and reorder
      const updatedSections = course.sections
        .filter((s) => s.section_id !== nodeId)
        .map((s, idx) => ({ ...s, order: idx }));
      updateCourse({ sections: updatedSections });

      if (selection?.kind === 'section' && selection.id === nodeId) {
        // Clear selection or select course details if section was selected
        handleSelectCourseDetails();
      }

      // Note: Save is handled by explicit Save Draft button
    } else if (node.type === 'lesson') {
      const lesson = lessons.find((l) => l.lesson_id === nodeId);
      if (!lesson) return;

      const section = course.sections.find((s) => s.section_id === lesson.section_id);
      if (!section) return;

      // Remove from section
      const updatedSection = {
        ...section,
        lesson_ids: section.lesson_ids.filter((id) => id !== nodeId),
      };
      const updatedSections = course.sections.map((s) =>
        s.section_id === section.section_id ? updatedSection : s
      );
      updateCourse({ sections: updatedSections });

      // Remove lesson
      const updatedLessons = lessons.filter((l) => l.lesson_id !== nodeId);
      updateLessons(updatedLessons);

      if (selection?.kind === 'lesson' && selection.id === nodeId) {
        // Select parent section when lesson is deleted
        handleSelectNode(section.section_id);
      }

      // Note: Save is handled by explicit Save Draft button
    }
    // Course deletion not supported
  };

  const handleAddLesson = (sectionId: string) => {
    if (!course) return;

    const section = course.sections.find((s) => s.section_id === sectionId);
    if (!section) return;

    const newLesson: Lesson = {
      lesson_id: uuidv4(),
      course_id: course.course_id,
      section_id: sectionId,
      title: 'New Lesson',
      type: 'video',
      order: section.lesson_ids.length,
      content: {
        kind: 'video',
        video_id: '',
        duration_seconds: 0,
      },
      resources: [],
      required: true,
      created_at: new Date().toISOString(),
      created_by: '',
      updated_at: new Date().toISOString(),
      updated_by: '',
    };

    const updatedLessons = [...lessons, newLesson];
    updateLessons(updatedLessons);

    const updatedSection = {
      ...section,
      lesson_ids: [...section.lesson_ids, newLesson.lesson_id],
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === sectionId ? updatedSection : s
    );
    updateCourse({ sections: updatedSections });

    // Set selection directly since the lesson might not be in courseTree yet
    const newSelection: CourseSelection = { kind: 'lesson', id: newLesson.lesson_id };
    setSelection(newSelection);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('selected', selectionToUrlParam(newSelection)!);
    setSearchParams(newParams, { replace: true });
    
    // Focus the lesson title field after the tree updates
    setTimeout(() => {
      focusRegistry.focus('lesson', newLesson.lesson_id, 'title');
    }, 100);
    
    // Note: Save is handled by explicit Save Draft button
  };

  const handleReorderLesson = (lessonId: string, direction: 'up' | 'down') => {
    if (!course) return;

    const lesson = lessons.find((l) => l.lesson_id === lessonId);
    if (!lesson) return;

    const section = course.sections.find((s) => s.section_id === lesson.section_id);
    if (!section) return;

    const sectionLessons = section.lesson_ids
      .map((id) => lessons.find((l) => l.lesson_id === id))
      .filter((l): l is Lesson => l !== undefined)
      .sort((a, b) => a.order - b.order);

    const index = sectionLessons.findIndex((l) => l.lesson_id === lessonId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sectionLessons.length) return;

    [sectionLessons[index], sectionLessons[newIndex]] = [
      sectionLessons[newIndex],
      sectionLessons[index],
    ];
    sectionLessons[index].order = index;
    sectionLessons[newIndex].order = newIndex;

    const updatedLessons = lessons.map((l) => {
      const updated = sectionLessons.find((sl) => sl.lesson_id === l.lesson_id);
      return updated || l;
    });
    updateLessons(updatedLessons);

    const updatedSection = {
      ...section,
      lesson_ids: sectionLessons.map((l) => l.lesson_id),
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === section.section_id ? updatedSection : s
    );
    updateCourse({ sections: updatedSections });

    // Note: Save is handled by explicit Save Draft button
  };

  const handleMoveLesson = (lessonId: string, targetSectionId: string) => {
    if (!course) return;

    const lesson = lessons.find((l) => l.lesson_id === lessonId);
    if (!lesson) return;

    const targetSection = course.sections.find((s) => s.section_id === targetSectionId);
    if (!targetSection) return;

    // Remove from old section
    const oldSection = course.sections.find((s) => s.section_id === lesson.section_id);
    if (oldSection) {
      const updatedOldSection = {
        ...oldSection,
        lesson_ids: oldSection.lesson_ids.filter((id) => id !== lessonId),
      };
      const updatedSections = course.sections.map((s) =>
        s.section_id === oldSection.section_id ? updatedOldSection : s
      );
      updateCourse({ sections: updatedSections });
    }

    // Add to new section
    const updatedTargetSection = {
      ...targetSection,
      lesson_ids: [...targetSection.lesson_ids, lessonId],
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === targetSectionId ? updatedTargetSection : s
    );
    updateCourse({ sections: updatedSections });

    // Update lesson
    const updatedLesson = {
      ...lesson,
      section_id: targetSectionId,
      order: targetSection.lesson_ids.length,
    };
    const updatedLessons = lessons.map((l) =>
      l.lesson_id === lessonId ? updatedLesson : l
    );
    updateLessons(updatedLessons);

    // Note: Save is handled by explicit Save Draft button
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (!course) return;

    const lesson = lessons.find((l) => l.lesson_id === lessonId);
    if (!lesson) return;

    const section = course.sections.find((s) => s.section_id === lesson.section_id);
    if (!section) return;

    // Remove from section
    const updatedSection = {
      ...section,
      lesson_ids: section.lesson_ids.filter((id) => id !== lessonId),
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === section.section_id ? updatedSection : s
    );
    updateCourse({ sections: updatedSections });

    // Remove lesson
    const updatedLessons = lessons.filter((l) => l.lesson_id !== lessonId);
    updateLessons(updatedLessons);

    if (selectedLessonId === lessonId) {
      setSelectedLessonId(null);
    }

    // Note: Save is handled by explicit Save Draft button
  };

  // Phase 4: Use handlers from useCourseEditorActions hook
  const handleSave = editorActions.handleSave;
  const handlePublish = editorActions.handlePublish;
  const handlePreview = editorActions.handlePreview;
  const handleDiscardChanges = async () => {
    await editorActions.handleDiscardChanges();
    setDiscardDialogOpen(false);
  };

  const handleArchive = async () => {
    if (!course) return;
    setArchiving(true);
    try {
      const response = await lmsAdminApi.archiveCourse(course.course_id);
      if ('error' in response) {
        alert(`Failed to archive course: ${response.error.message}`);
      } else {
        // Refetch course to update status
        await refetchCourseFn();
        setArchiveDialogOpen(false);
        // Optionally navigate away or show success message
      }
    } catch (err) {
      console.error('Failed to archive course:', err);
      alert('Failed to archive course');
    } finally {
      setArchiving(false);
    }
  };

  const handleRestore = async () => {
    if (!course) return;
    setRestoring(true);
    try {
      const response = await lmsAdminApi.restoreCourse(course.course_id);
      if ('error' in response) {
        alert(`Failed to restore course: ${response.error.message}`);
      } else {
        // Refetch course to update status
        await refetchCourseFn();
        setRestoreDialogOpen(false);
      }
    } catch (err) {
      console.error('Failed to restore course:', err);
      alert('Failed to restore course');
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async () => {
    await editorActions.handleDelete();
    setDeleteDialogOpen(false);
    setDeleteConfirmationText('');
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmationText('');
  };

  const isDeleteConfirmed = deleteConfirmationText === course?.title;


  if (stateLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (stateError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{stateError?.message || 'Failed to load course'}</Alert>
      </Box>
    );
  }

  if (!course && !isNew) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Course not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal top banner - only show on publish attempt */}
      {validation.hasAttemptedPublish && !validation.canPublish() && validation.errorsCount > 0 && (
        <Alert 
          severity="error" 
          sx={{ m: 2, py: 0.5 }}
          action={
            <Button
              size="small"
              onClick={() => {
                setInspectorOpen(true);
              }}
            >
              View issues
            </Button>
          }
        >
          <Typography variant="body2">
            {validation.errorsCount} issue{validation.errorsCount !== 1 ? 's' : ''} must be fixed before publishing
          </Typography>
        </Alert>
      )}

      {editorActions.saveError && (
        <Alert severity="error" sx={{ m: 2 }}>
          {editorActions.saveError}
        </Alert>
      )}

      {/* Main Content - 3-column layout */}
      {courseTree && course && (
        <CourseAuthoringLayout
          outline={
            // Left outline panel - only show when NOT editing course details (i.e., editing section/lesson)
            // When editing course details, don't render the outline panel at all (outline is in the Course Outline tab)
            selection?.kind !== 'course_details' ? (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <TreeOutlinePanel
                  tree={courseTree}
                  selectedNodeId={selection?.kind === 'section' || selection?.kind === 'lesson' ? selection.id || null : null}
                  onSelectNode={handleSelectNode}
                  onAddSection={handleAddSection}
                  onAddLesson={handleAddLesson}
                  onRenameNode={handleRenameNode}
                  onDeleteNode={handleDeleteNode}
                  onReorderNode={(nodeId, direction) => {
                    // Stub for now - can implement later
                    console.log('Reorder node', nodeId, direction);
                  }}
                  shouldShowError={shouldShowError}
                  markFieldTouched={markFieldTouched}
                />
              </Box>
            ) : null
          }
          editor={
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-course-editor>
              <EditorPanel
                course={course}
                selection={selection}
                selectedNode={selectedNode}
                publishedCourses={publishedCourses}
                onUpdateCourse={handleUpdateCourse}
                onUpdateSection={handleUpdateSection}
                onUpdateLesson={handleUpdateLesson}
                onAddLesson={handleAddLesson}
                shouldShowError={shouldShowError}
                markFieldTouched={markFieldTouched}
                // Header props
                isNew={isNew}
                saving={editorActions.saving}
                lastSaved={editorActions.lastSaved}
                publishing={editorActions.publishing}
                onSave={handleSave}
                onPublish={handlePublish}
                onPreview={handlePreview}
                onDiscardChanges={() => setDiscardDialogOpen(true)}
                onArchive={() => setArchiveDialogOpen(true)}
                onRestore={() => setRestoreDialogOpen(true)}
                onDelete={() => setDeleteDialogOpen(true)}
                archiving={archiving}
                restoring={restoring}
                deleting={editorActions.deleting}
                onCancel={() => navigate('/enablement/admin/learning/courses')}
                validation={validation}
                canSave={editorActions.canSave}
                canPublish={editorActions.canPublish}
                onOpenInspector={handleOpenInspectorToIssues}
                inspectorOpen={inspectorOpen}
                editorTab={editorTab}
                onEditorTabChange={setEditorTab}
                // Outline panel props
                courseTree={courseTree}
                onSelectNode={handleSelectNode}
                onAddSection={handleAddSection}
                onRenameNode={handleRenameNode}
                onDeleteNode={handleDeleteNode}
                onReorderNode={(nodeId, direction) => {
                  // Stub for now - can implement later
                  console.log('Reorder node', nodeId, direction);
                }}
                onTemporaryMediaCreated={handleTemporaryMediaCreated}
              />
            </Box>
          }
          contextPanel={
            <Inspector
              selectedNode={selection?.kind === 'course_details' ? courseTree : selectedNode}
              validationIssues={[...draftValidation.errors, ...draftValidation.warnings]}
              courseTree={courseTree}
              course={course}
              onSelectCourseDetails={handleSelectCourseDetails}
              onSelectNode={handleSelectNode}
              onClose={() => setInspectorOpen(false)}
            />
          }
          contextPanelOpen={inspectorOpen}
          onContextPanelToggle={() => setInspectorOpen(!inspectorOpen)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete Course</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to delete "{course?.title || 'this course'}"? This action cannot be undone.
            The course will be archived and removed from the course list.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2 }}>
            To confirm, please type the course title: <strong>{course?.title || ''}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Course Title"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            error={deleteConfirmationText !== '' && !isDeleteConfirmed}
            helperText={
              deleteConfirmationText !== '' && !isDeleteConfirmed
                ? 'Title does not match'
                : ''
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isDeleteConfirmed && !editorActions.deleting) {
                handleDelete();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={!isDeleteConfirmed || editorActions.deleting}
          >
            {editorActions.deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discard Changes Dialog */}
      <Dialog open={discardDialogOpen} onClose={() => setDiscardDialogOpen(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will discard all unsaved changes and reload the course from the server. Any local edits will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDiscardChanges} color="error" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Course Dialog */}
      <Dialog open={archiveDialogOpen} onClose={() => !archiving && setArchiveDialogOpen(false)}>
        <DialogTitle>Archive Course</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to archive "{course?.title || 'this course'}"? The course will be hidden from the course list but can be restored later.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)} disabled={archiving}>
            Cancel
          </Button>
          <Button onClick={handleArchive} variant="contained" disabled={archiving}>
            {archiving ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Course Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => !restoring && setRestoreDialogOpen(false)}>
        <DialogTitle>Restore Course</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to restore "{course?.title || 'this course'}"? The course will be restored to draft status and will appear in the course list again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)} disabled={restoring}>
            Cancel
          </Button>
          <Button onClick={handleRestore} variant="contained" disabled={restoring}>
            {restoring ? 'Restoring...' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
