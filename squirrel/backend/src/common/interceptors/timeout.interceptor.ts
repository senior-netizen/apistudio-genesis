import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, timeout, catchError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout({
        first: 10000,
        with: () =>
          throwError(() => new RequestTimeoutException({ code: 'TIMEOUT', message: 'Request timed out' })),
      }),
      catchError((err) => {
        if (err instanceof RequestTimeoutException) {
          throw err;
        }
        return throwError(() => err);
      }),
    );
  }
}
