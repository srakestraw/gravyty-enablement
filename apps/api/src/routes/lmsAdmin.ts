/**
 * LMS Admin Routes
 * 
 * Admin-facing LMS API routes under /v1/lms/admin/*
 */

import express from 'express';
import { requireRoleNew as requireRole } from '../middleware/jwtAuth.new';
import * as lmsAdminHandlers from '../handlers/lmsAdmin';
import * as courseAssetHandlers from '../handlers/courseAssets';
import * as assessmentAdminHandlers from '../handlers/assessmentAdmin';

const router = express.Router();

// Middleware for raw binary uploads (only for upload endpoint)
const rawBodyParser = express.raw({ type: '*/*', limit: '50mb' });

// All admin routes require Contributor+ role (individual routes may require higher)
router.use(requireRole('Contributor'));

// Courses admin
router.get('/courses', lmsAdminHandlers.listAdminCourses);
router.post('/courses', requireRole('Contributor'), lmsAdminHandlers.createCourse);
router.get('/courses/:courseId', lmsAdminHandlers.getAdminCourse);
router.put('/courses/:courseId', requireRole('Contributor'), lmsAdminHandlers.updateCourse);
router.delete('/courses/:courseId', requireRole('Admin'), lmsAdminHandlers.deleteCourse);
router.get('/courses/:courseId/lessons', lmsAdminHandlers.getAdminCourseLessons);
router.put('/courses/:courseId/lessons', requireRole('Contributor'), lmsAdminHandlers.updateCourseLessons);
router.post('/courses/:courseId/publish', requireRole('Approver'), lmsAdminHandlers.publishCourse);
router.post('/courses/:courseId/archive', requireRole('Approver'), lmsAdminHandlers.archiveCourse);
router.post('/courses/:courseId/restore', requireRole('Approver'), lmsAdminHandlers.restoreCourse);

// Course Assets (Content Hub integration)
router.post('/courses/:id/assets', requireRole('Contributor'), courseAssetHandlers.attachAssetToCourse);
router.get('/courses/:id/assets', courseAssetHandlers.listCourseAssets);
router.patch('/courses/:id/assets/:courseAssetId', requireRole('Contributor'), courseAssetHandlers.updateCourseAsset);
router.delete('/courses/:id/assets/:courseAssetId', requireRole('Contributor'), courseAssetHandlers.detachAssetFromCourse);

// Assessment admin
router.get('/courses/:courseId/assessment', assessmentAdminHandlers.getAssessmentConfig);
router.put('/courses/:courseId/assessment', requireRole('Contributor'), assessmentAdminHandlers.saveAssessmentConfig);
router.get('/courses/:courseId/assessment/questions', assessmentAdminHandlers.getAssessmentQuestions);
router.put('/courses/:courseId/assessment/questions', requireRole('Contributor'), assessmentAdminHandlers.saveAssessmentQuestions);
router.get('/courses/:courseId/assessment/results', assessmentAdminHandlers.getAssessmentResults);
router.get('/courses/:courseId/assessment/results/:learnerId', assessmentAdminHandlers.getLearnerAssessmentResults);

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
// Contributors can upload media for courses they're working on
router.get('/media', requireRole('Contributor'), lmsAdminHandlers.listMedia);
router.post('/media/presign', requireRole('Contributor'), lmsAdminHandlers.presignMediaUpload);
router.put('/media/:media_id/upload', requireRole('Contributor'), rawBodyParser, lmsAdminHandlers.uploadMedia);
router.get('/media/:media_id/url', requireRole('Contributor'), lmsAdminHandlers.getMediaUrl);
router.delete('/media/:media_id', requireRole('Admin'), lmsAdminHandlers.deleteMedia); // Only Admins can delete
router.post('/media/:media_id/transcribe', requireRole('Admin'), lmsAdminHandlers.startMediaTranscription);
router.post('/media/cleanup', requireRole('Admin'), lmsAdminHandlers.cleanupOrphanedMedia);

// AI Image Generation
router.post('/ai/suggest-image-prompt', requireRole('Contributor'), lmsAdminHandlers.suggestImagePrompt);
router.post('/ai/generate-image', requireRole('Contributor'), lmsAdminHandlers.generateAIImage);
router.post('/ai/download-image', requireRole('Contributor'), lmsAdminHandlers.downloadAIImage);

// AI Chat Completion
router.post('/ai/chat-completion', requireRole('Contributor'), lmsAdminHandlers.chatCompletion);

// Unsplash Integration
router.get('/unsplash/search', requireRole('Contributor'), lmsAdminHandlers.searchUnsplash);
router.get('/unsplash/trending', requireRole('Contributor'), lmsAdminHandlers.getTrendingUnsplash);

export default router;

