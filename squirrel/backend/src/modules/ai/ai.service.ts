import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { QueueService } from '../../infra/queue/queue.service';
import { QUEUES } from '../../infra/queue/queue.constants';

const SUPPORTED_REPO_PROVIDERS = new Set(['github']);

@Injectable()
export class AiService {
  constructor(private readonly queues: QueueService, private readonly configService: ConfigService) {}

  async enqueue(task: string, payload: Record<string, unknown>) {
    const queue = this.queues.getQueue(QUEUES.AI_GENERATE);
    const job = await queue.add(task, payload, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return { jobId: job.id };
  }

  createRepoSyncAuthorizationUrl(input: {
    provider: string;
    workspaceId: string;
    redirectUri: string;
    userId: string;
  }) {
    this.assertRepoSyncProvider(input.provider);
    const clientId = this.getRequiredEnv('GITHUB_OAUTH_CLIENT_ID');
    const authorizeBaseUrl = this.configService.get<string>('GITHUB_OAUTH_AUTHORIZE_URL') ?? 'https://github.com/login/oauth/authorize';
    const scopes = this.configService.get<string>('GITHUB_OAUTH_SCOPES') ?? 'repo read:user';

    const issuedAt = Date.now();
    const expiresInMs = 10 * 60_000;
    const nonce = createHmac('sha256', this.getStateSecret())
      .update(`${input.userId}:${input.workspaceId}:${issuedAt}:${Math.random()}`)
      .digest('hex')
      .slice(0, 24);

    const statePayload = `${input.provider}.${input.workspaceId}.${input.userId}.${issuedAt}.${expiresInMs}.${nonce}`;
    const signature = this.signState(statePayload);
    const state = Buffer.from(`${statePayload}.${signature}`).toString('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: input.redirectUri,
      scope: scopes,
      state,
      allow_signup: 'false',
    });

    return {
      provider: input.provider,
      authorizationUrl: `${authorizeBaseUrl}?${params.toString()}`,
      state,
      expiresAt: new Date(issuedAt + expiresInMs).toISOString(),
    };
  }

  async handleRepoSyncOauthCallback(input: {
    provider: string;
    workspaceId: string;
    code: string;
    state: string;
    userId: string;
  }) {
    this.assertRepoSyncProvider(input.provider);
    this.validateOauthState(input.state, input);

    const queue = this.queues.getQueue(QUEUES.AI_GENERATE);
    const job = await queue.add('repo-sync-oauth-exchange', {
      provider: input.provider,
      workspaceId: input.workspaceId,
      userId: input.userId,
      code: input.code,
      receivedAt: new Date().toISOString(),
    });

    return { jobId: job.id, status: 'queued' as const };
  }

  private validateOauthState(
    encodedState: string,
    context: { provider: string; workspaceId: string; userId: string },
  ): void {
    let decoded: string;
    try {
      decoded = Buffer.from(encodedState, 'base64url').toString('utf8');
    } catch {
      throw new UnauthorizedException('Invalid OAuth state encoding.');
    }

    const parts = decoded.split('.');
    if (parts.length < 7) {
      throw new UnauthorizedException('Invalid OAuth state payload.');
    }

    const signature = parts.pop() as string;
    const statePayload = parts.join('.');
    const expected = this.signState(statePayload);
    if (!this.safeEquals(signature, expected)) {
      throw new UnauthorizedException('OAuth state signature mismatch.');
    }

    const [provider, workspaceId, userId, issuedAtRaw, ttlRaw] = parts;
    const issuedAt = Number(issuedAtRaw);
    const ttl = Number(ttlRaw);

    if (provider !== context.provider || workspaceId !== context.workspaceId || userId !== context.userId) {
      throw new UnauthorizedException('OAuth state context mismatch.');
    }

    if (!Number.isFinite(issuedAt) || !Number.isFinite(ttl) || Date.now() > issuedAt + ttl) {
      throw new UnauthorizedException('OAuth state has expired.');
    }
  }

  private assertRepoSyncProvider(provider: string): void {
    if (!SUPPORTED_REPO_PROVIDERS.has(provider)) {
      throw new BadRequestException(`Unsupported repo sync provider: ${provider}`);
    }
  }

  private signState(payload: string): string {
    return createHmac('sha256', this.getStateSecret()).update(payload).digest('hex');
  }

  private getStateSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET ?? 'change_me';
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key) ?? process.env[key];
    if (!value) {
      throw new BadRequestException(`${key} is required to start repo-sync OAuth.`);
    }
    return value;
  }

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
