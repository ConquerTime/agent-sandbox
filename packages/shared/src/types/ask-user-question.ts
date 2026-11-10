export interface AskUserQuestionOptionAction {
  type: 'switch-agent';
  agentName: string;
  message?: string;
}

export interface AskUserQuestionOption {
  label: string;
  description: string;
  action?: AskUserQuestionOptionAction;
}

export interface AskUserQuestion {
  question: string;
  header: string;
  options: AskUserQuestionOption[];
  multiSelect: boolean;
}

export interface AskUserQuestionInput {
  questions: AskUserQuestion[];
}

export interface UserQuestionAnswer {
  questionIndex: number;
  selectedLabels: string[];
  freeText?: string;
}

export interface AskUserAnswerRequest {
  projectId: string;
  conversationId: string;
  toolCallId: string;
  answers: UserQuestionAnswer[];
}

export interface AskUserAnswerResponse {
  success: boolean;
  alreadyResolved?: boolean;
  error?: string;
}

export const ASK_USER_QUESTION_TIMEOUT_MS = 30_000;
