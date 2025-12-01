import { SharedWorkspacePermission, OrganizationRole, TeamRole } from '../constants/organization-roles';

export const OrganizationSchema = {
  $id: 'Organization',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    ownerUserId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'ownerUserId', 'createdAt'],
  additionalProperties: false,
} as const;

export const TeamSchema = {
  $id: 'Team',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'organizationId', 'name', 'createdAt'],
  additionalProperties: false,
} as const;

export const MemberSchema = {
  $id: 'OrganizationMember',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    role: { enum: Object.values(OrganizationRole) },
    joinedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'organizationId', 'userId', 'role', 'joinedAt'],
  additionalProperties: false,
} as const;

export const InviteSchema = {
  $id: 'OrganizationInvite',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    invitedByUserId: { type: 'string', format: 'uuid' },
    role: { enum: Object.values(OrganizationRole) },
    status: { enum: ['pending', 'accepted', 'revoked'] },
    token: { type: 'string' },
    expiresAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'organizationId', 'email', 'invitedByUserId', 'role', 'status', 'token', 'expiresAt'],
  additionalProperties: false,
} as const;

export const SharedWorkspaceSchema = {
  $id: 'SharedWorkspace',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    permission: { enum: Object.values(SharedWorkspacePermission) },
  },
  required: ['id', 'workspaceId', 'organizationId', 'permission'],
  additionalProperties: false,
} as const;

export const OrganizationBillingStateSchema = {
  $id: 'OrganizationBillingState',
  type: 'object',
  properties: {
    organizationId: { type: 'string', format: 'uuid' },
    currentPlanId: { type: ['string', 'null'], format: 'uuid' },
    creditsBalance: { type: 'integer' },
    renewDate: { type: ['string', 'null'], format: 'date-time' },
    status: { enum: ['active', 'past_due', 'canceled', 'paused'] },
  },
  required: ['organizationId', 'creditsBalance', 'status'],
  additionalProperties: false,
} as const;

export const OrganizationUsageEventSchema = {
  $id: 'OrganizationUsageEvent',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    organizationId: { type: 'string', format: 'uuid' },
    type: { type: 'string' },
    amount: { type: 'integer' },
    metadata: { type: ['object', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'organizationId', 'type', 'amount', 'createdAt'],
  additionalProperties: true,
} as const;

export const TeamMemberSchema = {
  $id: 'TeamMember',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    teamId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    role: { enum: Object.values(TeamRole) },
  },
  required: ['id', 'teamId', 'userId', 'role'],
  additionalProperties: false,
} as const;
