import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CryptoService } from '../../common/security/crypto.service';
import { RedisService } from '../../infra/redis/redis.service';
jest.mock('bcryptjs', () => ({
  hash: jest.fn(async () => 'mocked-refresh-hash'),
  compare: jest.fn(async () => true),
}));

const buildTestEnvironment = () => {
  const user = { id: 'user-1', email: 'user@test', password: 'secret', role: 'user' };

  type TxContext = {
    user: { create: jest.Mock };
    workspace: { create: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  const txUserCreate = jest.fn(async ({ data }: any) => ({ ...data, id: 'created-user' }));
  const txWorkspaceCreate = jest.fn(async ({ data }: any) => ({ ...data, id: 'workspace-1' }));
  const txAuditLogCreate = jest.fn(async () => ({}));

  const tx: TxContext = {
    user: { create: txUserCreate },
    workspace: { create: txWorkspaceCreate },
    auditLog: { create: txAuditLogCreate },
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id && where.id === user.id) {
          return { ...user, passwordHash: 'hashed-pass' };
        }
        if (where.email && where.email === user.email) {
          return { ...user, passwordHash: 'hashed-pass' };
        }
        return null;
      }),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(async () => null),
    },
    $transaction: jest.fn(async (callback: (tx: TxContext) => Promise<any>) => callback(tx)),
  };

  const jwtService = {
    signAsync: jest.fn(async (payload: Record<string, unknown>, options?: Record<string, unknown>) => {
      const kind = options?.expiresIn ? 'refresh' : 'access';
      return `${payload.sub}-${kind}-${options?.expiresIn ?? 'default'}`;
    }),
    verifyAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'app.jwt.refreshExpiresIn') return '7d';
      if (key === 'app.jwt.secret') return 'test-secret';
      return undefined;
    }),
  };

  const usersService = {
    findById: jest.fn(async () => ({ id: user.id, email: user.email, role: user.role, displayName: 'Writer', createdAt: new Date() })),
  };

  const cryptoService: CryptoService = {
    encrypt: jest.fn(() => ({
      iv: Buffer.alloc(16),
      authTag: Buffer.alloc(16),
      ciphertext: Buffer.from(''),
    })),
    decrypt: jest.fn(() => 'secret'),
  } as unknown as CryptoService;

  const redisService: Partial<RedisService> = {
    publishRevocation: jest.fn(),
    blacklistToken: jest.fn(),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  };

  const authService = new AuthService(
    prismaMock as any,
    jwtService as any,
    configService as unknown as ConfigService,
    usersService as any,
    cryptoService,
    redisService as RedisService,
  );

  return {
    authService,
    prismaMock,
    jwtService,
    user,
    redisService,
    configService,
    txHandlers: { txUserCreate, txWorkspaceCreate, txAuditLogCreate },
  };
};

describe('AuthService', () => {
  it('issues new access and refresh tokens and persists the session', async () => {
    const { authService, prismaMock, jwtService, user } = buildTestEnvironment();

    const tokens = await authService.issueTokens(user.id, user.email);

    expect(tokens.accessToken).toContain('access');
    expect(tokens.refreshToken).toContain('refresh');
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);

    expect(prismaMock.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        refreshToken: 'mocked-refresh-hash',
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('authenticates valid credentials via login', async () => {
    const { authService, prismaMock, jwtService, user } = buildTestEnvironment();

    const tokens = await authService.login({ email: user.email, password: 'secret' });

    expect(tokens.accessToken).toContain('access');
    expect(tokens.refreshToken).toContain('refresh');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
  });

  it('refreshes tokens, rotates the session, and updates the stored refresh hash', async () => {
    const { authService, prismaMock, jwtService, user } = buildTestEnvironment();

    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: user.id, sid: 'session-abc' });
    (prismaMock.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-abc',
      userId: user.id,
      refreshToken: 'mocked-refresh-hash',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
    });

    const result = await authService.refresh({ refreshToken: 'refresh-token' });

    expect(result.accessToken).toContain('access');
    expect(prismaMock.session.update).toHaveBeenCalledWith({
      where: { id: 'session-abc' },
      data: expect.objectContaining({
        refreshToken: 'mocked-refresh-hash',
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('registers new users with workspace creation', async () => {
    const { authService, txHandlers } = buildTestEnvironment();
    const dto = {
      email: 'new-user@test',
      password: 'Secret1!',
      displayName: 'Builder',
      workspaceName: 'New Workspace',
    };

    const tokens = await authService.register(dto as any);

    expect(tokens.accessToken).toContain('access');
    expect(tokens.refreshToken).toContain('refresh');
    expect(txHandlers.txUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: dto.email,
        passwordHash: 'mocked-refresh-hash',
        displayName: dto.displayName,
      }),
    });
    expect(txHandlers.txWorkspaceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: dto.workspaceName,
        slug: 'new-workspace',
        ownerId: 'created-user',
      }),
    });
    expect(txHandlers.txAuditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'workspace-1',
        actorId: 'created-user',
        action: 'WORKSPACE_CREATED',
      }),
    });
  });

  it('rejects registration when email already exists', async () => {
    const { authService, prismaMock } = buildTestEnvironment();
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'user-1', email: 'new-user@test' });

    await expect(
      authService.register({
        email: 'new-user@test',
        password: 'Secret1!',
        displayName: 'Builder',
        workspaceName: 'New Workspace',
      } as any),
    ).rejects.toThrow();
  });
});
