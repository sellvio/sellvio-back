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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileResponseDto = exports.CreatorProfileDto = exports.BusinessProfileDto = exports.AuthResponseDto = exports.UserResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class UserResponseDto {
    id;
    email;
    user_type;
    email_verified;
    created_at;
}
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'User ID' }),
    __metadata("design:type", Number)
], UserResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com', description: 'User email' }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.user_type,
        example: client_1.user_type.creator,
        description: 'User type',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "user_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Email verification status' }),
    __metadata("design:type", Boolean)
], UserResponseDto.prototype, "email_verified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Account creation date',
    }),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "created_at", void 0);
class AuthResponseDto {
    access_token;
    user;
}
exports.AuthResponseDto = AuthResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT access token',
    }),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: UserResponseDto, description: 'User information' }),
    __metadata("design:type", UserResponseDto)
], AuthResponseDto.prototype, "user", void 0);
class BusinessProfileDto {
    company_name;
    business_email;
    phone;
    website_url;
    logo_url;
    description;
}
exports.BusinessProfileDto = BusinessProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Acme Corporation', description: 'Company name' }),
    __metadata("design:type", String)
], BusinessProfileDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'business@company.com',
        description: 'Business email',
        required: false,
    }),
    __metadata("design:type", String)
], BusinessProfileDto.prototype, "business_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+1234567890',
        description: 'Phone number',
        required: false,
    }),
    __metadata("design:type", String)
], BusinessProfileDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://company.com',
        description: 'Website URL',
        required: false,
    }),
    __metadata("design:type", String)
], BusinessProfileDto.prototype, "website_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://company.com/logo.png',
        description: 'Logo URL',
        required: false,
    }),
    __metadata("design:type", String)
], BusinessProfileDto.prototype, "logo_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'We are a leading company in...',
        description: 'Company description',
        required: false,
    }),
    __metadata("design:type", String)
], BusinessProfileDto.prototype, "description", void 0);
class CreatorProfileDto {
    first_name;
    last_name;
    nickname;
    creator_type;
    bio;
    profile_image_url;
    location;
    phone;
}
exports.CreatorProfileDto = CreatorProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John', description: 'First name' }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe', description: 'Last name' }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'johndoe',
        description: 'Nickname/username',
        required: false,
    }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "nickname", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'beginner',
        description: 'Creator type',
        required: false,
    }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "creator_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Content creator and influencer...',
        description: 'Bio',
        required: false,
    }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "bio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://example.com/profile.jpg',
        description: 'Profile image URL',
        required: false,
    }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "profile_image_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'New York, NY', description: 'Location' }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '+1234567890',
        description: 'Phone number',
        required: false,
    }),
    __metadata("design:type", String)
], CreatorProfileDto.prototype, "phone", void 0);
class ProfileResponseDto extends UserResponseDto {
    business_profiles;
    creator_profiles;
}
exports.ProfileResponseDto = ProfileResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        type: BusinessProfileDto,
        description: 'Business profile (only for business users)',
        required: false,
    }),
    __metadata("design:type", BusinessProfileDto)
], ProfileResponseDto.prototype, "business_profiles", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: CreatorProfileDto,
        description: 'Creator profile (only for creator users)',
        required: false,
    }),
    __metadata("design:type", CreatorProfileDto)
], ProfileResponseDto.prototype, "creator_profiles", void 0);
//# sourceMappingURL=auth-response.dto.js.map