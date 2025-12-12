import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestUser } from '../interfaces/request-user.interface';

@Injectable()
export class IsVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!user.email_verified) {
      throw new UnauthorizedException('Email not verified');
    }
    return true;
  }
}
