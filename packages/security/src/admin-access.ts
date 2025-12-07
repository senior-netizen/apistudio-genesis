import type { NextFunction, Request, Response } from 'express';
import { hasRole } from '../../common/rbac/roles';

export interface AdminActor {
  id: string;
  role?: string | null;
  isFounder?: boolean | null;
  mfaEnabled?: boolean;
  lastAuthenticatedAt?: string | number | Date | null;
  deviceTrusted?: boolean;
  jitElevated?: boolean;
}

export interface AdminAccessAuditEntry {
  actorId: string;
  route: string;
  timestamp: string;
  ip?: string;
  deviceTrusted?: boolean;
  target?: string;
  outcome: 'allowed' | 'denied';
  reason?: string;
}

export interface AdminAccessOptions {
  getActor: (req: Request) => AdminActor | null | undefined;
  policyCheck?: (actor: AdminActor, req: Request) => boolean | Promise<boolean>;
  requireJitForDestructive?: (req: Request) => boolean;
  minimumRole?: string;
  recentAuthWindowMs?: number;
  auditSink?: (entry: AdminAccessAuditEntry) => void;
  logger?: { debug: (payload: unknown, message?: string) => void };
}

function toTimestampMs(value: AdminActor['lastAuthenticatedAt']): number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function evaluatePolicy(
  actor: AdminActor,
  req: Request,
  policyCheck?: AdminAccessOptions['policyCheck'],
): Promise<boolean> {
  if (!policyCheck) return true;
  return Boolean(await policyCheck(actor, req));
}

function recordAudit(options: AdminAccessOptions, entry: AdminAccessAuditEntry) {
  try {
    options.auditSink?.(entry);
  } catch (error) {
    options.logger?.debug({ error, entry }, 'failed to record admin access audit');
  }
}

export function createAdminAccessMiddleware(options: AdminAccessOptions) {
  const recentAuthWindowMs = options.recentAuthWindowMs ?? 10 * 60 * 1000; // 10 minutes
  const minimumRole = options.minimumRole ?? 'admin';

  return async function adminAccessMiddleware(req: Request, res: Response, next: NextFunction) {
    const actor = options.getActor(req);
    if (!actor) {
      recordAudit(options, {
        actorId: 'anonymous',
        route: req.originalUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        outcome: 'denied',
        reason: 'missing-actor',
      });
      return res.status(401).json({ error: 'authentication_required' });
    }

    const effectiveRole = actor.isFounder ? 'founder' : actor.role;
    if (!hasRole(effectiveRole, minimumRole)) {
      recordAudit(options, {
        actorId: actor.id,
        route: req.originalUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        deviceTrusted: actor.deviceTrusted,
        outcome: 'denied',
        reason: 'insufficient-role',
      });
      return res.status(403).json({ error: 'admin_access_required' });
    }

    if (!actor.mfaEnabled) {
      recordAudit(options, {
        actorId: actor.id,
        route: req.originalUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        deviceTrusted: actor.deviceTrusted,
        outcome: 'denied',
        reason: 'mfa_required',
      });
      return res.status(403).json({ error: 'mfa_required' });
    }

    const lastAuthMs = toTimestampMs(actor.lastAuthenticatedAt);
    if (!lastAuthMs || Date.now() - lastAuthMs > recentAuthWindowMs) {
      recordAudit(options, {
        actorId: actor.id,
        route: req.originalUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        deviceTrusted: actor.deviceTrusted,
        outcome: 'denied',
        reason: 'reauthentication_required',
      });
      return res.status(403).json({ error: 'reauthentication_required' });
    }

    if (options.requireJitForDestructive?.(req) && !actor.jitElevated) {
      recordAudit(options, {
        actorId: actor.id,
        route: req.originalUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        deviceTrusted: actor.deviceTrusted,
        outcome: 'denied',
        reason: 'jit_elevation_required',
      });
      return res.status(403).json({ error: 'jit_elevation_required' });
    }

    if (actor.deviceTrusted === false) {
      recordAudit(options, {
        actorId: actor.id,
        route: req.originalUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        deviceTrusted: actor.deviceTrusted,
        outcome: 'denied',
        reason: 'untrusted_device',
      });
      return res.status(403).json({ error: 'device_trust_required' });
    }

    const policyAllowed = await evaluatePolicy(actor, req, options.policyCheck);
    if (!policyAllowed) {
      recordAudit(options, {
        actorId: actor.id,
        route: req.originalUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        deviceTrusted: actor.deviceTrusted,
        outcome: 'denied',
        reason: 'policy_denied',
      });
      return res.status(403).json({ error: 'policy_denied' });
    }

    recordAudit(options, {
      actorId: actor.id,
      route: req.originalUrl,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      deviceTrusted: actor.deviceTrusted,
      outcome: 'allowed',
    });

    return next();
  };
}
