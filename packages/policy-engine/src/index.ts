export type Effect = 'Allow' | 'Deny';

export interface PolicyPrincipal {
  roles?: string[];
  users?: string[];
  groups?: string[];
}

export interface ConditionStringOperators {
  equals?: string;
  notEquals?: string;
  in?: string[];
  notIn?: string[];
}

export interface PolicyConditions {
  ip?: {
    inCIDR?: string[];
  };
  time?: {
    between?: [string, string];
  };
  workspaceTags?: {
    contains?: string[];
  };
  jit?: {
    required?: boolean;
  };
  client?: ConditionStringOperators;
  [key: string]: unknown;
}

export interface PolicyStatement {
  id?: string;
  effect: Effect;
  actions: string[];
  resources: string[];
  principal?: PolicyPrincipal;
  conditions?: PolicyConditions;
}

export interface PolicyMetadata {
  name: string;
  description?: string;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Policy extends PolicyMetadata {
  id: string;
  scopeType: 'organization' | 'workspace';
  scopeId: string;
  statements: PolicyStatement[];
  deletedAt?: Date | null;
}

export interface EvaluationContext {
  userId: string;
  organizationId: string;
  workspaceId?: string;
  userRoles: string[];
  ssoGroups?: string[];
  clientType: 'web' | 'vscode' | 'mobile' | 'api';
  ipAddress?: string;
  time?: Date;
  resource: string;
  action: string;
  jitActive?: boolean;
  workspaceTags?: string[];
}

export interface EvaluationResult {
  effect: Effect | 'NoMatch';
  matchedStatements: PolicyStatement[];
}

export interface PolicyEngineConfig {
  enabled: boolean;
  allowPoliciesToElevateBeyondRBAC: boolean;
  traceModeEnabled?: boolean;
}

export const defaultPolicyEngineConfig: PolicyEngineConfig = {
  enabled: true,
  allowPoliciesToElevateBeyondRBAC: false,
  traceModeEnabled: false,
};

function escapeForRegex(input: string): string {
  return input.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

export function matchPattern(pattern: string, value: string): boolean {
  if (pattern === '*') return true;
  const regex = new RegExp(`^${escapeForRegex(pattern).replace(/\\\*/g, '.*')}$`);
  return regex.test(value);
}

function matchAction(statement: PolicyStatement, ctx: EvaluationContext): boolean {
  return statement.actions.some((action) => matchPattern(action, ctx.action));
}

function matchResource(statement: PolicyStatement, ctx: EvaluationContext): boolean {
  return statement.resources.some((resource) => matchPattern(resource, ctx.resource));
}

function matchPrincipal(statement: PolicyStatement, ctx: EvaluationContext): boolean {
  if (!statement.principal) return true;
  const { roles, users, groups } = statement.principal;

  if (roles?.length) {
    const hasRole = roles.some((role) => ctx.userRoles.includes(role));
    if (!hasRole) return false;
  }

  if (users?.length) {
    const isUser = users.includes(ctx.userId);
    if (!isUser) return false;
  }

  if (groups?.length) {
    const ctxGroups = ctx.ssoGroups ?? [];
    const inGroup = groups.some((group) => ctxGroups.includes(group));
    if (!inGroup) return false;
  }

  return true;
}

function ipToNumber(ip: string): number | null {
  const segments = ip.split('.').map((segment) => Number(segment));
  if (segments.length !== 4 || segments.some((segment) => Number.isNaN(segment) || segment < 0 || segment > 255)) {
    return null;
  }
  return (((segments[0] << 24) >>> 0) + ((segments[1] << 16) >>> 0) + ((segments[2] << 8) >>> 0) + segments[3]) >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsString] = cidr.split('/');
  const bits = Number(bitsString);
  const ipNum = ipToNumber(ip ?? '');
  const rangeNum = ipToNumber(range ?? '');

  if (ipNum === null || rangeNum === null || Number.isNaN(bits) || bits < 0 || bits > 32) {
    return false;
  }

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function checkTimeBetween(target: Date, [start, end]: [string, string]): boolean {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  if (
    [startHours, startMinutes, endHours, endMinutes].some(
      (value) => Number.isNaN(value) || value < 0 || value > 59 || startHours > 23 || endHours > 23,
    )
  ) {
    return false;
  }

  const minutes = target.getHours() * 60 + target.getMinutes();
  const startValue = startHours * 60 + startMinutes;
  const endValue = endHours * 60 + endMinutes;
  return minutes >= startValue && minutes <= endValue;
}

function checkStringOperators(value: string | undefined, operators: ConditionStringOperators | undefined): boolean {
  if (!operators) return true;
  if (operators.equals !== undefined && value !== operators.equals) return false;
  if (operators.notEquals !== undefined && value === operators.notEquals) return false;
  if (operators.in && (!value || !operators.in.includes(value))) return false;
  if (operators.notIn && value && operators.notIn.includes(value)) return false;
  return true;
}

function matchConditions(statement: PolicyStatement, ctx: EvaluationContext): boolean {
  const conditions = statement.conditions ?? {};

  if (conditions.ip?.inCIDR) {
    if (!ctx.ipAddress) return false;
    const within = conditions.ip.inCIDR.some((cidr) => ipInCidr(ctx.ipAddress as string, cidr));
    if (!within) return false;
  }

  if (conditions.time?.between) {
    const referenceTime = ctx.time ?? new Date();
    if (!checkTimeBetween(referenceTime, conditions.time.between)) return false;
  }

  if (conditions.workspaceTags?.contains) {
    const tags = ctx.workspaceTags ?? [];
    const requiredTags = conditions.workspaceTags.contains;
    const hasAll = requiredTags.every((tag) => tags.includes(tag));
    if (!hasAll) return false;
  }

  if (conditions.jit?.required) {
    if (!ctx.jitActive) return false;
  }

  if (conditions.client) {
    if (!checkStringOperators(ctx.clientType, conditions.client)) return false;
  }

  return true;
}

function statementMatches(statement: PolicyStatement, ctx: EvaluationContext): boolean {
  return matchAction(statement, ctx) && matchResource(statement, ctx) && matchPrincipal(statement, ctx) && matchConditions(statement, ctx);
}

export function evaluatePolicies(policies: Policy[], ctx: EvaluationContext): EvaluationResult {
  const activePolicies = policies.filter((policy) => policy.enabled && !policy.deletedAt);
  const matched: PolicyStatement[] = [];

  for (const policy of activePolicies) {
    for (const statement of policy.statements) {
      if (statementMatches(statement, ctx)) {
        matched.push(statement);
      }
    }
  }

  if (matched.some((statement) => statement.effect === 'Deny')) {
    return { effect: 'Deny', matchedStatements: matched.filter((stmt) => stmt.effect === 'Deny') };
  }

  if (matched.some((statement) => statement.effect === 'Allow')) {
    return { effect: 'Allow', matchedStatements: matched.filter((stmt) => stmt.effect === 'Allow') };
  }

  return { effect: 'NoMatch', matchedStatements: [] };
}

export function combineRbacAndPolicies(
  rbacAllowed: boolean,
  policyResult: EvaluationResult,
  config: PolicyEngineConfig = defaultPolicyEngineConfig,
): { allowed: boolean; reason?: string } {
  if (!config.enabled) {
    return { allowed: rbacAllowed };
  }

  if (policyResult.effect === 'Deny') {
    return { allowed: false, reason: 'Denied by policy' };
  }

  if (!rbacAllowed) {
    if (config.allowPoliciesToElevateBeyondRBAC && policyResult.effect === 'Allow') {
      return { allowed: true, reason: 'Allowed by policy override' };
    }
    return { allowed: false, reason: 'Denied by RBAC' };
  }

  if (policyResult.effect === 'Allow' || policyResult.effect === 'NoMatch') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Access denied by policy engine' };
}
