import { apiRequest } from "./api";
export interface LoginResponse { accessToken:string; }
export interface CurrentUser { id:string; username:string; email:string; name:string|null; avatarUrl:string|null; isPlatformAdmin:boolean; }
export async function login(email:string,password:string):Promise<LoginResponse>{const response=await apiRequest<LoginResponse>("/auth/login",{method:"POST",body:JSON.stringify({email,password})});window.localStorage.setItem("pda_access_token",response.accessToken);return response;}
export async function getCurrentUser():Promise<CurrentUser>{return apiRequest<CurrentUser>("/auth/me");}
export function logout(){window.localStorage.removeItem("pda_access_token");}