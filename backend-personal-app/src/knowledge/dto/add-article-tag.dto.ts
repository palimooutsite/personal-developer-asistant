import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddArticleTagDto {
  @IsUUID()
  @IsNotEmpty()
  tagId!: string;
}
