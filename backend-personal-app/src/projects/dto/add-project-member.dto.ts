export class AddProjectMemberDto {
  userId!: string;
  role!: 'ADMIN' | 'DEVELOPER' | 'REVIEWER' | 'VIEWER';
}