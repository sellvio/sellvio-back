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
exports.CreateCampaignDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateCampaignDto {
    name;
    description;
    budget;
    budget_hidden = false;
    duration_days;
    finish_date;
    status = client_1.campaign_status.draft;
    chat_type = client_1.chat_type.public;
    target_creator_types;
    additional_requirements;
    payment_type;
    payment_amount;
    payment_per_quantity;
    requirements;
    target_audience;
    campaign_image_url;
    platforms;
    tags;
}
exports.CreateCampaignDto = CreateCampaignDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Summer Collection Campaign' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Promote our new summer collection' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000.0 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateCampaignDto.prototype, "budget", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCampaignDto.prototype, "budget_hidden", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 30 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCampaignDto.prototype, "duration_days", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-12-31' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "finish_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.campaign_status,
        default: client_1.campaign_status.draft,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.campaign_status),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.chat_type, default: client_1.chat_type.public }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.chat_type),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "chat_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.creator_type, isArray: true }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(client_1.creator_type, { each: true }),
    __metadata("design:type", Array)
], CreateCampaignDto.prototype, "target_creator_types", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Must have experience with beauty products' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "additional_requirements", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.payment_type }),
    (0, class_validator_1.IsEnum)(client_1.payment_type),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "payment_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50.0 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateCampaignDto.prototype, "payment_amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCampaignDto.prototype, "payment_per_quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Create engaging 30-second videos' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "requirements", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Young adults aged 18-35' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "target_audience", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://example.com/image.jpg' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "campaign_image_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.social_platform, isArray: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(client_1.social_platform, { each: true }),
    __metadata("design:type", Array)
], CreateCampaignDto.prototype, "platforms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ isArray: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateCampaignDto.prototype, "tags", void 0);
//# sourceMappingURL=create-campaign.dto.js.map