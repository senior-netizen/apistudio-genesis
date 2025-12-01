export interface UserCreatedEvent {
  userId: string;
  email: string;
  source: 'signup' | 'login';
}

export interface WorkspaceCreatedEvent {
  workspaceId: string;
  ownerId: string;
}

export interface ApiRequestExecutedEvent {
  requestId?: string;
  workspaceId?: string;
  status: number;
}

export interface BillingPlanChangedEvent {
  workspaceId: string;
  plan: string;
}

export interface AiAdvisorResponseEvent {
  workspaceId: string;
  prompt: string;
  response?: string;
}

export interface NotificationsDispatchEvent {
  channel: string;
  recipients: string[];
  template: string;
}
