import {
  IsEnum,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class AddTenantMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}