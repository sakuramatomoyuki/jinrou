export type SurveyQuestion = { id: string; prompt: string; type: 'single' | 'multiple' | 'text' | 'boolean'; options: string[] };
export type SurveyAnswer = string | string[];

export function validateSurveyQuestion(question: Partial<SurveyQuestion>): string | null {
  const prompt = String(question.prompt || '').trim();
  if (!prompt || prompt.length > 120) return '質問文は1〜120文字で入力してください。';
  if (!['single', 'multiple', 'text', 'boolean'].includes(String(question.type))) return '回答形式を選んでください。';
  if (question.type === 'single' || question.type === 'multiple') {
    const options = (question.options || []).map((option) => String(option).trim()).filter(Boolean);
    if (options.length < 2 || options.length > 10 || new Set(options).size !== options.length || options.some((option) => option.length > 80)) return '選択肢は重複なしで2〜10個、各80文字以内にしてください。';
  }
  return null;
}

export function normalizeSurveyAnswer(question: SurveyQuestion, raw: unknown): SurveyAnswer | null {
  if (question.type === 'text') {
    const value = String(raw || '').trim();
    return value && value.length <= 80 ? value : null;
  }
  if (question.type === 'boolean') return raw === true || raw === 'はい' ? 'はい' : raw === false || raw === 'いいえ' ? 'いいえ' : null;
  const allowed = new Set(question.options);
  if (question.type === 'single') return typeof raw === 'string' && allowed.has(raw) ? raw : null;
  if (question.type === 'multiple' && Array.isArray(raw)) {
    const values = [...new Set(raw.map(String))];
    return values.length > 0 && values.length <= 10 && values.every((value) => allowed.has(value)) ? values : null;
  }
  return null;
}

/** Produces anonymous, aggregate-only results. No respondent IDs or names leave this helper. */
export function anonymousSurveyResults(question: SurveyQuestion, answers: Record<string, SurveyAnswer>) {
  const values = Object.values(answers);
  if (question.type === 'text') return { responseCount: values.length, responses: values.map(String) };
  const counts = Object.fromEntries(question.type === 'boolean' ? ['はい', 'いいえ'].map((choice) => [choice, 0]) : question.options.map((choice) => [choice, 0]));
  for (const value of values) for (const choice of Array.isArray(value) ? value : [String(value)]) if (choice in counts) counts[choice]++;
  return { responseCount: values.length, counts, percentages: Object.fromEntries(Object.entries(counts).map(([choice, count]) => [choice, values.length ? Math.round((Number(count) / values.length) * 100) : 0])) };
}

/** Manager progress may expose response counts and closed aggregates, never respondent IDs or raw answers. */
export function surveyManagerView(game: any) {
  const questionView = (question: any) => question ? {
    id: String(question.id || ''),
    prompt: String(question.prompt || ''),
    type: question.type,
    options: Array.isArray(question.options) ? question.options.map(String) : [],
    responseCount: Object.keys(question.answers || {}).length,
    results: question.results || null,
  } : null;
  return {
    type: 'survey',
    source: game?.source === 'host' ? 'host' : 'sequential',
    maxQuestions: Number(game?.maxQuestions) || 0,
    questionIndex: Number(game?.questionIndex) || 0,
    questions: (Array.isArray(game?.questions) ? game.questions : []).map(questionView),
    currentQuestion: questionView(game?.currentQuestion),
    finished: Boolean(game?.finished),
    startedAt: Number(game?.startedAt) || 0,
  };
}
