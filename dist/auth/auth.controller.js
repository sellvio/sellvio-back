"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const auth_response_dto_1 = require("./dto/auth-response.dto");
const email_verification_dto_1 = require("./dto/email-verification.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async login(loginDto) {
        return this.authService.login(loginDto);
    }
    async getProfile(user) {
        return this.authService.getProfile(user.id);
    }
    async verifyEmail(verifyEmailDto) {
        return this.authService.verifyEmail(verifyEmailDto.token);
    }
    async resendVerification(resendDto) {
        return this.authService.resendVerificationEmail(resendDto.email);
    }
    async forgotPassword(forgotPasswordDto) {
        return this.authService.requestPasswordReset(forgotPasswordDto.email);
    }
    async resetPassword(resetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Register a new user',
        description: `Register a new user account. The registration process creates both a user account and the appropriate profile (business or creator) based on the user type.

**Business Registration Requirements:**
- Company name is required
- Creates a default business account with GEL currency

**Creator Registration Requirements:**
- First name, last name, and location are required
- Creates a default creator account with GEL currency

**Response includes:**
- JWT access token for immediate authentication
- User information including profile data`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'User successfully registered',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Email already registered',
        schema: {
            example: {
                statusCode: 409,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/register',
                method: 'POST',
                error: 'Conflict',
                message: 'Email already registered',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input data or missing required fields',
        schema: {
            example: {
                statusCode: 400,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/register',
                method: 'POST',
                error: 'Bad Request',
                message: 'Company name is required for business accounts',
            },
        },
    }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Login user',
        description: `Authenticate user with email and password.

**Requirements:**
- Valid email address
- Password (minimum 6 characters)
- Email must be verified

**Response includes:**
- JWT access token valid for 24 hours
- User information`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User successfully logged in',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Invalid credentials or email not verified',
        schema: {
            example: {
                statusCode: 401,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/login',
                method: 'POST',
                error: 'Unauthorized',
                message: 'Invalid credentials',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input data',
        schema: {
            example: {
                statusCode: 400,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/login',
                method: 'POST',
                error: 'Bad Request',
                message: 'Email must be a valid email address',
            },
        },
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get current user profile',
        description: `Retrieve the complete profile of the currently authenticated user.

**Requires:**
- Valid JWT token in Authorization header

**Returns:**
- Complete user information
- Business profile (for business users)
- Creator profile (for creator users)
- Account information`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User profile retrieved successfully',
        type: auth_response_dto_1.ProfileResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
        schema: {
            example: {
                statusCode: 401,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/profile',
                method: 'GET',
                error: 'Unauthorized',
                message: 'User not found',
            },
        },
    }),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('profile'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Verify email address',
        description: `Verify user email address using verification token.

**Process:**
- User clicks verification link from email
- Token is validated and marked as used
- User's email_verified status is updated to true
- Welcome email is sent upon successful verification

**Token Rules:**
- Tokens expire after 24 hours
- Each token can only be used once
- Invalid or expired tokens return error`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Email verified successfully',
        type: email_verification_dto_1.EmailVerificationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid or expired verification token',
        schema: {
            example: {
                statusCode: 400,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/verify-email',
                method: 'POST',
                error: 'Bad Request',
                message: 'Invalid or expired verification token',
            },
        },
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('verify-email'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [email_verification_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Resend email verification',
        description: `Resend email verification link to user.

**Requirements:**
- Valid email address
- User must exist in the system
- Email must not be already verified

**Process:**
- Generates new verification token
- Invalidates any existing tokens for the user
- Sends new verification email
- Token expires in 24 hours`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Verification email sent successfully',
        type: email_verification_dto_1.EmailVerificationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Email already verified or user not found',
        schema: {
            example: {
                statusCode: 400,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/resend-verification',
                method: 'POST',
                error: 'Bad Request',
                message: 'Email is already verified',
            },
        },
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('resend-verification'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [email_verification_dto_1.ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Request password reset',
        description: `Send password reset email to user.

**Requirements:**
- Valid email address
- User must exist in the system
- Email must be verified

**Process:**
- Generates secure reset token
- Invalidates any existing reset tokens
- Sends password reset email
- Token expires in 1 hour

**Security Features:**
- Rate limiting on password reset requests
- Secure token generation
- Email validation required`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset email sent if user exists',
        type: email_verification_dto_1.EmailVerificationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 429,
        description: 'Too many password reset requests',
        schema: {
            example: {
                statusCode: 429,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/forgot-password',
                method: 'POST',
                error: 'Too Many Requests',
                message: 'Too many password reset requests. Please try again later.',
            },
        },
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [email_verification_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Reset password with token',
        description: `Reset user password using reset token.

**Requirements:**
- Valid reset token (not expired or used)
- Strong password (minimum 6 characters)

**Process:**
- Validates reset token
- Hashes new password securely
- Updates user password
- Marks token as used
- Invalidates all user sessions

**Security Features:**
- Token can only be used once
- Password strength validation
- Automatic session invalidation
- Secure password hashing`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset successfully',
        type: email_verification_dto_1.EmailVerificationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid or expired reset token',
        schema: {
            example: {
                statusCode: 400,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/auth/reset-password',
                method: 'POST',
                error: 'Bad Request',
                message: 'Invalid or expired reset token',
            },
        },
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [email_verification_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map