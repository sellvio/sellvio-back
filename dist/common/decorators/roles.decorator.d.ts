import { user_type } from '@prisma/client';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: user_type[]) => import("@nestjs/common").CustomDecorator<string>;
