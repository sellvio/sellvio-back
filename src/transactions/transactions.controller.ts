import {
  Controller,
  Get,
  Post,
  Body,
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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import {
  user_type,
  transaction_type,
  transaction_status,
} from '@prisma/client';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @Post()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.transactionsService.create(user.id, createTransactionDto);
  }

  @ApiOperation({
    summary: 'Get user transactions with pagination and filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'transaction_type',
    required: false,
    enum: transaction_type,
  })
  @ApiQuery({ name: 'status', required: false, enum: transaction_status })
  @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: RequestUser,
    @Query('transaction_type') transaction_type?: transaction_type,
    @Query('status') status?: transaction_status,
    @Query('currency') currency?: string,
  ) {
    const filters = { transaction_type, status, currency };
    return this.transactionsService.findAll(user.id, pagination, filters);
  }

  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({
    status: 403,
    description: 'You can only view your own transactions',
  })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.transactionsService.findOne(id, user.id);
  }

  @ApiOperation({ summary: 'Process payment from business to creator' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  @ApiResponse({
    status: 403,
    description: 'Only business users can process payments',
  })
  @UseGuards(RolesGuard)
  @Roles(user_type.business)
  @Post('process-payment')
  processPayment(
    @CurrentUser() user: RequestUser,
    @Body('campaign_id', ParseIntPipe) campaignId: number,
    @Body('creator_id', ParseIntPipe) creatorId: number,
    @Body('amount') amount: number,
    @Body('description') description?: string,
  ) {
    return this.transactionsService.processPayment(
      campaignId,
      creatorId,
      user.id,
      amount,
      description,
    );
  }

  @ApiOperation({ summary: 'Get account balance' })
  @ApiResponse({
    status: 200,
    description: 'Account balance retrieved successfully',
  })
  @Get('account/balance')
  getAccountBalance(@CurrentUser() user: RequestUser) {
    return this.transactionsService.getAccountBalance(user.id, user.user_type);
  }

  @ApiOperation({ summary: 'Deposit funds (business only)' })
  @ApiResponse({ status: 201, description: 'Funds deposited successfully' })
  @ApiResponse({
    status: 403,
    description: 'Only business users can deposit funds',
  })
  @UseGuards(RolesGuard)
  @Roles(user_type.business)
  @Post('deposit')
  depositFunds(
    @CurrentUser() user: RequestUser,
    @Body('amount') amount: number,
    @Body('currency') currency?: string,
  ) {
    return this.transactionsService.depositFunds(user.id, amount, currency);
  }

  @ApiOperation({ summary: 'Withdraw funds (creator only)' })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request submitted successfully',
  })
  @ApiResponse({ status: 403, description: 'Only creators can withdraw funds' })
  @UseGuards(RolesGuard)
  @Roles(user_type.creator)
  @Post('withdraw')
  withdrawFunds(
    @CurrentUser() user: RequestUser,
    @Body('amount') amount: number,
    @Body('currency') currency?: string,
  ) {
    return this.transactionsService.withdrawFunds(user.id, amount, currency);
  }

  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({
    status: 200,
    description: 'Transaction statistics retrieved successfully',
  })
  @Get('statistics')
  getStatistics(@CurrentUser() user: RequestUser) {
    return this.transactionsService.getTransactionStatistics(
      user.id,
      user.user_type,
    );
  }
}
