import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const userId = request.user?.id || 'Anonymous';

    const startTime = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - User: ${userId} - UserAgent: ${userAgent}`,
    );

    if (
      process.env.NODE_ENV === 'development' &&
      body &&
      Object.keys(body).length > 0
    ) {
      this.logger.debug(`Request Body: ${JSON.stringify(body, null, 2)}`);
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `Completed Request: ${method} ${url} - Duration: ${duration}ms`,
        );
      }),
    );
  }
}
