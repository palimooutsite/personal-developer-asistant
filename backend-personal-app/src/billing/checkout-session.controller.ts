import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import {
  BillingCheckoutSessionResponse,
  BillingCheckoutSessionService,
  BillingCheckoutSessionSuccessResponse,
} from './checkout-session.service.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';

@Controller('billing/checkout-sessions')
@UseGuards(JwtAuthGuard)
export class BillingCheckoutSessionController {
  constructor(
    private readonly checkoutSessionService: BillingCheckoutSessionService,
  ) {}

  @Post()
  create(
    @Body() body: CreateCheckoutSessionDto,
    @Req() req: AuthRequest,
  ): Promise<BillingCheckoutSessionResponse> {
    return this.checkoutSessionService.create(req.user.userId, body);
  }

  @Post(':sessionId/sandbox/succeed')
  sandboxSucceed(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthRequest,
  ): Promise<BillingCheckoutSessionSuccessResponse> {
    return this.checkoutSessionService.sandboxSucceed(
      req.user.userId,
      sessionId,
    );
  }

  @Post(':sessionId/sandbox/fail')
  sandboxFail(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthRequest,
  ): Promise<{ sessionId: string; status: 'FAILED' }> {
    return this.checkoutSessionService.sandboxFail(
      req.user.userId,
      sessionId,
    );
  }
}
