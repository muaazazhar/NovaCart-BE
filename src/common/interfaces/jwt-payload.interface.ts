export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    name: string;
    displayName: string;
  };
  permissions: string[];
}
