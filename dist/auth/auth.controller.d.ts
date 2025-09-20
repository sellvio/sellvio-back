import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto, ResendVerificationDto, ForgotPasswordDto, ResetPasswordDto } from './dto/email-verification.dto';
import { RequestUser } from '../common/interfaces/request-user.interface';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    getProfile(user: RequestUser): Promise<{
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
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resendVerification(resendDto: ResendVerificationDto): Promise<{
        success: boolean;
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
