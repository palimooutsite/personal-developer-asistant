import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import {
  BillingDiscountMessageResponse,
  BillingDiscountPackageResponse,
  BillingDiscountResponse,
  BillingDiscountService,
} from './discount.service.js';
import { CreateDiscountDto } from './dto/create-discount.dto.js';
import { SetDiscountPackageDto } from './dto/set-discount-package.dto.js';
import { UpdateDiscountDto } from './dto/update-discount.dto.js';

@Controller('billing/discounts')
@UseGuards(JwtAuthGuard)
export class BillingDiscountController {
  constructor(private readonly service: BillingDiscountService) {}

  @Get()
  list(): Promise<BillingDiscountResponse[]> {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<BillingDiscountResponse> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreateDiscountDto): Promise<BillingDiscountResponse> {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateDiscountDto,
  ): Promise<BillingDiscountResponse> {
    return this.service.update(id, body);
  }

  @Get(':id/packages')
  getPackages(@Param('id') id: string): Promise<BillingDiscountPackageResponse[]> {
    return this.service.getPackages(id);
  }

  @Post(':id/packages/:packageId')
  setPackage(
    @Param('id') id: string,
    @Param('packageId') packageId: string,
    @Body() body: SetDiscountPackageDto,
  ): Promise<BillingDiscountPackageResponse | BillingDiscountMessageResponse> {
    return this.service.setPackage(id, packageId, body);
  }

  @Delete(':id/packages/:packageId')
  async removePackage(
    @Param('id') id: string,
    @Param('packageId') packageId: string,
  ): Promise<BillingDiscountMessageResponse> {
    const result = await this.service.setPackage(id, packageId, { enabled: false });
    if ('message' in result) return result;
    return { message: 'Discount berhasil dilepas dari package' };
  }
}
