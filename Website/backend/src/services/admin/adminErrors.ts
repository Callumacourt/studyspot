import { Prisma } from "@prisma/client";

export class AdminError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function asAdminError(error: unknown): never {
  if (error instanceof AdminError) throw error;

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AdminError("A record with those details already exists", 409);
  }

  throw error;
}
