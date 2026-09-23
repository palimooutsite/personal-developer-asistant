import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCodeSnippetDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  language?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
