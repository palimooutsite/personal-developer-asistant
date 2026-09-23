import { IsEnum } from 'class-validator';

export class UpdateProjectMemberDto {
  @IsEnum(['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'])
  role!: 'ADMIN' | 'DEVELOPER' | 'REVIEWER' | 'VIEWER';
}
