import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthDomainService } from './auth.domain.service';
import { AuthService } from '../../modules/auth/auth.service';
import { UsersService } from '../../modules/users/users.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EVENT_BUS, EventBus } from '../../events/bus/event-bus.interface';
import { RegisterDto } from '../../modules/auth/dto/register.dto';
import { LoginDto } from '../../modules/auth/dto/login.dto';

const createJwt = () => new JwtService({ secret: 'test-secret' });

describe('AuthDomainService', () => {
  let service: AuthDomainService;
  const authService: jest.Mocked<AuthService> = { register: jest.fn(), login: jest.fn() } as any;
  const usersService: jest.Mocked<UsersService> = { findById: jest.fn() } as any;
  const workspaceFindFirst = jest.fn();
  const prisma: jest.Mocked<PrismaService> = { workspace: { findFirst: workspaceFindFirst } } as any;
  const eventBus: jest.Mocked<EventBus> = { publish: jest.fn(), subscribe: jest.fn() } as any;
  const jwtService = createJwt();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthDomainService,
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: EVENT_BUS, useValue: eventBus },
      ],
    }).compile();

    service = moduleRef.get(AuthDomainService);

    authService.register.mockReset();
    authService.login.mockReset();
    usersService.findById.mockReset();
    workspaceFindFirst.mockReset();
    eventBus.publish.mockReset();
  });

  it('emits events after registration without changing auth response', async () => {
    const userId = 'b0e749be-1d4c-4b2d-98c0-286f29f7c65a';
    const workspaceId = '08a7e28c-38dd-46a3-a930-5ede5b34f019';
    const accessToken = jwtService.sign({ sub: userId, email: 'user@example.com', sid: 'session-1' });
    const tokens = { accessToken, refreshToken: 'r-token' } as any;

    authService.register.mockResolvedValue(tokens);
    usersService.findById.mockResolvedValue({
      id: userId,
      email: 'user@example.com',
      displayName: 'User',
      createdAt: new Date(),
      role: 'USER',
    });
    workspaceFindFirst.mockResolvedValue({ id: workspaceId, ownerId: userId, name: 'Default', slug: 'default' });

    const result = await service.registerUser({} as RegisterDto);

    expect(result).toBe(tokens);
    expect(eventBus.publish).toHaveBeenCalledTimes(2);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'auth.user.created', payload: expect.objectContaining({ userId }) }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'workspace.created', payload: expect.objectContaining({ workspaceId }) }),
    );
  });

  it('emits login event through the bus', async () => {
    const userId = 'a079bd25-dc7d-4c3b-a545-f1d888c2e9f1';
    const accessToken = jwtService.sign({ sub: userId, email: 'user@example.com', sid: 'session-123' });
    const tokens = { accessToken, refreshToken: 'r2' } as any;

    authService.login.mockResolvedValue(tokens);

    await service.loginUser({} as LoginDto);

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'auth.user.logged_in', payload: expect.objectContaining({ userId }) }),
    );
  });
});
