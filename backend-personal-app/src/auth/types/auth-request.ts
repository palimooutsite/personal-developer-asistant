export interface AuthRequest {
  user: {
    userId: string;
    username: string;
    isPlatformAdmin: boolean;
  };
}