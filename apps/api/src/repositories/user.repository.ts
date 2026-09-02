import { prisma } from "../lib/db.js";

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findById(id: string): Promise<UserDTO | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row === null
    ? null
    : {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        createdAt: row.createdAt,
      };
}

export async function create(input: {
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<UserDTO> {
  const row = await prisma.user.create({ data: input });
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
  };
}
