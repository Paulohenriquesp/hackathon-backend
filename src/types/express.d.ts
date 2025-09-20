declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string;
      school: string | null;
      materialsCount: number;
    };
  }
}