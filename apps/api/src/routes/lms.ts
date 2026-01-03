/**
 * LMS Routes
 * 
 * Learner-facing LMS API routes under /v1/lms/*
 */

import express from 'express';
import { requireRoleNew as requireRole } from '../middleware/jwtAuth.new';
import * as lmsHandlers from '../handlers/lms';
import * as courseAssetHandlers from '../handlers/courseAssets';
import * as assessmentHandlers from '../handlers/assessment';

const router = express.Router();

// All LMS routes require Viewer+ role
router.use(requireRole('Viewer'));

// Health
router.get('/health', lmsHandlers.getLmsHealth);

// Catalog
router.get('/courses', lmsHandlers.listCourses);
router.get('/paths', lmsHandlers.listPaths);

// Detail
router.get('/courses/:courseId', lmsHandlers.getCourseDetail);
router.get('/courses/:courseId/lessons/:lessonId', lmsHandlers.getLessonDetail);
router.get('/courses/:courseId/assets', courseAssetHandlers.listCourseAssets); // Learner-facing course assets
router.get('/paths/:pathId', lmsHandlers.getPathDetail);
router.post('/paths/:pathId/start', lmsHandlers.startPath);

// Enrollment and progress
router.post('/enrollments', lmsHandlers.createEnrollment);
router.post('/progress', lmsHandlers.updateProgress);

// Assessments
router.get('/courses/:courseId/assessment', assessmentHandlers.getAssessmentSummary);
router.get('/courses/:courseId/assessment/me', assessmentHandlers.getMyAssessment);
router.post('/courses/:courseId/assessment/attempts/start', assessmentHandlers.startAssessmentAttempt);
router.post('/courses/:courseId/assessment/attempts/:attemptId/submit', assessmentHandlers.submitAssessmentAttempt);
router.get('/courses/:courseId/assessment/attempts/:attemptId', assessmentHandlers.getAttemptResults);

// My Learning
router.get('/me', lmsHandlers.getMyLearning);

// Assignments
router.get('/assignments', lmsHandlers.listAssignments);

// Certificates
router.get('/certificates', lmsHandlers.listCertificates);
router.get('/certificates/:certificateId', lmsHandlers.getCertificate);
router.get('/certificates/:certificateId/download', lmsHandlers.downloadCertificate);

export default router;

