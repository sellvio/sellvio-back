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
exports.SocialMediaController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const social_media_service_1 = require("./social-media.service");
const connect_social_account_dto_1 = require("./dto/connect-social-account.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let SocialMediaController = class SocialMediaController {
    socialMediaService;
    constructor(socialMediaService) {
        this.socialMediaService = socialMediaService;
    }
    connectAccount(connectDto, user) {
        return this.socialMediaService.connectAccount(user.id, connectDto);
    }
    getConnectedAccounts(user) {
        return this.socialMediaService.getConnectedAccounts(user.id);
    }
    disconnectAccount(platform, user) {
        return this.socialMediaService.disconnectAccount(user.id, platform);
    }
    refreshToken(platform, user, accessToken, refreshToken, expiresAt) {
        return this.socialMediaService.refreshToken(user.id, platform, accessToken, refreshToken, expiresAt);
    }
    syncAccountData(platform, user, accountData) {
        return this.socialMediaService.syncAccountData(user.id, platform, accountData);
    }
    getAccountAnalytics(user, platform) {
        return this.socialMediaService.getAccountAnalytics(user.id, platform);
    }
    updateVideoSocialPost(videoId, user, platform, postUrl, platformPostId) {
        return this.socialMediaService.updateVideoSocialPost(videoId, platform, postUrl, platformPostId);
    }
    getExpiringSoonTokens(daysBefore) {
        return this.socialMediaService.getExpiringSoonTokens(daysBefore);
    }
};
exports.SocialMediaController = SocialMediaController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Connect or update social media account' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Social media account connected successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only creators can connect social media accounts',
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Post)('connect'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [connect_social_account_dto_1.ConnectSocialAccountDto, Object]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "connectAccount", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get connected social media accounts' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Connected accounts retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only creators can view social media accounts',
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Get)('accounts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "getConnectedAccounts", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Disconnect social media account' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Social media account disconnected successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Social media account not found' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Delete)('disconnect/:platform'),
    __param(0, (0, common_1.Param)('platform')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "disconnectAccount", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token for social media account' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Token refreshed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Social media account not found' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Patch)('refresh-token/:platform'),
    __param(0, (0, common_1.Param)('platform')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('access_token')),
    __param(3, (0, common_1.Body)('refresh_token')),
    __param(4, (0, common_1.Body)('expires_at')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "refreshToken", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Sync account data from social platform' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Account data synchronized successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Social media account not found' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Patch)('sync/:platform'),
    __param(0, (0, common_1.Param)('platform')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "syncAccountData", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get analytics for connected social media accounts',
    }),
    (0, swagger_1.ApiQuery)({ name: 'platform', required: false, enum: client_1.social_platform }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Analytics retrieved successfully' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Get)('analytics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('platform')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "getAccountAnalytics", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update social media post for video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Social post updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Post)('videos/:videoId/social-post'),
    __param(0, (0, common_1.Param)('videoId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('platform')),
    __param(3, (0, common_1.Body)('post_url')),
    __param(4, (0, common_1.Body)('platform_post_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, String, String, String]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "updateVideoSocialPost", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get tokens expiring soon (admin endpoint)' }),
    (0, swagger_1.ApiQuery)({
        name: 'days_before',
        required: false,
        type: Number,
        description: 'Days before expiration (default: 7)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Expiring tokens retrieved successfully',
    }),
    (0, common_1.Get)('admin/expiring-tokens'),
    __param(0, (0, common_1.Query)('days_before', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], SocialMediaController.prototype, "getExpiringSoonTokens", null);
exports.SocialMediaController = SocialMediaController = __decorate([
    (0, swagger_1.ApiTags)('Social Media'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('social-media'),
    __metadata("design:paramtypes", [social_media_service_1.SocialMediaService])
], SocialMediaController);
//# sourceMappingURL=social-media.controller.js.map