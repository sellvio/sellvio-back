import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatServerAdminGuard implements CanActivate {
  private adminRoleId: number | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async getAdminRoleId(): Promise<number> {
    if (this.adminRoleId === null) {
      const role = await this.prisma.chat_role_types.findUnique({
        where: { chat_role_type: 'admin' },
      });
      this.adminRoleId = role?.id ?? 0;
    }
    return this.adminRoleId;
  }

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
      select: { role_id: true },
    });

    const adminRoleId = await this.getAdminRoleId();
    if (!membership || membership.role_id !== adminRoleId) {
      throw new ForbiddenException('Only server admins can manage channels');
    }

    return true;
  }
}


