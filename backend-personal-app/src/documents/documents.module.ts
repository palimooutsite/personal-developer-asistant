import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService],
})
export class DocumentsModule {}
