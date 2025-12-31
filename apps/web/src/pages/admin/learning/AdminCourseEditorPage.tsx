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
} from '@mui/material';
import {
  Save as SaveIcon,
  Publish as PublishIcon,
  Visibility as PreviewIcon,
  CheckCircle as SavedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAdminCourse } from '../../../hooks/useAdminCourse';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { validateCoursePublish, getValidationSummary, validateCourseDraft } from '../../../validations/lmsValidations';
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
  const { data, loading, error, refetch } = useAdminCourse(isNew ? null : courseId || null);

  // Local state
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Inspector panel state - persist in localStorage
  // Always default to closed, only restore from localStorage for existing courses
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorActiveTab, setInspectorActiveTab] = useState<'issues' | 'properties'>('issues');
  
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
      const storedTab = localStorage.getItem('lms.courseEditor.inspectorTab');
      if (storedTab === 'issues' || storedTab === 'properties') {
        setInspectorActiveTab(storedTab);
      }
    } else {
      // Explicitly close for new courses
      setInspectorOpen(false);
      setInspectorActiveTab('issues');
    }
  }, [isNew, courseId]);
  
  // Persist inspector state to localStorage (but not for new courses)
  useEffect(() => {
    if (!isNew) {
      localStorage.setItem('lms.courseEditor.inspectorOpen', String(inspectorOpen));
    }
  }, [inspectorOpen, isNew]);
  
  useEffect(() => {
    if (!isNew) {
      localStorage.setItem('lms.courseEditor.inspectorTab', inspectorActiveTab);
    }
  }, [inspectorActiveTab, isNew]);
  
  // Handler to open inspector to Issues tab (called from Issues chip)
  const handleOpenInspectorToIssues = () => {
    // If inspector is already open and on Issues tab, do nothing
    if (inspectorOpen && inspectorActiveTab === 'issues') {
      return;
    }
    
    // Switch to Issues tab (or open if closed)
    setInspectorActiveTab('issues');
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
  const [saving, setSaving] = useState(false);
  const [savingLessons, setSavingLessons] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishedCourses, setPublishedCourses] = useState<Array<{ course_id: string; title: string }>>([]);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  
  // Validation state model
  const [hasAttemptedPublish, setHasAttemptedPublish] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  // Debounce refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveLessonsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Load course data
  useEffect(() => {
    if (data?.course) {
      setCourse(data.course);
    }
  }, [data]);

  // Load lessons for course
  useEffect(() => {
    if (course && course.course_id !== 'new') {
      lmsAdminApi.getCourseLessons(course.course_id)
        .then((response) => {
          if ('data' in response) {
            setLessons(response.data.lessons);
          }
        })
        .catch((err) => {
          console.error('Failed to load lessons:', err);
          setLessons([]);
        });
    } else {
      setLessons([]);
    }
  }, [course?.course_id]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (saveLessonsTimeoutRef.current) {
        clearTimeout(saveLessonsTimeoutRef.current);
      }
    };
  }, []);

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

  // Validation
  const validationResult = useMemo(() => {
    if (!course) return { valid: false, errors: [], warnings: [] };
    return validateCoursePublish(course, lessons);
  }, [course, lessons]);

  // Draft validation with warnings
  const draftValidation = useMemo(() => {
    if (!course) return { errors: [], warnings: [] };
    return validateCourseDraft(course, lessons);
  }, [course, lessons]);

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
    
    if (hasAttemptedPublish) return true;
    const key = `${entityType}:${entityId}:${fieldKey}`;
    return touchedFields.has(key);
  }, [hasAttemptedPublish, touchedFields, selection]);

  // Helper to mark field as touched
  const markFieldTouched = useCallback((entityType: 'course' | 'section' | 'lesson', entityId: string, fieldKey: string) => {
    const key = `${entityType}:${entityId}:${fieldKey}`;
    setTouchedFields((prev) => new Set(prev).add(key));
  }, []);

  // Debounced auto-save for course metadata
  const debouncedSaveCourse = useCallback(async (updates: Partial<Course>) => {
    if (!course || isNew || isSavingRef.current) return;
    
    isSavingRef.current = true;
    setSaving(true);
    
    try {
      await lmsAdminApi.updateCourse(course.course_id, updates);
      await refetch();
      setLastSaved(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }, [course, isNew, refetch]);

  // Course update handlers with debounced autosave
  const handleUpdateCourse = useCallback((updates: Partial<Course>) => {
    if (!course) return;

    // Always update the course state immediately for validation
    const updatedCourse = { ...course, ...updates };
    setCourse(updatedCourse);

    // Only auto-save to backend if not a new course
    if (!isNew) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce auto-save (1000ms)
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSaveCourse(updates);
      }, 1000);
    }
  }, [course, isNew, debouncedSaveCourse]);

  // Save lessons structure to backend (with debouncing and refetch)
  const saveLessonsStructure = useCallback(async (immediate = false) => {
    if (!course || isNew) return;

    const doSave = async () => {
      setSavingLessons(true);
      try {
        const sections = course.sections.map((s) => ({
          section_id: s.section_id,
          title: s.title,
          order: s.order,
          lesson_ids: s.lesson_ids,
        }));

        const lessonsData = lessons.map((l) => ({
          lesson_id: l.lesson_id,
          section_id: l.section_id,
          title: l.title,
          description: l.description,
          type: l.type,
          order: l.order,
          content: l.content || (() => {
            switch (l.type) {
              case 'video':
                return { kind: 'video' as const, video_id: '', duration_seconds: 0 };
              case 'reading':
                return { kind: 'reading' as const, format: 'markdown' as const, markdown: '' };
              case 'quiz':
                return { kind: 'quiz' as const, questions: [], passing_score_percent: 70, allow_retry: false, show_answers_after_submit: false };
              case 'assignment':
                return { kind: 'assignment' as const, instructions_markdown: '', submission_type: 'none' as const };
              case 'interactive':
                return { kind: 'interactive' as const, provider: 'embed' as const, embed_url: '', height_px: 600, allow_fullscreen: true };
              default:
                return { kind: 'video' as const, video_id: '', duration_seconds: 0 };
            }
          })(),
          resources: l.resources || [],
          required: l.required,
        }));

        await lmsAdminApi.updateCourseLessons(course.course_id, {
          sections,
          lessons: lessonsData,
        });
        
        // Refetch lessons to ensure UI matches backend
        const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
        if ('data' in lessonsResponse) {
          setLessons(lessonsResponse.data.lessons);
        }
        
        // Refetch course to sync sections
        await refetch();
        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to save lessons structure:', err);
        setSaveError(err instanceof Error ? err.message : 'Failed to save lessons');
      } finally {
        setSavingLessons(false);
      }
    };

    if (immediate) {
      // Clear any pending timeout and save immediately
      if (saveLessonsTimeoutRef.current) {
        clearTimeout(saveLessonsTimeoutRef.current);
      }
      await doSave();
    } else {
      // Debounce (750ms)
      if (saveLessonsTimeoutRef.current) {
        clearTimeout(saveLessonsTimeoutRef.current);
      }
      saveLessonsTimeoutRef.current = setTimeout(doSave, 750);
    }
  }, [course, lessons, isNew, refetch]);

  // Auto-save on node change (debounced) - only for sections/lessons
  useEffect(() => {
    if (!selection || selection.kind === 'course_details' || !course || course.course_id === 'new') return;
    
    // Debounce save when node changes
    const timeoutId = setTimeout(() => {
      saveLessonsStructure(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selection?.id, course?.course_id, saveLessonsStructure]);

  // Section update handler
  const handleUpdateSection = useCallback((sectionId: string, updates: Partial<CourseSection>) => {
    if (!course) return;

    const updatedSections = course.sections.map((s) =>
      s.section_id === sectionId ? { ...s, ...updates } : s
    );
    setCourse({ ...course, sections: updatedSections });
    saveLessonsStructure(false);
  }, [course, saveLessonsStructure]);

  // Lesson update handlers (triggers debounced save)
  const handleUpdateLesson = useCallback((updates: Partial<Lesson>) => {
    if (!selectedNode || selectedNode.type !== 'lesson' || !course) return;

    const updatedLesson = { ...selectedNode.lessonData!, ...updates };
    const updatedLessons = lessons.map((l) =>
      l.lesson_id === selectedNode.id ? updatedLesson : l
    );
    setLessons(updatedLessons);

    // Trigger debounced save
    saveLessonsStructure(false);
  }, [selectedNode, course, lessons, saveLessonsStructure]);

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
    setCourse({ ...course, sections: updatedSections });
    
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
    
    saveLessonsStructure(false);
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

  const handleReorderSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!course) return;

    const sections = [...course.sections].sort((a, b) => a.order - b.order);
    const index = sections.findIndex((s) => s.section_id === sectionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    sections[index].order = index;
    sections[newIndex].order = newIndex;

    setCourse({ ...course, sections });
    saveLessonsStructure(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!course || !courseTree) return;

    const node = findNodeById(courseTree, nodeId);
    if (!node) return;

    if (node.type === 'section') {
      const section = course.sections.find((s) => s.section_id === nodeId);
      if (!section) return;

      // Remove lessons in this section
      const updatedLessons = lessons.filter((l) => l.section_id !== nodeId);
      setLessons(updatedLessons);

      // Remove section and reorder
      const updatedSections = course.sections
        .filter((s) => s.section_id !== nodeId)
        .map((s, idx) => ({ ...s, order: idx }));
      setCourse({ ...course, sections: updatedSections });

      if (selection?.kind === 'section' && selection.id === nodeId) {
        // Clear selection or select course details if section was selected
        handleSelectCourseDetails();
      }

      saveLessonsStructure(false);
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
      setCourse({ ...course, sections: updatedSections });

      // Remove lesson
      const updatedLessons = lessons.filter((l) => l.lesson_id !== nodeId);
      setLessons(updatedLessons);

      if (selection?.kind === 'lesson' && selection.id === nodeId) {
        // Select parent section when lesson is deleted
        handleSelectNode(section.section_id);
      }

      saveLessonsStructure(false);
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
    setLessons(updatedLessons);

    const updatedSection = {
      ...section,
      lesson_ids: [...section.lesson_ids, newLesson.lesson_id],
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === sectionId ? updatedSection : s
    );
    setCourse({ ...course, sections: updatedSections });

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
    
    saveLessonsStructure(false);
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
    setLessons(updatedLessons);

    const updatedSection = {
      ...section,
      lesson_ids: sectionLessons.map((l) => l.lesson_id),
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === section.section_id ? updatedSection : s
    );
    setCourse({ ...course, sections: updatedSections });

    saveLessonsStructure(false);
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
      setCourse({ ...course, sections: updatedSections });
    }

    // Add to new section
    const updatedTargetSection = {
      ...targetSection,
      lesson_ids: [...targetSection.lesson_ids, lessonId],
    };
    const updatedSections = course.sections.map((s) =>
      s.section_id === targetSectionId ? updatedTargetSection : s
    );
    setCourse({ ...course, sections: updatedSections });

    // Update lesson
    const updatedLesson = {
      ...lesson,
      section_id: targetSectionId,
      order: targetSection.lesson_ids.length,
    };
    const updatedLessons = lessons.map((l) =>
      l.lesson_id === lessonId ? updatedLesson : l
    );
    setLessons(updatedLessons);

    saveLessonsStructure(false);
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
    setCourse({ ...course, sections: updatedSections });

    // Remove lesson
    const updatedLessons = lessons.filter((l) => l.lesson_id !== lessonId);
    setLessons(updatedLessons);

    if (selectedLessonId === lessonId) {
      setSelectedLessonId(null);
    }

    saveLessonsStructure(false);
  };

  // Save draft
  const handleSave = async () => {
    if (!course) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (isNew) {
        const response = await lmsAdminApi.createCourse({
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          product: course.product,
          product_suite: course.product_suite,
          topic_tags: course.topic_tags,
          product_id: course.product_id,
          product_suite_id: course.product_suite_id,
          topic_tag_ids: course.topic_tag_ids,
          badges: course.badges,
          estimated_minutes: course.estimated_minutes,
        });

        if ('data' in response) {
          navigate(`/enablement/admin/learning/courses/${response.data.course.course_id}`);
        }
      } else {
        await lmsAdminApi.updateCourse(course.course_id, {
          title: course.title,
          description: course.description,
          short_description: course.short_description,
          product: course.product,
          product_suite: course.product_suite,
          topic_tags: course.topic_tags,
          product_id: course.product_id,
          product_suite_id: course.product_suite_id,
          topic_tag_ids: course.topic_tag_ids,
          badges: course.badges,
          cover_image: course.cover_image,
          estimated_minutes: course.estimated_minutes,
        });
        await saveLessonsStructure(true); // Immediate save on explicit Save Draft
        await refetch();
        
        // Also refetch lessons
        const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
        if ('data' in lessonsResponse) {
          setLessons(lessonsResponse.data.lessons);
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!course || isNew) return;

    // Set hasAttemptedPublish to show inline errors
    setHasAttemptedPublish(true);

    // Don't proceed if validation fails
    if (!validationResult.valid) {
      // Show inspector and scroll to first error
      setInspectorOpen(true);
      
      // Find first error and navigate to it
      const firstError = draftValidation.errors[0];
      if (firstError && firstError.entityType && firstError.entityId) {
        if (firstError.entityType === 'course') {
          handleSelectCourseDetails();
        } else {
          handleSelectNode(firstError.entityId);
        }
        setTimeout(() => {
          if (firstError.fieldKey) {
            focusRegistry.focus(firstError.entityType!, firstError.entityId!, firstError.fieldKey);
          }
        }, 200);
      }
      return;
    }

    setPublishing(true);
    setSaveError(null);

    try {
      await lmsAdminApi.publishCourse(course.course_id);
      navigate('/enablement/admin/learning/courses');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish course');
      // Show inspector on publish failure
      setInspectorOpen(true);
    } finally {
      setPublishing(false);
    }
  };

  // Preview as learner (deep-link to first lesson)
  const handlePreview = () => {
    if (!course) return;

    // Set hasAttemptedPublish to show inline errors if validation fails
    setHasAttemptedPublish(true);

    // Check if course is published before previewing
    if (course.status !== 'published') {
      return;
    }

    // Find first lesson by section order ASC, lesson order ASC
    const sortedSections = [...course.sections].sort((a, b) => a.order - b.order);
    let firstLessonId: string | null = null;

    for (const section of sortedSections) {
      if (section.lesson_ids && section.lesson_ids.length > 0) {
        // Get lessons in this section and sort by order
        const sectionLessons = section.lesson_ids
          .map((id) => lessons.find((l) => l.lesson_id === id))
          .filter((l): l is Lesson => l !== undefined)
          .sort((a, b) => a.order - b.order);

        if (sectionLessons.length > 0) {
          firstLessonId = sectionLessons[0].lesson_id;
          break;
        }
      }
    }

    if (firstLessonId) {
      window.open(`/enablement/learn/courses/${course.course_id}/lessons/${firstLessonId}`, '_blank');
    } else {
      // No lessons, open course detail
      window.open(`/enablement/learn/courses/${course.course_id}`, '_blank');
    }
  };

  // Discard changes and reload from server
  const handleDiscardChanges = async () => {
    if (!course || isNew) return;

    // Cancel any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (saveLessonsTimeoutRef.current) {
      clearTimeout(saveLessonsTimeoutRef.current);
      saveLessonsTimeoutRef.current = null;
    }

    // Refetch course and lessons
    await refetch();
    const lessonsResponse = await lmsAdminApi.getCourseLessons(course.course_id);
    if ('data' in lessonsResponse) {
      setLessons(lessonsResponse.data.lessons);
    }
    setLastSaved(null);
    setDiscardDialogOpen(false);
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error.message}</Alert>
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

  // Initialize course for new course
  if (isNew && !course) {
    const newCourse: Course = {
      course_id: 'new',
      title: '',
      short_description: '',
      status: 'draft',
      version: 1,
      sections: [],
      topic_tags: [],
      related_course_ids: [],
      badges: [],
      created_at: new Date().toISOString(),
      created_by: '',
      updated_at: new Date().toISOString(),
      updated_by: '',
    };
    setCourse(newCourse);
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal top banner - only show on publish attempt */}
      {hasAttemptedPublish && !validationResult.valid && validationResult.errors.length > 0 && (
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
            {validationResult.errors.length} issue{validationResult.errors.length !== 1 ? 's' : ''} must be fixed before publishing
          </Typography>
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ m: 2 }}>
          {saveError}
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
                saving={saving || savingLessons}
                lastSaved={lastSaved}
                publishing={publishing}
                onSave={handleSave}
                onPublish={handlePublish}
                onPreview={handlePreview}
                onDiscardChanges={() => setDiscardDialogOpen(true)}
                onCancel={() => navigate('/enablement/admin/learning/courses')}
                issuesCount={draftValidation.errors.length}
                onOpenInspector={handleOpenInspectorToIssues}
                inspectorOpen={inspectorOpen}
                inspectorActiveTab={inspectorActiveTab}
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
              activeTab={inspectorActiveTab}
              onTabChange={setInspectorActiveTab}
              editorTab={editorTab}
            />
          }
          contextPanelOpen={inspectorOpen}
          onContextPanelToggle={() => setInspectorOpen(!inspectorOpen)}
        />
      )}

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
    </Box>
  );
}
