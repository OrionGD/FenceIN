import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** GET /analytics/dashboard — Combined live PG + MongoDB analytics */
  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN')
  getDashboard(@Req() req: any) {
    const user = req.user;
    const tenantId = user.role === 'SUPER_ADMIN' ? undefined : user.tenantId;
    return this.analyticsService.getDashboard(tenantId);
  }

  /** GET /analytics/snapshots?period=daily&days=30 */
  @Get('snapshots')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN')
  getSnapshots(
    @Req() req: any,
    @Query('period') period: 'hourly' | 'daily' | 'weekly' = 'daily',
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const tenantId = req.user.role === 'SUPER_ADMIN' ? undefined : req.user.tenantId;
    return this.analyticsService.getDailySnapshots(tenantId, days);
  }

  /** GET /analytics/inferences?method=face&outcome=match&limit=50 */
  @Get('inferences')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'SECURITY_OFFICER')
  getInferences(
    @Req() req: any,
    @Query('method') method?: string,
    @Query('outcome') outcome?: string,
    @Query('userId') userId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.analyticsService.getInferenceLogsScoped(req.user, { method, outcome, userId, limit });
  }

  /** GET /analytics/audit-logs?userId=...&limit=50 */
  @Get('audit-logs')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  getAuditLogs(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.analyticsService.getAuditLogsScoped(req.user, userId, limit);
  }

  /** GET /analytics/ai-chat?userId=...&limit=20 */
  @Get('ai-chat')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  getAiChatHistory(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.analyticsService.getAiChatHistoryScoped(req.user, userId, limit);
  }
}
