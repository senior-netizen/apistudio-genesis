import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../../config/redis.service';
import { ExecuteRequestDto } from './dto/execute-request.dto';

@Injectable()
export class RunnerService implements OnModuleInit {
  private readonly logger = new Logger(RunnerService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.redisService.subscribe('api.request.executed', (message) => {
      this.logger.debug(`api.request.executed: ${message}`);
    });
  }

  async execute(payload: ExecuteRequestDto) {
    const config: AxiosRequestConfig = {
      url: payload.url,
      method: payload.method,
      headers: payload.headers,
      data: payload.body,
      timeout: Number(this.configService.get('HTTP_TIMEOUT_MS', 15000)),
      maxRedirects: Number(this.configService.get('HTTP_MAX_REDIRECTS', 5)),
      validateStatus: () => true,
    };

    const response = await firstValueFrom(this.http.request(config));
    await this.redisService.publish('api.request.executed', {
      url: payload.url,
      status: response.status,
    });
    const headers = this.normalizeHeaders(response.headers);
    return {
      status: response.status,
      headers,
      data: response.data,
    };
  }

  private normalizeHeaders(
    headers: AxiosResponseHeaders | RawAxiosResponseHeaders | undefined,
  ): Record<string, string> {
    if (!headers) {
      return {};
    }
    const normalized: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      normalized[key] = Array.isArray(value) ? value.join(', ') : String(value);
    });
    return normalized;
  }
}
