import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private emailService;
    constructor(prisma: PrismaService, jwtService: JwtService, emailService: EmailService);
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            user_type: import(".prisma/client").$Enums.user_type | null;
            email_verified: boolean | null;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            user_type: import(".prisma/client").$Enums.user_type | null;
            email_verified: boolean | null;
        };
    }>;
    validateUser(email: string, password: string): Promise<{
        id: number;
        email: string;
        user_type: import(".prisma/client").$Enums.user_type | null;
        email_verified: boolean | null;
    } | null>;
    private generateToken;
    getProfile(userId: number): Promise<{
        business_profiles: {
            description: string | null;
            company_name: string;
            website_url: string | null;
            business_email: string | null;
            phone: string | null;
            logo_url: string | null;
            business_employee_range: string | null;
        } | null;
        creator_profiles: {
            creator_type: import(".prisma/client").$Enums.creator_type | null;
            first_name: string;
            last_name: string;
            nickname: string | null;
            location: string;
            phone: string | null;
            date_of_birth: Date | null;
            bio: string | null;
            profile_image_url: string | null;
        } | null;
        email: string;
        user_type: import(".prisma/client").$Enums.user_type | null;
        id: number;
        email_verified: boolean | null;
        created_at: Date | null;
    }>;
    private sendVerificationEmail;
    verifyEmail(token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resendVerificationEmail(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private sendWelcomeEmail;
}
