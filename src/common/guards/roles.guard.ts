import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private userTypeCache: Map<string, number> | null = null;

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private async resolveUserTypeIds(names: string[]): Promise<number[]> {
    if (!this.userTypeCache) {
      const types = await this.prisma.user_types.findMany();
      this.userTypeCache = new Map(types.map((t) => [t.user_type, t.id]));
    }
    return names
      .map((n) => this.userTypeCache!.get(n))
      .filter((id): id is number => id !== undefined);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const requiredIds = await this.resolveUserTypeIds(requiredRoles);
    const { user } = context.switchToHttp().getRequest();
    return requiredIds.some((id) => user?.user_type_id === id);
  }
}
