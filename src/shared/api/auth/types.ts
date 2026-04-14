import type { AuthSessionUser } from "../../libs/auth-session";

export type AuthUser = AuthSessionUser;

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
