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
exports.ParticipationResponseDto = exports.CampaignWithDetailsDto = exports.CampaignTagDto = exports.CampaignPlatformDto = exports.BusinessProfileSummaryDto = exports.CampaignResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CampaignResponseDto {
    id;
    business_id;
    name;
    description;
    budget;
    budget_hidden;
    duration_days;
    finish_date;
    status;
    chat_type;
    target_creator_types;
    additional_requirements;
    payment_type;
    payment_amount;
    payment_per_quantity;
    requirements;
    target_audience;
    campaign_image_url;
    start_date;
    end_date;
    created_at;
}
exports.CampaignResponseDto = CampaignResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Campaign ID' }),
    __metadata("design:type", Number)
], CampaignResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Business ID' }),
    __metadata("design:type", Number)
], CampaignResponseDto.prototype, "business_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Summer Collection Campaign',
        description: 'Campaign name',
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Promote our new summer collection',
        description: 'Campaign description',
        required: false,
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000.0, description: 'Campaign budget' }),
    __metadata("design:type", Number)
], CampaignResponseDto.prototype, "budget", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: false,
        description: 'Is budget hidden from creators',
    }),
    __metadata("design:type", Boolean)
], CampaignResponseDto.prototype, "budget_hidden", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 30, description: 'Campaign duration in days' }),
    __metadata("design:type", Number)
], CampaignResponseDto.prototype, "duration_days", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-12-31', description: 'Campaign finish date' }),
    __metadata("design:type", Date)
], CampaignResponseDto.prototype, "finish_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.campaign_status,
        example: client_1.campaign_status.active,
        description: 'Campaign status',
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.chat_type,
        example: client_1.chat_type.public,
        description: 'Chat type',
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "chat_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.creator_type,
        isArray: true,
        example: [client_1.creator_type.influencer, client_1.creator_type.experienced],
        description: 'Target creator types',
    }),
    __metadata("design:type", Array)
], CampaignResponseDto.prototype, "target_creator_types", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Must have experience with beauty products',
        description: 'Additional requirements',
        required: false,
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "additional_requirements", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.payment_type,
        example: client_1.payment_type.cost_per_view,
        description: 'Payment type',
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "payment_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50.0, description: 'Payment amount' }),
    __metadata("design:type", Number)
], CampaignResponseDto.prototype, "payment_amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000, description: 'Payment per quantity' }),
    __metadata("design:type", Number)
], CampaignResponseDto.prototype, "payment_per_quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Create engaging 30-second videos',
        description: 'Campaign requirements',
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "requirements", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Young adults aged 18-35',
        description: 'Target audience',
        required: false,
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "target_audience", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://example.com/image.jpg',
        description: 'Campaign image URL',
        required: false,
    }),
    __metadata("design:type", String)
], CampaignResponseDto.prototype, "campaign_image_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Campaign start date',
    }),
    __metadata("design:type", Date)
], CampaignResponseDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-12-31T00:00:00.000Z',
        description: 'Campaign end date',
        required: false,
    }),
    __metadata("design:type", Date)
], CampaignResponseDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Campaign creation date',
    }),
    __metadata("design:type", Date)
], CampaignResponseDto.prototype, "created_at", void 0);
class BusinessProfileSummaryDto {
    company_name;
    logo_url;
}
exports.BusinessProfileSummaryDto = BusinessProfileSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Acme Corporation', description: 'Company name' }),
    __metadata("design:type", String)
], BusinessProfileSummaryDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://company.com/logo.png',
        description: 'Logo URL',
        required: false,
    }),
    __metadata("design:type", String)
], BusinessProfileSummaryDto.prototype, "logo_url", void 0);
class CampaignPlatformDto {
    platform;
}
exports.CampaignPlatformDto = CampaignPlatformDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.social_platform,
        example: client_1.social_platform.instagram,
        description: 'Social platform',
    }),
    __metadata("design:type", String)
], CampaignPlatformDto.prototype, "platform", void 0);
class CampaignTagDto {
    name;
}
exports.CampaignTagDto = CampaignTagDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'fashion', description: 'Tag name' }),
    __metadata("design:type", String)
], CampaignTagDto.prototype, "name", void 0);
class CampaignWithDetailsDto extends CampaignResponseDto {
    business_profiles;
    campaign_platforms;
    campaign_tags;
    _count;
}
exports.CampaignWithDetailsDto = CampaignWithDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        type: BusinessProfileSummaryDto,
        description: 'Business profile information',
    }),
    __metadata("design:type", BusinessProfileSummaryDto)
], CampaignWithDetailsDto.prototype, "business_profiles", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [CampaignPlatformDto],
        description: 'Target platforms',
    }),
    __metadata("design:type", Array)
], CampaignWithDetailsDto.prototype, "campaign_platforms", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: [CampaignTagDto],
        description: 'Campaign tags',
    }),
    __metadata("design:type", Array)
], CampaignWithDetailsDto.prototype, "campaign_tags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: 'object',
        properties: {
            campaign_participants: { type: 'number' },
            campaign_videos: { type: 'number' },
        },
        description: 'Participant and video counts',
    }),
    __metadata("design:type", Object)
], CampaignWithDetailsDto.prototype, "_count", void 0);
class ParticipationResponseDto {
    id;
    campaign_id;
    creator_id;
    status;
    applied_at;
    approved_at;
    approved_by;
    rejection_reason;
}
exports.ParticipationResponseDto = ParticipationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Participation ID' }),
    __metadata("design:type", Number)
], ParticipationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Campaign ID' }),
    __metadata("design:type", Number)
], ParticipationResponseDto.prototype, "campaign_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Creator ID' }),
    __metadata("design:type", Number)
], ParticipationResponseDto.prototype, "creator_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.participation_status,
        example: client_1.participation_status.pending,
        description: 'Participation status',
    }),
    __metadata("design:type", String)
], ParticipationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Application date',
    }),
    __metadata("design:type", Date)
], ParticipationResponseDto.prototype, "applied_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Approval date',
        required: false,
    }),
    __metadata("design:type", Date)
], ParticipationResponseDto.prototype, "approved_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 1,
        description: 'ID of user who approved',
        required: false,
    }),
    __metadata("design:type", Number)
], ParticipationResponseDto.prototype, "approved_by", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Not suitable for this campaign',
        description: 'Rejection reason',
        required: false,
    }),
    __metadata("design:type", String)
], ParticipationResponseDto.prototype, "rejection_reason", void 0);
//# sourceMappingURL=campaign-response.dto.js.map