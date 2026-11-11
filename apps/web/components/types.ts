export interface Project {
  id: string;
  name: string;
  orgId?: string;
  status: string;
  previewUrl: string;
  lastError?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: 'owner' | 'member';
  orgName: string;
}
