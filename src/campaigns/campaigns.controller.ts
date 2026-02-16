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
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { UpdateChatServerDto } from './dto/update-chat-server.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IsVerifiedGuard } from '../common/guards/is-verified.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
// Enum string values for Swagger documentation (migrated from Prisma enums to lookup tables)
const CAMPAIGN_STATUS_VALUES = ['draft', 'active', 'paused', 'completed', 'cancelled'];
const PARTICIPATION_STATUS_VALUES = ['pending', 'approved', 'rejected'];
import { CampaignAssetsMulterInterceptor } from '../common/interceptors/campaign-assets.interceptor';
import { UseInterceptors } from '@nestjs/common';
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
  @UseGuards(RolesGuard, IsVerifiedGuard)
  @Roles('business')
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Create campaign via multipart form-data only. For file uploads, use asset_files (multiple). For link assets, use media[] as a JSON string.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Summer Collection Campaign' },
        description: {
          type: 'string',
          example: 'Promote our new summer collection',
        },
        budget: { type: 'number', example: 1000.0 },
        budget_hidden: { type: 'boolean', example: false },
        duration_days: { type: 'number', example: 30, minimum: 1 },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'completed'],
          example: 'draft',
        },
        chat_type: {
          type: 'string',
          enum: ['public', 'private'],
          example: 'public',
        },
        target_creator_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['beginner', 'experienced', 'influencer', 'clipper'],
          },
          example: ['beginner', 'influencer'],
        },
        additional_requirements: {
          type: 'string',
          example: 'Must have experience with beauty products',
        },
        payment_type: {
          type: 'string',
          enum: [
            'cost_per_view',
            'cost_per_click',
            'cost_per_engagement',
            'cost_per_reach',
          ],
          example: 'cost_per_view',
        },
        payment_amount: { type: 'number', example: 50.0 },
        payment_per_quantity: { type: 'number', example: 1000 },
        requirements: {
          type: 'string',
          example: 'Create engaging 30-second videos',
        },
        target_audience: {
          type: 'string',
          example: 'Young adults aged 18-35',
        },
        campaign_image_url: {
          type: 'string',
          format: 'binary',
        },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['instagram', 'tiktok', 'facebook'] },
          example: ['instagram', 'tiktok'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['fashion', 'summer'],
        },
        media: {
          description: 'Link assets. In multipart, pass this as a JSON string.',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Brand Site' },
              url: { type: 'string', example: 'https://example.com' },
              type: { type: 'string', example: 'link' },
            },
            required: ['name', 'url'],
          },
        },
        asset_files: {
          description:
            'Upload multiple files (images/videos). In Postman, add multiple file parts under "asset_files".',
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: [
        'name',
        'budget',
        'duration_days',
        'payment_type',
        'payment_amount',
        'payment_per_quantity',
        'requirements',
        'target_creator_types',
      ],
    },
  })
  @UseInterceptors(CampaignAssetsMulterInterceptor)
  create(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser() user: RequestUser,
    @UploadedFiles() files?: Record<string, Array<any>>,
  ) {
    const uploaded = (files?.['asset_files'] || []).map((f) => {
      const original = String(f.originalname || '');
      const extMatch = original.toLowerCase().match(/\.([a-z0-9]+)$/);
      const ext =
        (extMatch && extMatch[1]) ||
        (String(f.mimetype || '').split('/')[1] || '').toLowerCase() ||
        'file';
      return {
        name: original || `asset_${Date.now()}`,
        url: (f as any).cloudinaryUrl as string,
        type: ext, // e.g., 'jpg', 'png', 'mp4'
        size: typeof f.size === 'number' ? f.size : undefined,
      };
    });
    // Map uploaded campaign_image_url file to DTO if provided
    const cover = files?.['campaign_image_url']?.[0];
    if (cover) {
      const url =
        (cover as any).cloudinaryUrl ?? `/uploads/images/${cover.filename}`;
      (createCampaignDto as any).campaign_image_url = url;
    }
    const dtoWithAssets = {
      ...(createCampaignDto as any),
      uploaded_assets: uploaded,
    };
    return this.campaignsService.create(user.id, dtoWithAssets as any);
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
    enum: CAMPAIGN_STATUS_VALUES,
    description: 'Filter campaigns by status',
    example: 'active',
  })
  @ApiQuery({
    name: 'business_id',
    required: false,
    type: Number,
    description: 'Filter campaigns by business ID',
    example: 1,
  })
  @ApiQuery({
    name: 'creator_types',
    required: false,
    type: [String],
    description:
      'Filter by target creator types (comma-separated: beginner,experienced,influencer,clipper)',
    example: 'beginner,influencer',
  })
  @ApiQuery({
    name: 'platforms',
    required: false,
    type: [String],
    description:
      'Filter by platforms (comma-separated: instagram,tiktok,facebook)',
    example: 'instagram,tiktok',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: [String],
    description: 'Filter by tag names (comma-separated)',
    example: 'fashion,summer',
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
    const { page, limit, status, business_id, creator_types, platforms, tags } =
      query;
    const pagination: PaginationDto = { page, limit } as PaginationDto;
    const filters = { status, business_id, creator_types, platforms, tags };
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
    summary: 'Get chat server for a campaign',
    description:
      'Returns the chat server associated with the campaign, including channels and memberships. Only the campaign owner (business) can access.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Campaign ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Chat server returned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Campaign or chat server not found',
  })
  @Get(':id/chat-server')
  getChatServerByCampaign(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.getChatServerByCampaign(id, user.id);
  }

  @ApiOperation({
    summary: 'Update chat server name and description',
    description:
      'Updates the name and/or description of the chat server associated with the campaign. Only the campaign owner (business) can update.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Campaign ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Chat server updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        campaign_id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Summer Campaign Chat' },
        description: {
          type: 'string',
          example: 'Official chat for Summer Campaign',
        },
        created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - You can only update your own campaigns',
  })
  @ApiResponse({
    status: 404,
    description: 'Campaign or chat server not found',
  })
  @UseGuards(RolesGuard)
  @Roles('business')
  @Patch(':id/chat-server')
  updateChatServer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChatServerDto: UpdateChatServerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.updateChatServer(
      id,
      user.id,
      updateChatServerDto,
    );
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
  @Roles('business')
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
  @Roles('business')
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
  @Roles('creator')
  @Post(':id/participate')
  participate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.participate(id, user.id);
  }

  @ApiOperation({
    summary: 'List participation requests for a campaign',
    description:
      'Business owner can list participation requests/participants for a campaign. Optionally filter by status (pending/approved/rejected).',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Campaign ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PARTICIPATION_STATUS_VALUES,
    description: 'Filter by participation status',
  })
  @ApiResponse({
    status: 200,
    description: 'Participation requests/participants returned',
  })
  @UseGuards(RolesGuard)
  @Roles('business')
  @Get(':id/participation-requests')
  listParticipationRequests(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
  ) {
    return this.campaignsService.listParticipationRequests(id, user.id, status);
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
  @Roles('business')
  @Patch(':campaignId/participants/:creatorId')
  updateParticipationStatus(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @CurrentUser() user: RequestUser,
    @Body('status') status: string,
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

  @ApiOperation({
    summary: 'Search creators by name (for inviting to campaigns)',
    description:
      'Business users can search creators by first name, last name, or full name. Supports simple pagination and filtering by favorites.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search text (matches first name, last name, or full name)',
    example: 'john doe',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default: 10, max: 50)',
    example: 10,
  })
  @ApiQuery({
    name: 'favorites_only',
    required: false,
    type: Boolean,
    description: 'Filter to show only favorite creators',
    example: false,
  })
  @ApiQuery({
    name: 'creator_types',
    required: false,
    type: [String],
    description:
      'Filter by creator types (comma-separated: beginner,experienced,influencer,clipper)',
    example: 'beginner,influencer',
  })
  @ApiQuery({
    name: 'platforms',
    required: false,
    type: [String],
    description:
      'Filter by connected platforms (comma-separated: instagram,tiktok,facebook)',
    example: 'instagram,tiktok',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: [String],
    description: 'Filter by tag names (comma-separated)',
    example: 'fashion,beauty',
  })
  @UseGuards(RolesGuard)
  @Roles('business')
  @Get('creators/search')
  async searchCreators(
    @Query('q') q: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('favorites_only') favoritesOnly: string = 'false',
    @Query('creator_types') creatorTypes: string,
    @Query('platforms') platforms: string,
    @Query('tags') tags: string,
    @CurrentUser() user: RequestUser,
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const filters = {
      favoritesOnly: favoritesOnly === 'true',
      creatorTypes: creatorTypes
        ? creatorTypes.split(',').filter((t) => t.trim())
        : undefined,
      platforms: platforms
        ? platforms.split(',').filter((p) => p.trim())
        : undefined,
      tags: tags ? tags.split(',').filter((t) => t.trim()) : undefined,
    };

    return this.campaignsService.searchCreators(
      user.id,
      q || '',
      { page: safePage, limit: safeLimit },
      filters,
    );
  }

  // ===== Favorite Creators Endpoints =====

  @ApiOperation({
    summary: 'Add a creator to favorites',
    description: 'Business users can add creators to their favorites list.',
  })
  @ApiParam({
    name: 'creatorId',
    type: 'number',
    description: 'Creator user ID to add to favorites',
    example: 5,
  })
  @ApiResponse({
    status: 201,
    description: 'Creator added to favorites',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Creator added to favorites' },
        favorite: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            business_id: { type: 'number' },
            creator_id: { type: 'number' },
            created_at: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('business')
  @Post('favorites/:creatorId')
  addCreatorToFavorites(
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.addCreatorToFavorites(user.id, creatorId);
  }

  @ApiOperation({
    summary: 'Remove a creator from favorites',
    description:
      'Business users can remove creators from their favorites list.',
  })
  @ApiParam({
    name: 'creatorId',
    type: 'number',
    description: 'Creator user ID to remove from favorites',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Creator removed from favorites',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Creator removed from favorites' },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('business')
  @Delete('favorites/:creatorId')
  removeCreatorFromFavorites(
    @Param('creatorId', ParseIntPipe) creatorId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaignsService.removeCreatorFromFavorites(user.id, creatorId);
  }
}
