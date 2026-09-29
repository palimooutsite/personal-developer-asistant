import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SnippetsController } from './snippets.controller.js';
import { SnippetTagsController } from './snippet-tags.controller.js';
import { SnippetsService } from './snippets.service.js';
import { SnippetTagsService } from './snippet-tags.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantModule } from '../tenants/tenant.module.js';
import { TenantRoleModule } from '../tenants/roles/tenant-role.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TenantModule,
    TenantRoleModule,
  ],
  controllers: [SnippetsController, SnippetTagsController],
  providers: [SnippetsService, SnippetTagsService, PrismaService],
})
export class SnippetsModule {}
