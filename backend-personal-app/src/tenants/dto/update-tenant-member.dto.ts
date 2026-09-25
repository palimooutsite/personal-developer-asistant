import { IsEnum } from 'class-validator';

export class UpdateTenantMemberDto {
  @IsEnum(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}