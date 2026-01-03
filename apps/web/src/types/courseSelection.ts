/**
 * Selection Model for Course Authoring
 * 
 * Represents what is currently being edited in the course authoring UI
 */

export type SelectionKind = 'course_details' | 'section' | 'lesson';

export interface CourseSelection {
  kind: SelectionKind;
  id?: string; // Required for section/lesson, optional for course_details
}

export function parseSelectionFromUrl(selected: string | null): CourseSelection | null {
  if (!selected) return null;
  
  // Format: "course_details", "section:ID", or "lesson:ID"
  if (selected === 'course_details') {
    return { kind: 'course_details' };
  }
  
  const [kind, id] = selected.split(':');
  if ((kind === 'section' || kind === 'lesson') && id) {
    return { kind, id };
  }
  
  return null;
}

export function selectionToUrlParam(selection: CourseSelection | null): string | null {
  if (!selection) return null;
  
  if (selection.kind === 'course_details') {
    return 'course_details';
  }
  
  if (selection.kind === 'section' || selection.kind === 'lesson') {
    return selection.id ? `${selection.kind}:${selection.id}` : null;
  }
  
  return null;
}


