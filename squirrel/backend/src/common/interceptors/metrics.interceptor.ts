import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../infra/metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path ?? request.path;
    const method = request.method;
    const start = process.hrtime.bigint();
    return next.handle().pipe(
      tap({
        next: () => {
          const diff = Number(process.hrtime.bigint() - start) / 1e9;
          const status = context.switchToHttp().getResponse().statusCode;
          this.metrics.httpCount.labels(method, route, status.toString()).inc();
          this.metrics.httpDuration.labels(method, route, status.toString()).observe(diff);
        },
        error: () => {
          const diff = Number(process.hrtime.bigint() - start) / 1e9;
          const status = context.switchToHttp().getResponse().statusCode ?? 500;
          this.metrics.httpCount.labels(method, route, status.toString()).inc();
          this.metrics.httpDuration.labels(method, route, status.toString()).observe(diff);
        },
      }),
    );
  }
}
