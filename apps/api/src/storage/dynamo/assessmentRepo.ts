/**
 * Assessment Repository
 * 
 * Repository for accessing assessment DynamoDB tables.
 */

import {
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import { v4 as uuidv4 } from 'uuid';
import type {
  AssessmentConfig,
  AssessmentQuestion,
  AssessmentOption,
  AssessmentAttempt,
  AssessmentAnswer,
} from '@gravyty/domain';

/**
 * Assessment Table Names
 */
export const LMS_ASSESSMENT_CONFIGS_TABLE = process.env.LMS_ASSESSMENT_CONFIGS_TABLE || 'lms_assessment_configs';
export const LMS_ASSESSMENT_QUESTIONS_TABLE = process.env.LMS_ASSESSMENT_QUESTIONS_TABLE || 'lms_assessment_questions';
export const LMS_ASSESSMENT_OPTIONS_TABLE = process.env.LMS_ASSESSMENT_OPTIONS_TABLE || 'lms_assessment_options';
export const LMS_ASSESSMENT_ATTEMPTS_TABLE = process.env.LMS_ASSESSMENT_ATTEMPTS_TABLE || 'lms_assessment_attempts';
export const LMS_ASSESSMENT_ANSWERS_TABLE = process.env.LMS_ASSESSMENT_ANSWERS_TABLE || 'lms_assessment_answers';

/**
 * Assessment Repository
 */
export class AssessmentRepo {
  /**
   * Get assessment config for a course
   */
  async getAssessmentConfig(courseId: string): Promise<AssessmentConfig | null> {
    // Query by course_id using GSI
    const command = new QueryCommand({
      TableName: LMS_ASSESSMENT_CONFIGS_TABLE,
      IndexName: 'CourseAssessmentIndex',
      KeyConditionExpression: 'course_id = :courseId',
      ExpressionAttributeValues: {
        ':courseId': courseId,
      },
      Limit: 1,
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    if (Items.length === 0) {
      return null;
    }

    const item = Items[0] as any;
    return {
      assessment_config_id: item.assessment_config_id,
      course_id: item.course_id,
      is_enabled: item.is_enabled ?? false,
      title: item.title ?? 'Assessment',
      description: item.description,
      passing_score: item.passing_score ?? 80,
      score_mode: item.score_mode ?? 'best',
      max_attempts: item.max_attempts ?? null,
      required_for_completion: item.required_for_completion ?? false,
      is_certification: item.is_certification ?? false,
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as AssessmentConfig;
  }

  /**
   * Save assessment config (create or update)
   */
  async saveAssessmentConfig(config: AssessmentConfig): Promise<AssessmentConfig> {
    const now = new Date().toISOString();
    const configToSave = {
      ...config,
      updated_at: now,
      ...(config.created_at ? {} : { created_at: now }),
    };

    const command = new PutCommand({
      TableName: LMS_ASSESSMENT_CONFIGS_TABLE,
      Item: configToSave,
    });

    await dynamoDocClient.send(command);
    return configToSave as AssessmentConfig;
  }

  /**
   * Get all questions for an assessment config
   */
  async getQuestions(assessmentConfigId: string): Promise<AssessmentQuestion[]> {
    // Query by assessment_config_id using GSI
    const command = new QueryCommand({
      TableName: LMS_ASSESSMENT_QUESTIONS_TABLE,
      IndexName: 'QuestionsByConfigIndex',
      KeyConditionExpression: 'assessment_config_id = :configId',
      ExpressionAttributeValues: {
        ':configId': assessmentConfigId,
      },
      ScanIndexForward: true, // Ascending order by order_index
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item: any) => ({
      question_id: item.question_id,
      assessment_config_id: item.assessment_config_id,
      type: item.type,
      prompt: item.prompt,
      points: item.points ?? 1,
      order_index: item.order_index,
      is_required: item.is_required ?? true,
      correct_boolean_answer: item.correct_boolean_answer,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) as AssessmentQuestion[];
  }

  /**
   * Get questions with options (for taking assessment)
   */
  async getQuestionsWithOptions(assessmentConfigId: string): Promise<Array<AssessmentQuestion & { options?: AssessmentOption[] }>> {
    const questions = await this.getQuestions(assessmentConfigId);
    
    // Get options for each question
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const options = question.type === 'multiple_choice'
          ? await this.getOptions(question.question_id)
          : undefined;
        return { ...question, options };
      })
    );

    // Sort by order_index
    return questionsWithOptions.sort((a, b) => a.order_index - b.order_index);
  }

  /**
   * Save questions (bulk operation - replaces all questions for config)
   */
  async saveQuestions(
    assessmentConfigId: string,
    questions: Array<Omit<AssessmentQuestion, 'assessment_config_id' | 'created_at' | 'updated_at'>>
  ): Promise<AssessmentQuestion[]> {
    const now = new Date().toISOString();

    // Get existing questions to delete
    const existingQuestions = await this.getQuestions(assessmentConfigId);
    const existingQuestionIds = new Set(existingQuestions.map((q) => q.question_id));

    // Prepare new questions
    const questionsToSave = questions.map((q) => ({
      ...q,
      assessment_config_id: assessmentConfigId,
      created_at: existingQuestionIds.has(q.question_id) 
        ? existingQuestions.find((eq) => eq.question_id === q.question_id)?.created_at || now
        : now,
      updated_at: now,
    }));

    // Batch write: delete old, insert new
    // Note: DynamoDB BatchWrite has 25 item limit, so we may need to chunk
    const chunks = [];
    for (let i = 0; i < questionsToSave.length; i += 25) {
      chunks.push(questionsToSave.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      const writeRequests = chunk.map((q) => ({
        PutRequest: {
          Item: {
            question_id: q.question_id,
            assessment_config_id: q.assessment_config_id,
            type: q.type,
            prompt: q.prompt,
            points: q.points,
            order_index: q.order_index,
            is_required: q.is_required,
            correct_boolean_answer: q.correct_boolean_answer,
            created_at: q.created_at,
            updated_at: q.updated_at,
          },
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [LMS_ASSESSMENT_QUESTIONS_TABLE]: writeRequests,
        },
      });

      await dynamoDocClient.send(command);
    }

    return questionsToSave as AssessmentQuestion[];
  }

  /**
   * Get options for a question
   */
  async getOptions(questionId: string): Promise<AssessmentOption[]> {
    const command = new QueryCommand({
      TableName: LMS_ASSESSMENT_OPTIONS_TABLE,
      KeyConditionExpression: 'question_id = :questionId',
      ExpressionAttributeValues: {
        ':questionId': questionId,
      },
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item: any) => ({
      option_id: item.option_id,
      question_id: item.question_id,
      label: item.label,
      order_index: item.order_index,
      is_correct: item.is_correct,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) as AssessmentOption[];
  }

  /**
   * Save options for a question (bulk - replaces all options)
   */
  async saveOptions(
    questionId: string,
    options: Array<Omit<AssessmentOption, 'question_id' | 'created_at' | 'updated_at'>>
  ): Promise<AssessmentOption[]> {
    const now = new Date().toISOString();

    // Get existing options to preserve created_at
    const existingOptions = await this.getOptions(questionId);
    const existingOptionIds = new Set(existingOptions.map((o) => o.option_id));

    const optionsToSave = options.map((o) => ({
      ...o,
      question_id: questionId,
      created_at: existingOptionIds.has(o.option_id)
        ? existingOptions.find((eo) => eo.option_id === o.option_id)?.created_at || now
        : now,
      updated_at: now,
    }));

    // Batch write
    const chunks = [];
    for (let i = 0; i < optionsToSave.length; i += 25) {
      chunks.push(optionsToSave.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      const writeRequests = chunk.map((o) => ({
        PutRequest: {
          Item: {
            option_id: o.option_id,
            question_id: o.question_id,
            label: o.label,
            order_index: o.order_index,
            is_correct: o.is_correct,
            created_at: o.created_at,
            updated_at: o.updated_at,
          },
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [LMS_ASSESSMENT_OPTIONS_TABLE]: writeRequests,
        },
      });

      await dynamoDocClient.send(command);
    }

    return optionsToSave as AssessmentOption[];
  }

  /**
   * Start an assessment attempt
   */
  async startAttempt(
    courseId: string,
    assessmentConfigId: string,
    learnerId: string
  ): Promise<AssessmentAttempt> {
    const now = new Date().toISOString();

    // Get existing attempts to determine attempt number
    const existingAttempts = await this.getLearnerAttempts(courseId, learnerId);
    const attemptNumber = existingAttempts.length + 1;

    const attemptId = `attempt_${uuidv4()}`;
    const attempt: AssessmentAttempt = {
      attempt_id: attemptId,
      course_id: courseId,
      assessment_config_id: assessmentConfigId,
      learner_id: learnerId,
      attempt_number: attemptNumber,
      status: 'in_progress',
      started_at: now,
      submitted_at: null,
      graded_at: null,
      raw_score: 0,
      max_score: 0,
      percent_score: 0,
      passed: false,
      created_at: now,
      updated_at: now,
    };

    const command = new PutCommand({
      TableName: LMS_ASSESSMENT_ATTEMPTS_TABLE,
      Item: {
        ...attempt,
        SK: `${courseId}#${learnerId}`, // Composite SK for GSI
      },
    });

    await dynamoDocClient.send(command);
    return attempt;
  }

  /**
   * Get learner's attempts for a course
   */
  async getLearnerAttempts(courseId: string, learnerId: string): Promise<AssessmentAttempt[]> {
    const command = new QueryCommand({
      TableName: LMS_ASSESSMENT_ATTEMPTS_TABLE,
      IndexName: 'LearnerAttemptsIndex',
      KeyConditionExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': `${courseId}#${learnerId}`,
      },
      ScanIndexForward: true, // Ascending order (oldest first)
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item: any) => ({
      attempt_id: item.attempt_id,
      course_id: item.course_id,
      assessment_config_id: item.assessment_config_id,
      learner_id: item.learner_id,
      attempt_number: item.attempt_number,
      status: item.status,
      started_at: item.started_at,
      submitted_at: item.submitted_at ?? null,
      graded_at: item.graded_at ?? null,
      raw_score: item.raw_score ?? 0,
      max_score: item.max_score ?? 0,
      percent_score: item.percent_score ?? 0,
      passed: item.passed ?? false,
      evidence: item.evidence,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) as AssessmentAttempt[];
  }

  /**
   * Get attempt by ID
   */
  async getAttempt(attemptId: string): Promise<AssessmentAttempt | null> {
    // Use GSI to query by attempt_id
    const command = new QueryCommand({
      TableName: LMS_ASSESSMENT_ATTEMPTS_TABLE,
      IndexName: 'AttemptByIdIndex',
      KeyConditionExpression: 'attempt_id = :attemptId',
      ExpressionAttributeValues: {
        ':attemptId': attemptId,
      },
      Limit: 1,
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    if (Items.length === 0) {
      return null;
    }

    const item = Items[0] as any;
    return {
      attempt_id: item.attempt_id,
      course_id: item.course_id,
      assessment_config_id: item.assessment_config_id,
      learner_id: item.learner_id,
      attempt_number: item.attempt_number,
      status: item.status,
      started_at: item.started_at,
      submitted_at: item.submitted_at ?? null,
      graded_at: item.graded_at ?? null,
      raw_score: item.raw_score ?? 0,
      max_score: item.max_score ?? 0,
      percent_score: item.percent_score ?? 0,
      passed: item.passed ?? false,
      evidence: item.evidence,
      created_at: item.created_at,
      updated_at: item.updated_at,
    } as AssessmentAttempt;
  }

  /**
   * Update attempt (for submission and grading)
   */
  async updateAttempt(attempt: AssessmentAttempt): Promise<AssessmentAttempt> {
    const now = new Date().toISOString();
    const updatedAttempt = {
      ...attempt,
      updated_at: now,
    };

    const command = new PutCommand({
      TableName: LMS_ASSESSMENT_ATTEMPTS_TABLE,
      Item: {
        ...updatedAttempt,
        SK: `${attempt.course_id}#${attempt.learner_id}`,
      },
    });

    await dynamoDocClient.send(command);
    return updatedAttempt;
  }

  /**
   * Save answers for an attempt (bulk)
   */
  async saveAnswers(
    attemptId: string,
    answers: Array<Omit<AssessmentAnswer, 'attempt_id' | 'created_at' | 'updated_at'>>
  ): Promise<AssessmentAnswer[]> {
    const now = new Date().toISOString();

    const answersToSave = answers.map((a) => ({
      ...a,
      attempt_id: attemptId,
      created_at: now,
      updated_at: now,
    }));

    // Batch write
    const chunks = [];
    for (let i = 0; i < answersToSave.length; i += 25) {
      chunks.push(answersToSave.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      const writeRequests = chunk.map((a) => ({
        PutRequest: {
          Item: {
            answer_id: a.answer_id,
            attempt_id: a.attempt_id,
            question_id: a.question_id,
            selected_option_id: a.selected_option_id ?? null,
            boolean_answer: a.boolean_answer ?? null,
            is_correct: a.is_correct,
            points_earned: a.points_earned,
            created_at: a.created_at,
            updated_at: a.updated_at,
          },
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [LMS_ASSESSMENT_ANSWERS_TABLE]: writeRequests,
        },
      });

      await dynamoDocClient.send(command);
    }

    return answersToSave as AssessmentAnswer[];
  }

  /**
   * Get answers for an attempt
   */
  async getAnswersForAttempt(attemptId: string): Promise<AssessmentAnswer[]> {
    const command = new QueryCommand({
      TableName: LMS_ASSESSMENT_ANSWERS_TABLE,
      IndexName: 'AttemptAnswersIndex',
      KeyConditionExpression: 'attempt_id = :attemptId',
      ExpressionAttributeValues: {
        ':attemptId': attemptId,
      },
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map((item: any) => ({
      answer_id: item.answer_id,
      attempt_id: item.attempt_id,
      question_id: item.question_id,
      selected_option_id: item.selected_option_id ?? null,
      boolean_answer: item.boolean_answer ?? null,
      is_correct: item.is_correct,
      points_earned: item.points_earned,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) as AssessmentAnswer[];
  }

  /**
   * Get all attempts for a course (admin view)
   */
  async getCourseAttempts(
    courseId: string,
    params: { limit?: number; cursor?: string }
  ): Promise<{ items: AssessmentAttempt[]; next_cursor?: string }> {
    const limit = Math.min(params.limit || 50, 200);

    const command = new QueryCommand({
      TableName: LMS_ASSESSMENT_ATTEMPTS_TABLE,
      IndexName: 'CourseAttemptsIndex',
      KeyConditionExpression: 'course_id = :courseId',
      ExpressionAttributeValues: {
        ':courseId': courseId,
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
      ...(params.cursor && {
        ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
      }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const attempts = Items.map((item: any) => ({
      attempt_id: item.attempt_id,
      course_id: item.course_id,
      assessment_config_id: item.assessment_config_id,
      learner_id: item.learner_id,
      attempt_number: item.attempt_number,
      status: item.status,
      started_at: item.started_at,
      submitted_at: item.submitted_at ?? null,
      graded_at: item.graded_at ?? null,
      raw_score: item.raw_score ?? 0,
      max_score: item.max_score ?? 0,
      percent_score: item.percent_score ?? 0,
      passed: item.passed ?? false,
      evidence: item.evidence,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) as AssessmentAttempt[];

    const nextCursor = LastEvaluatedKey
      ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      items: attempts,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }
}

