import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'])
  role!: 'ADMIN' | 'DEVELOPER' | 'REVIEWER' | 'VIEWER';
}
