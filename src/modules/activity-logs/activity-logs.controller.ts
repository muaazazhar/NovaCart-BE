import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ActivityLogsService } from './activity-logs.service';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @RequirePermissions('activity_logs:read')
  @ApiOperation({ summary: 'List activity logs' })
  findAll(@Query() query: PaginationDto) {
    return this.activityLogsService.findAll(query);
  }

  @Get('user/:userId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @RequirePermissions('activity_logs:read')
  @ApiOperation({ summary: 'List activity logs for a user' })
  findByUser(@Param('userId') userId: string, @Query() query: PaginationDto) {
    return this.activityLogsService.findByUser(userId, query);
  }
}
