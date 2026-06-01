import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiQueryDto } from './ai.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * AI Controller
 *
 * Access restricted to roles that have operational analytics visibility.
 * userId is extracted from the verified JWT — never from the request body.
 */
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('query')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN')
  askAi(@Body() dto: AiQueryDto, @Req() req: any) {
    // userId and tenantId derive from JWT — never from client-supplied body
    return this.aiService.askAi(dto.query, req.user.userId, req.user.tenantId ?? null);
  }
}
