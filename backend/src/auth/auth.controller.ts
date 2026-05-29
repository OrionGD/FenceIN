import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ChangePasswordDto, RegisterOrganizationDto, SubmitRequestDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('enrollment-login')
  async enrollmentLogin(@Body() loginDto: LoginDto) {
    return this.authService.enrollmentLogin(loginDto.email, loginDto.password);
  }


  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register-organization')
  async registerOrganization(@Body() dto: RegisterOrganizationDto) {
    return this.authService.registerOrganization(dto);
  }

  // --- PLATFORM HEAD MULTI-TENANT FLOWS ---

  @Post('request-access')
  async requestAccess(@Body() dto: SubmitRequestDto) {
    return this.authService.submitAccessRequest(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_HEAD)
  @Get('platform/requests')
  async getPlatformRequests() {
    return this.authService.getAccessRequests();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_HEAD)
  @Post('platform/review-request')
  async reviewPlatformRequest(@Request() req: any, @Body() body: { requestId: string; status: string; notes?: string }) {
    return this.authService.reviewAccessRequest(body.requestId, body.status, body.notes, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_HEAD)
  @Post('platform/provision-tenant')
  async provisionPlatformTenant(@Request() req: any, @Body() body: { requestId: string; plan?: string }) {
    return this.authService.provisionTenant(body.requestId, body.plan || 'STANDARD', req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_HEAD)
  @Get('platform/analytics')
  async getPlatformAnalytics() {
    return this.authService.getPlatformAnalytics();
  }

  // ----------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @Get('admin-only')
  getAdminData(@Request() req: any) {
    return { message: 'This is protected admin data', user: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto);
  }
}
