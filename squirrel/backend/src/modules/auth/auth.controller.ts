import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfirmTotpDto } from './dto/totp.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '../../infra/prisma/enums';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Response } from 'express';
import { DeviceFlowService } from './device-flow.service';
import { DeviceCodeConfirmDto, DeviceCodeRequestDto, DeviceCodeVerifyDto } from './dto/device-code.dto';
import { RevokeTokenDto, SyncTokensDto } from './dto/revoke.dto';
import { RefreshAuthGuard } from './guards/refresh.guard';
import { RedisService } from '../../infra/redis/redis.service';
import { CsrfService } from '../../common/security/csrf.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
    constructor(
      private readonly authService: AuthService,
      private readonly deviceFlow: DeviceFlowService,
      private readonly redis: RedisService,
      private readonly csrfService: CsrfService,
      private readonly config: ConfigService,
    ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    this.setAuthCookies(res, tokens.refreshToken);
    const csrfToken = this.issueCsrf(res);
    return { ...tokens, csrfToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    this.setAuthCookies(res, tokens.refreshToken);
    const csrfToken = this.issueCsrf(res);
    return { ...tokens, csrfToken };
  }

  @Post('login/admin')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.loginWithRole(dto, ['admin', 'founder']);
    this.setAuthCookies(res, tokens.refreshToken);
    const csrfToken = this.issueCsrf(res);
    return { ...tokens, csrfToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(dto);
    this.setAuthCookies(res, tokens.refreshToken);
    const csrfToken = this.issueCsrf(res);
    return { ...tokens, csrfToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(dto);
    this.clearAuthCookies(res);
    this.clearCsrfCookie(res);
    return { status: 'logged_out' } as const;
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  async setupTotp(@CurrentUser() user: { id: string }) {
    return this.authService.initiateTotp(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  async confirmTotp(@CurrentUser() user: { id: string }, @Body() dto: ConfirmTotpDto) {
    return this.authService.confirmTotp(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('api-keys')
  async createApiKey(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateApiKeyDto,
    @Body('workspaceId') workspaceId: string,
  ) {
    return this.authService.createApiKey(workspaceId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.profile(user.id);
  }

  // --- Device Authorization Flow ---
  // POST /auth/device/code
  @Post('device/code')
  @HttpCode(HttpStatus.OK)
  async deviceCode(@Body() dto: DeviceCodeRequestDto) {
    return this.deviceFlow.createCode(dto.clientType, dto.scope);
  }

  // POST /auth/device/confirm
  // Approve a user_code from a logged-in browser session.
  @UseGuards(JwtAuthGuard)
  @Post('device/confirm')
  @HttpCode(HttpStatus.OK)
  async deviceConfirm(@CurrentUser() user: { id: string }, @Body() dto: DeviceCodeConfirmDto) {
    const ok = await this.deviceFlow.approve(user.id, dto.userCode);
    return { status: ok ? 'approved' : 'invalid' };
  }

  // POST /auth/device/verify
  // Exchange an approved device_code for tokens (used by CLI/desktop)
  @Post('device/verify')
  @HttpCode(HttpStatus.OK)
  async deviceVerify(@Body() dto: DeviceCodeVerifyDto, @Res({ passthrough: true }) res: Response) {
    const info = await this.deviceFlow.exchange(dto.deviceCode);
    if (!info) {
      return { error: 'authorization_pending' };
    }
    const profile = await this.authService.profile(info.userId);
    if (!profile) {
      throw new UnauthorizedException({ code: 'PROFILE_NOT_FOUND', message: 'User not found' });
    }
    const tokens = await this.authService.issueTokens(info.userId, profile.email);
    this.setAuthCookies(res, tokens.refreshToken);
    const csrfToken = this.issueCsrf(res);
    return { ...tokens, csrfToken };
  }

  @Get('csrf')
  async csrf(@Res({ passthrough: true }) res: Response) {
    const csrfToken = this.issueCsrf(res);
    return { csrfToken };
  }

  // --- Token Revocation & Sync ---
  @UseGuards(JwtAuthGuard)
  @Post('token/revoke')
  async revoke(@CurrentUser() user: { id: string; sessionId: string }, @Body() dto: RevokeTokenDto) {
    if (dto.allDevices) {
      await this.authService.revokeSession(user.sessionId);
      // Best-effort: client should re-fetch sessions and logout locally
      return { status: 'revoked_all' };
    }
    if (dto.sessionId) {
      await this.authService.revokeSession(dto.sessionId);
      return { status: 'revoked' };
    }
    await this.authService.revokeSession(user.sessionId);
    if (dto.jti) {
      // Blacklist short-lived token server-side for up to 15 minutes
      await this.redis.blacklistToken(dto.jti, 15 * 60);
    }
    return { status: 'revoked' };
  }

  @UseGuards(RefreshAuthGuard)
  @Post('token/sync')
  async syncTokens(@Body() dto: SyncTokensDto) {
    const revoked: string[] = [];
    for (const jti of dto.jtis ?? []) {
      if (await this.redis.isTokenBlacklisted(jti)) revoked.push(jti);
    }
    return { revoked } as { revoked: string[] };
  }

  private setAuthCookies(res: Response, refreshToken: string) {
    // httpOnly, secure cookie for refresh; 30d by default from config used in token issuance
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  private clearAuthCookies(res: Response) {
    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: this.isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  private issueCsrf(res: Response): string {
    const token = this.csrfService.generateToken();
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,
      secure: this.isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return token;
  }

  private clearCsrfCookie(res: Response) {
    res.cookie('XSRF-TOKEN', '', {
      httpOnly: false,
      secure: this.isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  private isSecure(): boolean {
    return (this.config.get<string>('app.nodeEnv') ?? 'development') === 'production';
  }
}
