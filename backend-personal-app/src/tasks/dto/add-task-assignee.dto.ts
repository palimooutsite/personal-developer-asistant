import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddTaskAssigneeDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;
}
