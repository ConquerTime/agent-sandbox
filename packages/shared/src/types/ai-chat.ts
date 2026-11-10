import type { UIMessage, UITools } from 'ai';

export type ModelType = 'sonnet' | 'opus' | 'gemini-3.1-pro-preview';

export const MODEL_VALUES: ModelType[] = [
  'sonnet',
  'opus',
  'gemini-3.1-pro-preview',
];

export function isValidModel(value: string): value is ModelType {
  return MODEL_VALUES.includes(value as ModelType);
}

export const MODE_TYPE = {
  AGENT: 'agent',
  DEBUG: 'debug',
} as const;
export type ModeType = (typeof MODE_TYPE)[keyof typeof MODE_TYPE];

export interface SummarizationRawValue {
  __type: 'summarization';
  id: string;
  conversationSummaryStarter: boolean;
  conversationSummary: string;
}

type SummarizationUIDataTypes = {
  summarization: {
    conversationSummaryStarter: boolean;
    conversationSummary: string;
  };
};

export interface OssFileData {
  fileId: string;
  fileName: string;
  filePath: string;
  ossPath: string;
  ossUrl: string;
  mimeType: string;
  size: number;
  projectId: string;
  agentId: string;
}

type OssFileUIDataTypes = {
  'oss-file': {
    toolCallId: string;
    data: OssFileData;
  };
};

export interface SuggestionItemRaw {
  text: string;
  agentId: string;
  agentName: string;
}

export interface SuggestionRawValue {
  __type: 'suggestion';
  id: string;
  conversationSuggestionStarter: boolean;
  suggestion: SuggestionItemRaw[];
}

type SuggestionUIDataTypes = {
  suggestion: {
    conversationSuggestionStarter: boolean;
    suggestion: SuggestionItemRaw[];
  };
};

export interface MCPStatusData {
  status: {
    serverName: string;
    success: boolean;
    toolCount: number;
    toolNames: string[];
    error?: string;
    elapsedMs: number;
  }[];
  totalElapsedMs: number;
}

type MCPStatusUIDataTypes = {
  'mcp-status': MCPStatusData;
};

export type RushUIDataTypes = SummarizationUIDataTypes &
  OssFileUIDataTypes &
  SuggestionUIDataTypes &
  MCPStatusUIDataTypes;

export type RushUIMessage = UIMessage<unknown, RushUIDataTypes, UITools>;
