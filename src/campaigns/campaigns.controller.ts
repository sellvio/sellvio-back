import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import {
  user_type,
  campaign_status,
  participation_status,
} from '@prisma/client';
import {
  CampaignResponseDto,
  CampaignWithDetailsDto,
  ParticipationResponseDto,
} from './dto/campaign-response.dto';

@ApiTags('Campaigns')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @ApiOperation({
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
  })
  @ApiResponse({
    status: 201,
    description: 'Campaign created successfully',
    type: CampaignResponseDto,
  })
  @ApiResponse({
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
  })
  @ApiResponse({
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
  })
  @UseGuards(RolesGuard)
  @Roles(user_type.business)
  @Post()
  @ApiBody({
    description: 'Create campaign body',
    examples: {
      Full: {
        summary: 'All fields example',
        value: {
          name: 'Summer Collection Campaign',
          description: 'Promote our new summer collection',
          budget: 1000.0,
          budget_hidden: false,
          duration_days: 30,
          status: 'draft',
          chat_type: 'public',
          target_creator_types: ['beginner', 'influencer'],
          additional_requirements: 'Must have experience with beauty products',
          payment_type: 'cost_per_view',
          payment_amount: 50.0,
          payment_per_quantity: 1000,
          requirements: 'Create engaging 30-second videos',
          target_audience: 'Young adults aged 18-35',
          campaign_image_url: 'https://example.com/image.jpg',
          platforms: ['instagram', 'tiktok'],
          tags: ['fashion', 'summer'],
          media: [
            {
              name: 'Banner Image',
              url: 'https://example.com/banner.jpg',
              type: 'image',
            },
          ],
        },
      },
    },
  })
  create(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.create(user.id, createCampaignDto);
  }

  @ApiOperation({
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
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: campaign_status,
    description: 'Filter campaigns by status',
    example: campaign_status.active,
  })
  @ApiQuery({
    name: 'business_id',
    required: false,
    type: Number,
    description: 'Filter campaigns by business ID',
    example: 1,
  })
  @ApiResponse({
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
  })
  @Get()
  findAll(@Query() query: ListCampaignsDto) {
    const { page, limit, status, business_id } = query;
    const pagination: PaginationDto = { page, limit } as PaginationDto;
    const filters = { status, business_id };
    return this.campaignsService.findAll(pagination, filters);
  }

  @ApiOperation({
    summary: 'Get campaign by ID',
    description: `Retrieve detailed information about a specific campaign.

**Includes:**
- Complete campaign details
- Business profile information
- Target platforms and tags
- Participant and video statistics
- Campaign requirements and payment structure`,
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Campaign ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Campaign retrieved successfully',
    type: CampaignWithDetailsDto,
  })
  @ApiResponse({
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
  })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.findOne(id);
  }

  @ApiOperation({
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
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Campaign ID to update',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Campaign updated successfully',
    type: CampaignResponseDto,
  })
  @ApiResponse({
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
  })
  @ApiResponse({
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
  })
  @UseGuards(RolesGuard)
  @Roles(user_type.business)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.update(id, user.id, updateCampaignDto);
  }

  @ApiOperation({
    summary: 'Delete campaign',
    description: `Delete a campaign. Only the campaign owner can delete it.

**Deletion Rules:**
- Cannot delete campaigns with active participants
- Cannot delete campaigns with submitted videos
- All related data (applications, chat history) will be preserved
- This action cannot be undone

**Alternative:** Consider changing status to 'cancelled' instead of deletion`,
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Campaign ID to delete',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Campaign deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Campaign deleted successfully',
      },
    },
  })
  @ApiResponse({
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
  })
  @ApiResponse({
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
  })
  @UseGuards(RolesGuard)
  @Roles(user_type.business)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.remove(id, user.id);
  }

  @ApiOperation({
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
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Campaign ID to participate in',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully applied to participate',
    type: ParticipationResponseDto,
  })
  @ApiResponse({
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
  })
  @ApiResponse({
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
  })
  @UseGuards(RolesGuard)
  @Roles(user_type.creator)
  @Post(':id/participate')
  participate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.participate(id, user.id);
  }

  @ApiOperation({
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
  })
  @ApiParam({
    name: 'campaignId',
    type: 'number',
    description: 'Campaign ID',
    example: 1,
  })
  @ApiParam({
    name: 'creatorId',
    type: 'number',
    description: 'Creator ID to update',
    example: 5,
  })
  @ApiBody({
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
  })
  @ApiResponse({
    status: 200,
    description: 'Participation status updated successfully',
    type: ParticipationResponseDto,
  })
  @ApiResponse({
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
  })
  @UseGuards(RolesGuard)
  @Roles(user_type.business)
  @Patch(':campaignId/participants/:creatorId')
  updateParticipationStatus(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @CurrentUser() user: RequestUser,
    @Body('status') status: participation_status,
    @Body('rejectionReason') rejectionReason?: string,
  ) {
    return this.campaignsService.updateParticipationStatus(
      campaignId,
      creatorId,
      user.id,
      status,
      rejectionReason,
    );
  }
}
