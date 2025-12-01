import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller({ path: 'v1', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user with the monolith via delegated flow' })
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Provision a new user record through the monolith until migration completes' })
  signup(@Body() payload: SignupDto) {
    return this.authService.signup(payload);
  }

  @Post('verify-internal-token')
  @ApiBearerAuth()
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Validate an internal token and emit Redis confirmation event' })
  verifyInternalToken(@Headers('authorization') authorization: string) {
    return this.authService.verifyInternalToken(authorization);
  }
}
