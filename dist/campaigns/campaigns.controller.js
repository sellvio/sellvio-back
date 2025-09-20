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
exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const campaigns_service_1 = require("./campaigns.service");
const create_campaign_dto_1 = require("./dto/create-campaign.dto");
const update_campaign_dto_1 = require("./dto/update-campaign.dto");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const campaign_response_dto_1 = require("./dto/campaign-response.dto");
let CampaignsController = class CampaignsController {
    campaignsService;
    constructor(campaignsService) {
        this.campaignsService = campaignsService;
    }
    create(createCampaignDto, user) {
        return this.campaignsService.create(user.id, createCampaignDto);
    }
    findAll(pagination, status, business_id) {
        const filters = { status, business_id };
        return this.campaignsService.findAll(pagination, filters);
    }
    findOne(id) {
        return this.campaignsService.findOne(id);
    }
    update(id, updateCampaignDto, user) {
        return this.campaignsService.update(id, user.id, updateCampaignDto);
    }
    remove(id, user) {
        return this.campaignsService.remove(id, user.id);
    }
    participate(id, user) {
        return this.campaignsService.participate(id, user.id);
    }
    updateParticipationStatus(campaignId, creatorId, user, status, rejectionReason) {
        return this.campaignsService.updateParticipationStatus(campaignId, creatorId, user.id, status, rejectionReason);
    }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new campaign',
        description: `Create a new marketing campaign. Only business users can create campaigns.

**Features:**
- Define campaign budget and duration
- Set target creator types and requirements
- Configure payment structure (CPV, CPC, fixed rate)
- Specify target audience and platforms
- Upload campaign images and materials

**Business Rules:**
- Campaign must have a valid finish date
- Budget must be positive
- At least one target creator type required
- Payment amount and structure must be defined`,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Campaign created successfully',
        type: campaign_response_dto_1.CampaignResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Access denied - Only business users can create campaigns',
        schema: {
            example: {
                statusCode: 403,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns',
                method: 'POST',
                error: 'Forbidden',
                message: 'Access denied. Only business users can create campaigns',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid campaign data',
        schema: {
            example: {
                statusCode: 400,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns',
                method: 'POST',
                error: 'Bad Request',
                message: 'Budget must be greater than 0',
            },
        },
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.business),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_campaign_dto_1.CreateCampaignDto, Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get all campaigns with pagination and filters',
        description: `Retrieve campaigns with optional filtering and pagination.

**Filters Available:**
- **status**: Filter by campaign status (draft, active, paused, completed, cancelled)
- **business_id**: Filter by specific business

**Pagination:**
- **page**: Page number (default: 1)
- **limit**: Items per page (default: 10, max: 100)

**Returns:**
- Paginated list of campaigns with basic information
- Includes participant and video counts
- Business profile information for each campaign`,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number for pagination (default: 1)',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page (default: 10, max: 100)',
        example: 10,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: client_1.campaign_status,
        description: 'Filter campaigns by status',
        example: client_1.campaign_status.active,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'business_id',
        required: false,
        type: Number,
        description: 'Filter campaigns by business ID',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Campaigns retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/CampaignWithDetailsDto' },
                },
                total: { type: 'number', example: 150 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                totalPages: { type: 'number', example: 15 },
            },
        },
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('business_id', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, String, Number]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get campaign by ID',
        description: `Retrieve detailed information about a specific campaign.

**Includes:**
- Complete campaign details
- Business profile information
- Target platforms and tags
- Participant and video statistics
- Campaign requirements and payment structure`,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Campaign ID',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Campaign retrieved successfully',
        type: campaign_response_dto_1.CampaignWithDetailsDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Campaign not found',
        schema: {
            example: {
                statusCode: 404,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1',
                method: 'GET',
                error: 'Not Found',
                message: 'Campaign with ID 1 not found',
            },
        },
    }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Update campaign',
        description: `Update an existing campaign. Only the campaign owner can modify it.

**Updatable Fields:**
- Campaign name and description
- Budget and payment structure
- Target creator types and requirements
- Campaign status (active, paused, etc.)
- Target audience and additional requirements

**Restrictions:**
- Cannot update campaigns with active participants
- Budget can only be increased, not decreased
- Finish date cannot be moved to past`,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Campaign ID to update',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Campaign updated successfully',
        type: campaign_response_dto_1.CampaignResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Access denied - You can only update your own campaigns',
        schema: {
            example: {
                statusCode: 403,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1',
                method: 'PATCH',
                error: 'Forbidden',
                message: 'You can only update your own campaigns',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Campaign not found',
        schema: {
            example: {
                statusCode: 404,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1',
                method: 'PATCH',
                error: 'Not Found',
                message: 'Campaign with ID 1 not found',
            },
        },
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.business),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_campaign_dto_1.UpdateCampaignDto, Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Delete campaign',
        description: `Delete a campaign. Only the campaign owner can delete it.

**Deletion Rules:**
- Cannot delete campaigns with active participants
- Cannot delete campaigns with submitted videos
- All related data (applications, chat history) will be preserved
- This action cannot be undone

**Alternative:** Consider changing status to 'cancelled' instead of deletion`,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Campaign ID to delete',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Campaign deleted successfully',
        schema: {
            example: {
                success: true,
                message: 'Campaign deleted successfully',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Access denied - You can only delete your own campaigns',
        schema: {
            example: {
                statusCode: 403,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1',
                method: 'DELETE',
                error: 'Forbidden',
                message: 'You can only delete your own campaigns',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Campaign not found',
        schema: {
            example: {
                statusCode: 404,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1',
                method: 'DELETE',
                error: 'Not Found',
                message: 'Campaign with ID 1 not found',
            },
        },
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.business),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "remove", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Apply to participate in a campaign',
        description: `Submit an application to participate in a campaign. Only creators can apply.

**Application Process:**
- Creator submits application for campaign participation
- Business owner reviews and approves/rejects application
- Approved creators can then submit content

**Requirements:**
- Campaign must be active
- Creator must meet campaign requirements
- Cannot apply twice to the same campaign
- Creator profile must be complete`,
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        type: 'number',
        description: 'Campaign ID to participate in',
        example: 1,
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Successfully applied to participate',
        type: campaign_response_dto_1.ParticipationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Access denied - Only creators can participate',
        schema: {
            example: {
                statusCode: 403,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1/participate',
                method: 'POST',
                error: 'Forbidden',
                message: 'Only creators can participate in campaigns',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Cannot participate - Already applied or campaign not active',
        schema: {
            example: {
                statusCode: 400,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1/participate',
                method: 'POST',
                error: 'Bad Request',
                message: 'You have already applied to this campaign',
            },
        },
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Post)(':id/participate'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "participate", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Update participation status',
        description: `Approve or reject creator participation in your campaign.

**Status Options:**
- **pending**: Initial application state
- **approved**: Creator can submit content
- **rejected**: Application denied with reason

**Business Rules:**
- Only campaign owners can manage participants
- Must provide rejection reason when rejecting
- Cannot change status of participants with submitted content
- Approved creators receive notification to start creating`,
    }),
    (0, swagger_1.ApiParam)({
        name: 'campaignId',
        type: 'number',
        description: 'Campaign ID',
        example: 1,
    }),
    (0, swagger_1.ApiParam)({
        name: 'creatorId',
        type: 'number',
        description: 'Creator ID to update',
        example: 5,
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                status: {
                    enum: ['pending', 'approved', 'rejected'],
                    description: 'New participation status',
                    example: 'approved',
                },
                rejectionReason: {
                    type: 'string',
                    description: 'Reason for rejection (required when rejecting)',
                    example: 'Profile does not match campaign requirements',
                },
            },
            required: ['status'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Participation status updated successfully',
        type: campaign_response_dto_1.ParticipationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Access denied - You can only manage your own campaigns',
        schema: {
            example: {
                statusCode: 403,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/campaigns/1/participants/5',
                method: 'PATCH',
                error: 'Forbidden',
                message: 'You can only manage participants in your own campaigns',
            },
        },
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.business),
    (0, common_1.Patch)(':campaignId/participants/:creatorId'),
    __param(0, (0, common_1.Param)('campaignId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('creatorId', common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)('status')),
    __param(4, (0, common_1.Body)('rejectionReason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object, String, String]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "updateParticipationStatus", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, swagger_1.ApiTags)('Campaigns'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('campaigns'),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], CampaignsController);
//# sourceMappingURL=campaigns.controller.js.map