import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantModule } from '../tenants/tenant.module.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    TenantModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    PrismaService,
  ],
})
export class ProjectsModule {}
