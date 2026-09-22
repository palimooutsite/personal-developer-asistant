export class UpdateProjectDto {
  name?: string;
  description?: string;
  status?: 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
}