export {};

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string | null;
      };
      accessToken?: string;
    }
  }
}
