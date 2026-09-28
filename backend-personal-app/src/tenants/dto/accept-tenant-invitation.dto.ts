import { IsString, MinLength } from 'class-validator';

export class AcceptTenantInvitationDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
