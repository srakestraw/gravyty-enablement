/**
 * LMS Admin Routes
 * 
 * Admin-facing LMS API routes under /v1/lms/admin/*
 */

import express from 'express';
import { requireRole } from '../middleware/jwtAuth';
import * as lmsAdminHandlers from '../handlers/lmsAdmin';

const router = express.Router();

// All admin routes require Contributor+ role (individual routes may require higher)
router.use(requireRole('Contributor'));

// Courses admin
router.get('/courses', lmsAdminHandlers.listAdminCourses);
router.post('/courses', requireRole('Contributor'), lmsAdminHandlers.createCourse);
router.get('/courses/:courseId', lmsAdminHandlers.getAdminCourse);
router.put('/courses/:courseId', requireRole('Contributor'), lmsAdminHandlers.updateCourse);
router.get('/courses/:courseId/lessons', lmsAdminHandlers.getAdminCourseLessons);
router.put('/courses/:courseId/lessons', requireRole('Contributor'), lmsAdminHandlers.updateCourseLessons);
router.post('/courses/:courseId/publish', requireRole('Approver'), lmsAdminHandlers.publishCourse);

// Paths admin
router.get('/paths', lmsAdminHandlers.listAdminPaths);
router.post('/paths', requireRole('Contributor'), lmsAdminHandlers.createPath);
router.get('/paths/:pathId', lmsAdminHandlers.getAdminPath);
router.put('/paths/:pathId', requireRole('Contributor'), lmsAdminHandlers.updatePath);
router.post('/paths/:pathId/publish', requireRole('Approver'), lmsAdminHandlers.publishPath);

// Assignments admin
router.get('/assignments', requireRole('Admin'), lmsAdminHandlers.listAdminAssignments);
router.post('/assignments', requireRole('Admin'), lmsAdminHandlers.createAssignment);
router.post('/assignments/waive', requireRole('Admin'), lmsAdminHandlers.waiveAssignment);

// Certificate Templates admin
router.get('/certificates/templates', lmsAdminHandlers.listCertificateTemplates);
router.post('/certificates/templates', requireRole('Contributor'), lmsAdminHandlers.createCertificateTemplate);
router.get('/certificates/templates/:templateId', lmsAdminHandlers.getCertificateTemplate);
router.put('/certificates/templates/:templateId', requireRole('Contributor'), lmsAdminHandlers.updateCertificateTemplate);
router.post('/certificates/templates/:templateId/publish', requireRole('Approver'), lmsAdminHandlers.publishCertificateTemplate);
router.post('/certificates/templates/:templateId/archive', requireRole('Approver'), lmsAdminHandlers.archiveCertificateTemplate);

// Media Library admin
router.get('/media', requireRole('Admin'), lmsAdminHandlers.listMedia);
router.post('/media/presign', requireRole('Admin'), lmsAdminHandlers.presignMediaUpload);
router.post('/media/:media_id/transcribe', requireRole('Admin'), lmsAdminHandlers.startMediaTranscription);

export default router;

