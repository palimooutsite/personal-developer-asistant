import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class AddProjectMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'])
  role!: 'ADMIN' | 'DEVELOPER' | 'REVIEWER' | 'VIEWER';
}

export class AddProjectMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddProjectMemberDto)
  members!: AddProjectMemberDto[];
}
