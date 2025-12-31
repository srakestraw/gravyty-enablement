/**
 * Unified Node Model for Course Tree Editor
 * 
 * Represents Course, Section, and Lesson as nodes in a single tree structure
 */

import type { Course, CourseSection, Lesson } from '@gravyty/domain';

export type NodeType = 'course' | 'section' | 'lesson';

export interface CourseTreeNode {
  type: NodeType;
  id: string;
  parentId: string | null; // null for course root
  title: string;
  orderIndex: number;
  status?: 'draft' | 'published' | 'archived';
  issuesCount?: number; // Computed validation issues count
  
  // Type-specific data
  courseData?: Course;
  sectionData?: CourseSection;
  lessonData?: Lesson;
  
  // Tree structure
  children?: CourseTreeNode[];
}

/**
 * Convert Course + Sections + Lessons to tree nodes
 */
export function buildCourseTree(
  course: Course | null,
  sections: CourseSection[],
  lessons: Lesson[],
  validationIssues?: Array<{ entityType?: NodeType; entityId?: string; severity: 'error' | 'warning' }>
): CourseTreeNode | null {
  if (!course) return null;

  // Count issues per entity
  const issueCounts = new Map<string, number>();
  if (validationIssues) {
    validationIssues.forEach((issue) => {
      if (issue.entityType && issue.entityId && issue.severity === 'error') {
        const key = `${issue.entityType}:${issue.entityId}`;
        issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
      }
    });
  }

  const getIssuesCount = (type: NodeType, id: string): number => {
    return issueCounts.get(`${type}:${id}`) || 0;
  };

  // Build section nodes with their lessons
  const sectionNodes: CourseTreeNode[] = sections
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const sectionLessons = section.lesson_ids
        .map((lessonId) => lessons.find((l) => l.lesson_id === lessonId))
        .filter((l): l is Lesson => l !== undefined)
        .sort((a, b) => a.order - b.order)
        .map((lesson) => ({
          type: 'lesson' as const,
          id: lesson.lesson_id,
          parentId: section.section_id,
          title: lesson.title || 'Untitled Lesson',
          orderIndex: lesson.order,
          status: course.status,
          issuesCount: getIssuesCount('lesson', lesson.lesson_id),
          lessonData: lesson,
        }));

      return {
        type: 'section' as const,
        id: section.section_id,
        parentId: course.course_id,
        title: section.title || 'Untitled Section',
        orderIndex: section.order,
        status: course.status,
        issuesCount: getIssuesCount('section', section.section_id),
        sectionData: section,
        children: sectionLessons,
      };
    });

  // Build course root node
  return {
    type: 'course',
    id: course.course_id,
    parentId: null,
    title: course.title || 'Untitled Course',
    orderIndex: 0,
    status: course.status,
    issuesCount: getIssuesCount('course', course.course_id),
    courseData: course,
    children: sectionNodes,
  };
}

/**
 * Find a node in the tree by ID
 */
export function findNodeById(tree: CourseTreeNode | null, nodeId: string): CourseTreeNode | null {
  if (!tree) return null;
  if (tree.id === nodeId) return tree;
  
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Get all nodes flattened (for validation/iteration)
 */
export function flattenTree(tree: CourseTreeNode | null): CourseTreeNode[] {
  if (!tree) return [];
  
  const result: CourseTreeNode[] = [tree];
  
  if (tree.children) {
    tree.children.forEach((child) => {
      result.push(...flattenTree(child));
    });
  }
  
  return result;
}

