export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
