import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { chat_role_type } from '@prisma/client';

@Injectable()
export class ChatServerAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: number } | undefined;
    const serverIdParam = request.params?.serverId;
    const serverId = Number(serverIdParam);

    if (!user?.id || !serverId || Number.isNaN(serverId)) {
      throw new ForbiddenException('Invalid user or server context');
    }

    const membership = await this.prisma.chat_memberships.findUnique({
      where: {
        chat_server_id_user_id: {
          chat_server_id: serverId,
          user_id: user.id,
        },
      },
      select: { role: true },
    });

    if (!membership || membership.role !== chat_role_type.admin) {
      throw new ForbiddenException('Only server admins can manage channels');
    }

    return true;
  }
}


