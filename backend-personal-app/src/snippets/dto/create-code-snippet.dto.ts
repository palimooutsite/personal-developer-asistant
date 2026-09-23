import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCodeSnippetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  language!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
