import { SetMetadata } from '@nestjs/common';
import { user_type } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: user_type[]) => SetMetadata(ROLES_KEY, roles);
