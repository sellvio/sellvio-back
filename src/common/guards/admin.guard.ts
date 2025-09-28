import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id?: number } | undefined;

    if (!user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    const admin = await this.prisma.admins.findFirst({
      where: { id: user.id },
    });
    if (!admin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
