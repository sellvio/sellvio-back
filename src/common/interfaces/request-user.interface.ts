import { user_type } from '@prisma/client';

export interface RequestUser {
  id: number;
  email: string;
  user_type: user_type;
  email_verified: boolean;
}
