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
import { BillingCatalogService } from './catalog.service.js';
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

  @Get('packages')
  listPackages() {
    return this.service.listPackages();
  }

  @Get('packages/:id')
  getPackage(@Param('id') id: string) {
    return this.service.getPackage(id);
  }

  @Post('packages')
  createPackage(@Body() body: CreatePackageDto) {
    return this.service.createPackage(body);
  }

  @Patch('packages/:id')
  updatePackage(@Param('id') id: string, @Body() body: UpdatePackageDto) {
    return this.service.updatePackage(id, body);
  }

  @Get('features')
  listFeatures() {
    return this.service.listFeatures();
  }

  @Post('features')
  createFeature(@Body() body: CreateFeatureDto) {
    return this.service.createFeature(body);
  }

  @Patch('features/:id')
  updateFeature(@Param('id') id: string, @Body() body: UpdateFeatureDto) {
    return this.service.updateFeature(id, body);
  }

  @Post('packages/:packageId/prices')
  addPrice(
    @Param('packageId') packageId: string,
    @Body() body: CreatePriceDto,
  ) {
    return this.service.addPrice(packageId, body);
  }

  @Patch('prices/:id')
  updatePrice(@Param('id') id: string, @Body() body: UpdatePriceDto) {
    return this.service.updatePrice(id, body);
  }

  @Post('packages/:packageId/features/:featureId')
  setPackageFeature(
    @Param('packageId') packageId: string,
    @Param('featureId') featureId: string,
    @Body() body: SetPackageFeatureDto,
  ) {
    return this.service.setPackageFeature(packageId, featureId, body);
  }

  @Delete('packages/:packageId/features/:featureId')
  removePackageFeature(
    @Param('packageId') packageId: string,
    @Param('featureId') featureId: string,
  ) {
    return this.service.removePackageFeature(packageId, featureId);
  }
}
