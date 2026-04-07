import { Role } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: Role;
    nip?: string | null;
  }
  interface Session {
    user: {
      role?: Role;
      id?: string;
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    id?: string;
  }
}
