import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddSnippetTagDto {
  @IsUUID()
  @IsNotEmpty()
  tagId!: string;
}
