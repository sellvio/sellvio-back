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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const client_1 = require("@prisma/client");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    getDashboardStats() {
        return this.adminService.getDashboardStats();
    }
    getAllUsers(pagination, user_type, email_verified) {
        const filters = { user_type, email_verified };
        return this.adminService.getAllUsers(pagination, filters);
    }
    getUserDetails(id) {
        return this.adminService.getUserDetails(id);
    }
    getAllCampaigns(pagination, status, business_id) {
        const filters = { status, business_id };
        return this.adminService.getAllCampaigns(pagination, filters);
    }
    getAllTransactions(pagination, transaction_type, status, user_id) {
        const filters = { transaction_type, status, user_id };
        return this.adminService.getAllTransactions(pagination, filters);
    }
    approveTransaction(id) {
        return this.adminService.approveTransaction(id);
    }
    rejectTransaction(id, reason) {
        return this.adminService.rejectTransaction(id, reason);
    }
    suspendUser(id, reason) {
        return this.adminService.suspendUser(id, reason);
    }
    reactivateUser(id) {
        return this.adminService.reactivateUser(id);
    }
    getSystemAnalytics(startDate, endDate) {
        return this.adminService.getSystemAnalytics(startDate, endDate);
    }
    createAdmin(email, password, fullName, isSuperAdmin) {
        return this.adminService.createAdmin(email, password, fullName, isSuperAdmin);
    }
    getAllAdmins() {
        return this.adminService.getAllAdmins();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard statistics' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Dashboard stats retrieved successfully',
    }),
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all users with pagination and filters' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'user_type', required: false, enum: client_1.user_type }),
    (0, swagger_1.ApiQuery)({ name: 'email_verified', required: false, type: Boolean }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Users retrieved successfully' }),
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('user_type')),
    __param(2, (0, common_1.Query)('email_verified')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, String, Boolean]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get user details by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User details retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, common_1.Get)('users/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserDetails", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all campaigns with pagination and filters' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.campaign_status }),
    (0, swagger_1.ApiQuery)({ name: 'business_id', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Campaigns retrieved successfully' }),
    (0, common_1.Get)('campaigns'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('business_id', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllCampaigns", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all transactions with pagination and filters' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({
        name: 'transaction_type',
        required: false,
        enum: client_1.transaction_type,
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.transaction_status }),
    (0, swagger_1.ApiQuery)({ name: 'user_id', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transactions retrieved successfully',
    }),
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('transaction_type')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('user_id', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, String, String, Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllTransactions", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Approve pending transaction' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction approved successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only pending transactions can be approved',
    }),
    (0, common_1.Patch)('transactions/:id/approve'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveTransaction", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Reject pending transaction' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction rejected successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only pending transactions can be rejected',
    }),
    (0, common_1.Patch)('transactions/:id/reject'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectTransaction", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Suspend user account' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User suspended successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, common_1.Patch)('users/:id/suspend'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Reactivate suspended user account' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User reactivated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, common_1.Patch)('users/:id/reactivate'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reactivateUser", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get system analytics' }),
    (0, swagger_1.ApiQuery)({
        name: 'start_date',
        required: false,
        type: String,
        description: 'Start date (ISO string)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'end_date',
        required: false,
        type: String,
        description: 'End date (ISO string)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'System analytics retrieved successfully',
    }),
    (0, common_1.Get)('analytics'),
    __param(0, (0, common_1.Query)('start_date')),
    __param(1, (0, common_1.Query)('end_date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getSystemAnalytics", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create new admin account' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Admin created successfully' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Admin with this email already exists',
    }),
    (0, common_1.Post)('create-admin'),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Body)('password')),
    __param(2, (0, common_1.Body)('full_name')),
    __param(3, (0, common_1.Body)('is_super_admin')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Boolean]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createAdmin", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get all admin accounts' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Admin accounts retrieved successfully',
    }),
    (0, common_1.Get)('admins'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllAdmins", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map