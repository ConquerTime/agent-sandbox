export type MCPErrorCode = string;
export type MCPErrorCategory = string;

export interface MCPConnectionStatus {
  serverName: string;
  success: boolean;
  toolCount: number;
  toolNames: string[];
  error?: string;
  errorCode?: MCPErrorCode;
  errorCategory?: MCPErrorCategory;
  elapsedMs: number;
}
