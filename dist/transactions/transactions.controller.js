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
exports.TransactionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const transactions_service_1 = require("./transactions.service");
const create_transaction_dto_1 = require("./dto/create-transaction.dto");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let TransactionsController = class TransactionsController {
    transactionsService;
    constructor(transactionsService) {
        this.transactionsService = transactionsService;
    }
    create(createTransactionDto, user) {
        return this.transactionsService.create(user.id, createTransactionDto);
    }
    findAll(pagination, user, transaction_type, status, currency) {
        const filters = { transaction_type, status, currency };
        return this.transactionsService.findAll(user.id, pagination, filters);
    }
    findOne(id, user) {
        return this.transactionsService.findOne(id, user.id);
    }
    processPayment(user, campaignId, creatorId, amount, description) {
        return this.transactionsService.processPayment(campaignId, creatorId, user.id, amount, description);
    }
    getAccountBalance(user) {
        return this.transactionsService.getAccountBalance(user.id, user.user_type);
    }
    depositFunds(user, amount, currency) {
        return this.transactionsService.depositFunds(user.id, amount, currency);
    }
    withdrawFunds(user, amount, currency) {
        return this.transactionsService.withdrawFunds(user.id, amount, currency);
    }
    getStatistics(user) {
        return this.transactionsService.getTransactionStatistics(user.id, user.user_type);
    }
};
exports.TransactionsController = TransactionsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a new transaction' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Transaction created successfully' }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_transaction_dto_1.CreateTransactionDto, Object]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get user transactions with pagination and filters',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({
        name: 'transaction_type',
        required: false,
        enum: client_1.transaction_type,
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.transaction_status }),
    (0, swagger_1.ApiQuery)({ name: 'currency', required: false, type: String }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transactions retrieved successfully',
    }),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('transaction_type')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, Object, String, String, String]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'You can only view your own transactions',
    }),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Process payment from business to creator' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment processed successfully' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only business users can process payments',
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.business),
    (0, common_1.Post)('process-payment'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('campaign_id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)('creator_id', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Body)('amount')),
    __param(4, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, Number, String]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "processPayment", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get account balance' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Account balance retrieved successfully',
    }),
    (0, common_1.Get)('account/balance'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "getAccountBalance", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Deposit funds (business only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Funds deposited successfully' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Only business users can deposit funds',
    }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.business),
    (0, common_1.Post)('deposit'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('amount')),
    __param(2, (0, common_1.Body)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, String]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "depositFunds", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Withdraw funds (creator only)' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Withdrawal request submitted successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Only creators can withdraw funds' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.user_type.creator),
    (0, common_1.Post)('withdraw'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('amount')),
    __param(2, (0, common_1.Body)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, String]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "withdrawFunds", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction statistics' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction statistics retrieved successfully',
    }),
    (0, common_1.Get)('statistics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "getStatistics", null);
exports.TransactionsController = TransactionsController = __decorate([
    (0, swagger_1.ApiTags)('Transactions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('transactions'),
    __metadata("design:paramtypes", [transactions_service_1.TransactionsService])
], TransactionsController);
//# sourceMappingURL=transactions.controller.js.map