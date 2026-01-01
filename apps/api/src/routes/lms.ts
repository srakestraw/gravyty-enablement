/**
 * LMS Routes
 * 
 * Learner-facing LMS API routes under /v1/lms/*
 */

import express from 'express';
import { requireRole } from '../middleware/jwtAuth';
import * as lmsHandlers from '../handlers/lms';
import * as courseAssetHandlers from '../handlers/courseAssets';

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

// My Learning
router.get('/me', lmsHandlers.getMyLearning);

// Assignments
router.get('/assignments', lmsHandlers.listAssignments);

// Certificates
router.get('/certificates', lmsHandlers.listCertificates);
router.get('/certificates/:certificateId', lmsHandlers.getCertificate);
router.get('/certificates/:certificateId/download', lmsHandlers.downloadCertificate);

export default router;

