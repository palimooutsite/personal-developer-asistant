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
import { PlatformAdminGuard } from '../auth/guard/platform-admin.guard.js';
import {
  BillingCatalogService,
  type BillingPackageResponse,
  type BillingFeatureResponse,
  type BillingPriceResponse,
  type BillingPackageFeatureResponse,
  type BillingMessageResponse,
} from './catalog.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { CreateFeatureDto } from './dto/create-feature.dto.js';
import { UpdateFeatureDto } from './dto/update-feature.dto.js';
import { CreatePriceDto } from './dto/create-price.dto.js';
import { UpdatePriceDto } from './dto/update-price.dto.js';
import { SetPackageFeatureDto } from './dto/set-package-feature.dto.js';

@Controller('billing/catalog')
@UseGuards(JwtAuthGuard)
export class BillingCatalogController {
  constructor(private readonly service: BillingCatalogService) {}

  @Post('seed-defaults')
  @UseGuards(PlatformAdminGuard)
  seedDefaults(): Promise<{ packages: number; features: number; prices: number; packageFeatures: number }> {
    return this.service.seedDefaults();
  }

  @Get('packages')
  listPackages(): Promise<BillingPackageResponse[]> {
    return this.service.listPackages();
  }

  @Get('packages/:id')
  getPackage(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.service.getPackage(id);
  }

  @Get('packages/:id/features')
  getPackageFeatures(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.service.getPackageFeatures(id);
  }

  @Post('packages')
  @UseGuards(PlatformAdminGuard)
  createPackage(@Body() body: CreatePackageDto): Promise<BillingPackageResponse> {
    return this.service.createPackage(body);
  }

  @Patch('packages/:id')
  @UseGuards(PlatformAdminGuard)
  updatePackage(@Param('id') id: string, @Body() body: UpdatePackageDto): Promise<BillingPackageResponse> {
    return this.service.updatePackage(id, body);
  }

  @Get('features')
  listFeatures(): Promise<BillingFeatureResponse[]> {
    return this.service.listFeatures();
  }

  @Post('features')
  @UseGuards(PlatformAdminGuard)
  createFeature(@Body() body: CreateFeatureDto): Promise<BillingFeatureResponse> {
    return this.service.createFeature(body);
  }

  @Patch('features/:id')
  @UseGuards(PlatformAdminGuard)
  updateFeature(@Param('id') id: string, @Body() body: UpdateFeatureDto): Promise<BillingFeatureResponse> {
    return this.service.updateFeature(id, body);
  }

  @Get('packages/:packageId/prices')
  listPrices(
    @Param('packageId') packageId: string,
  ): Promise<BillingPriceResponse[]> {
    return this.service.listPrices(packageId);
  }

  @Post('packages/:packageId/prices')
  @UseGuards(PlatformAdminGuard)
  addPrice(
    @Param('packageId') packageId: string,
    @Body() body: CreatePriceDto,
  ): Promise<BillingPriceResponse> {
    return this.service.addPrice(packageId, body);
  }

  @Patch('prices/:id')
  @UseGuards(PlatformAdminGuard)
  updatePrice(@Param('id') id: string, @Body() body: UpdatePriceDto): Promise<BillingPriceResponse> {
    return this.service.updatePrice(id, body);
  }

  @Post('packages/:packageId/features/:featureId')
  @UseGuards(PlatformAdminGuard)
  setPackageFeature(
    @Param('packageId') packageId: string,
    @Param('featureId') featureId: string,
    @Body() body: SetPackageFeatureDto,
  ): Promise<BillingPackageFeatureResponse> {
    return this.service.setPackageFeature(packageId, featureId, body);
  }

  @Delete('packages/:packageId/features/:featureId')
  @UseGuards(PlatformAdminGuard)
  removePackageFeature(
    @Param('packageId') packageId: string,
    @Param('featureId') featureId: string,
  ): Promise<BillingMessageResponse> {
    return this.service.removePackageFeature(packageId, featureId);
  }
}
