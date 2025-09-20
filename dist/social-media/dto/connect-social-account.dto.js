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
exports.ConnectSocialAccountDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class ConnectSocialAccountDto {
    platform;
    username;
    profile_url;
    access_token;
    refresh_token;
    token_expires_at;
}
exports.ConnectSocialAccountDto = ConnectSocialAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.social_platform }),
    (0, class_validator_1.IsEnum)(client_1.social_platform),
    __metadata("design:type", String)
], ConnectSocialAccountDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'johndoe123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConnectSocialAccountDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://instagram.com/johndoe123' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], ConnectSocialAccountDto.prototype, "profile_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'access_token_here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConnectSocialAccountDto.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'refresh_token_here' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConnectSocialAccountDto.prototype, "refresh_token", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-12-31T23:59:59Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConnectSocialAccountDto.prototype, "token_expires_at", void 0);
//# sourceMappingURL=connect-social-account.dto.js.map