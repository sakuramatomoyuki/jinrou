import { describe, expect, it } from 'vitest';
import { anonymousSurveyResults, normalizeSurveyAnswer, surveyManagerView, validateSurveyQuestion } from '../functions/src/surveyRules.js';

describe('anonymous survey server rules', () => {
  const single = { id: 'q1', prompt: '好きな季節は？', type: 'single' as const, options: ['春', '夏'] };
  it('validates prompts and bounded, unique options', () => {
    expect(validateSurveyQuestion(single)).toBeNull();
    expect(validateSurveyQuestion({ ...single, options: ['春', '春'] })).toContain('重複');
    expect(validateSurveyQuestion({ ...single, prompt: 'x'.repeat(121) })).toContain('120文字');
  });
  it('accepts only answers valid for the question type', () => {
    expect(normalizeSurveyAnswer(single, '春')).toBe('春');
    expect(normalizeSurveyAnswer(single, '冬')).toBeNull();
    expect(normalizeSurveyAnswer({ ...single, type: 'multiple' }, ['春', '夏', '春'])).toEqual(['春', '夏']);
    expect(normalizeSurveyAnswer({ ...single, type: 'text' }, '自由回答')).toBe('自由回答');
    expect(normalizeSurveyAnswer({ ...single, type: 'boolean' }, 'いいえ')).toBe('いいえ');
  });
  it('returns anonymous option aggregates or unlabeled text answers', () => {
    const result: any = anonymousSurveyResults(single, { user1: '春', user2: '春', user3: '夏' });
    expect(result.counts).toEqual({ 春: 2, 夏: 1 });
    expect(result.percentages).toEqual({ 春: 67, 夏: 33 });
    expect(result).not.toHaveProperty('user1');
    expect(anonymousSurveyResults({ ...single, type: 'text' }, { user1: '回答' })).toEqual({ responseCount: 1, responses: ['回答'] });
  });
  it('never returns respondent identifiers or raw in-progress answers to managers', () => {
    const view = surveyManagerView({
      source: 'sequential', maxQuestions: 5, questionIndex: 0,
      currentQuestion: { ...single, answers: { privateUidA: 'private-answer-A', privateUidB: 'private-answer-B' } },
      questions: [],
    });
    const currentQuestion = view.currentQuestion!;
    expect(currentQuestion.responseCount).toBe(2);
    expect(currentQuestion).not.toHaveProperty('answers');
    expect(JSON.stringify(view)).not.toContain('privateUid');
    expect(JSON.stringify(view)).not.toContain('private-answer');
  });
});
