import { Controller, UseGuards } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
import { AuthDomainService } from '../../services/auth/auth.domain.service';
import { AuthServiceController, AuthServiceControllerMethods, LoginRequest, ProfileResponse, RegisterRequest, RefreshRequest } from '../generated/auth';
import { AuthTokens } from '../generated/common';
import { GrpcJwtGuard } from '../guards/grpc-jwt.guard';
import { getUserFromMetadata } from '../utils/grpc-user.util';
import { Metadata } from '@grpc/grpc-js';

@Controller()
@AuthServiceControllerMethods()
export class AuthGrpcController implements AuthServiceController {
  constructor(
    private readonly authDomain: AuthDomainService,
    private readonly authService: AuthService,
  ) {}

  async register(request: RegisterRequest): Promise<AuthTokens> {
    const tokens = await this.authDomain.registerUser({
      email: request.email ?? '',
      password: request.password ?? '',
      displayName: request.displayName ?? '',
      workspaceName: request.workspaceName ?? 'My Workspace',
    });
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async login(request: LoginRequest): Promise<AuthTokens> {
    const tokens = await this.authDomain.loginUser({
      email: request.email ?? '',
      password: request.password ?? '',
      totpCode: request.totpCode,
    });
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async refresh(request: RefreshRequest): Promise<AuthTokens> {
    const tokens = await this.authService.refresh({ refreshToken: request.refreshToken ?? '' });
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  @UseGuards(GrpcJwtGuard)
  async profile(_: {}, metadata?: Metadata): Promise<ProfileResponse> {
    const user = getUserFromMetadata(metadata);
    if (!user) {
      return { id: '', email: '', displayName: '', role: '' };
    }
    const profile = await this.authService.profile(user.id);
    if (!profile) {
      return { id: user.id, email: '', displayName: '', role: user.role ?? '' };
    }
    return {
      id: profile.id ?? user.id,
      email: profile.email ?? '',
      displayName: (profile as any).displayName ?? profile.email ?? '',
      role: user.role ?? '',
    };
  }
}
