import {
  BadGatewayException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import { RedisService } from "../../config/redis.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe("ai.advisor.response", (message) => {
      this.logger.debug(`Received AI advisor response: ${message}`);
    });
  }

  async login(payload: LoginDto) {
    const response = await this.delegateToMonolith("login", payload);
    await this.redisService.publish("auth.login.delegated", {
      email: payload.email,
    });
    return response;
  }

  async signup(payload: SignupDto) {
    const response = await this.delegateToMonolith("signup", payload);
    await this.redisService.publish("auth.signup.delegated", {
      email: payload.email,
    });
    return response;
  }

  async verifyInternalToken(authorization: string) {
    if (!authorization) {
      return { valid: false };
    }

    try {
      const token = authorization.replace("Bearer ", "");
      const decoded = jwt.verify(
        token,
        this.configService.get("JWT_PUBLIC_KEY"),
      ) as Record<string, unknown>;
      await this.redisService.publish("auth.token.verified", decoded);
      return { valid: true, decoded };
    } catch (error) {
      this.logger.warn(`Failed to verify token: ${error.message}`);
      return { valid: false };
    }
  }

  private async delegateToMonolith(
    path: "login" | "signup",
    payload: LoginDto | SignupDto,
  ) {
    const baseUrl = this.configService.get<string>("AUTH_MONOLITH_URL");
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        "AUTH_MONOLITH_URL is not configured for delegated auth.",
      );
    }

    const internalApiKey = this.configService.get<string>("INTERNAL_API_KEY");
    const target = `${baseUrl.replace(/\/$/, "")}/v1/auth/${path}`;

    let response: Response;
    try {
      response = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(internalApiKey ? { "x-internal-api-key": internalApiKey } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(
        `Failed to reach monolith auth at ${target}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        "Unable to reach delegated auth service.",
      );
    }

    const text = await response.text();
    const parsed = text ? this.tryParseJson(text) : null;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new UnauthorizedException(
          parsed ?? { message: "Invalid credentials" },
        );
      }
      this.logger.warn(
        `Delegated auth ${path} failed: ${response.status} ${text}`,
      );
      throw new BadGatewayException({
        message: `Delegated auth ${path} failed`,
        statusCode: response.status,
      });
    }

    if (parsed == null || typeof parsed !== "object") {
      throw new BadGatewayException(
        `Delegated auth ${path} returned an invalid response payload.`,
      );
    }

    return parsed;
  }

  private tryParseJson(raw: string) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
}
