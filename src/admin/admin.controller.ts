import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  user_type,
  campaign_status,
  transaction_type,
  transaction_status,
} from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
  })
  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_type', required: false, enum: user_type })
  @ApiQuery({ name: 'email_verified', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @Get('users')
  getAllUsers(
    @Query() pagination: PaginationDto,
    @Query('user_type') user_type?: user_type,
    @Query('email_verified') email_verified?: boolean,
  ) {
    const filters = { user_type, email_verified };
    return this.adminService.getAllUsers(pagination, filters);
  }

  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get('users/:id')
  getUserDetails(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserDetails(id);
  }

  @ApiOperation({ summary: 'Get all campaigns with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: campaign_status })
  @ApiQuery({ name: 'business_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  @Get('campaigns')
  getAllCampaigns(
    @Query() pagination: PaginationDto,
    @Query('status') status?: campaign_status,
    @Query('business_id', new ParseIntPipe({ optional: true }))
    business_id?: number,
  ) {
    const filters = { status, business_id };
    return this.adminService.getAllCampaigns(pagination, filters);
  }

  @ApiOperation({ summary: 'Get all transactions with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'transaction_type',
    required: false,
    enum: transaction_type,
  })
  @ApiQuery({ name: 'status', required: false, enum: transaction_status })
  @ApiQuery({ name: 'user_id', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @Get('transactions')
  getAllTransactions(
    @Query() pagination: PaginationDto,
    @Query('transaction_type') transaction_type?: transaction_type,
    @Query('status') status?: transaction_status,
    @Query('user_id', new ParseIntPipe({ optional: true })) user_id?: number,
  ) {
    const filters = { transaction_type, status, user_id };
    return this.adminService.getAllTransactions(pagination, filters);
  }

  @ApiOperation({ summary: 'Approve pending transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction approved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({
    status: 403,
    description: 'Only pending transactions can be approved',
  })
  @Patch('transactions/:id/approve')
  approveTransaction(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveTransaction(id);
  }

  @ApiOperation({ summary: 'Reject pending transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction rejected successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({
    status: 403,
    description: 'Only pending transactions can be rejected',
  })
  @Patch('transactions/:id/reject')
  rejectTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectTransaction(id, reason);
  }

  @ApiOperation({ summary: 'Suspend user account' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.suspendUser(id, reason);
  }

  @ApiOperation({ summary: 'Reactivate suspended user account' })
  @ApiResponse({ status: 200, description: 'User reactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Patch('users/:id/reactivate')
  reactivateUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.reactivateUser(id);
  }

  @ApiOperation({ summary: 'Get system analytics' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'End date (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'System analytics retrieved successfully',
  })
  @Get('analytics')
  getSystemAnalytics(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.adminService.getSystemAnalytics(startDate, endDate);
  }

  @ApiOperation({ summary: 'Create new admin account' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Admin with this email already exists',
  })
  @Post('create-admin')
  createAdmin(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('full_name') fullName: string,
    @Body('is_super_admin') isSuperAdmin?: boolean,
  ) {
    return this.adminService.createAdmin(
      email,
      password,
      fullName,
      isSuperAdmin,
    );
  }

  @ApiOperation({ summary: 'Get all admin accounts' })
  @ApiResponse({
    status: 200,
    description: 'Admin accounts retrieved successfully',
  })
  @Get('admins')
  getAllAdmins() {
    return this.adminService.getAllAdmins();
  }
}
