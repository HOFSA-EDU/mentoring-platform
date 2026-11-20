import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getAuthEnvironment } from "@/lib/env";
import { verifyCredentials } from "@/modules/auth/application/credentials";
import { prismaCredentialRepository } from "@/modules/auth/infrastructure/prisma-credential-repository";
import { userRoleSchema } from "@/modules/identity/domain/role";

const { AUTH_SECRET } = getAuthEnvironment();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        return verifyCredentials(credentials, prismaCredentialRepository);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      const role = userRoleSchema.safeParse(token.role);

      if (
        typeof token.sub === "string" &&
        typeof token.name === "string" &&
        typeof token.email === "string" &&
        role.success
      ) {
        session.user.id = token.sub;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = role.data;
        delete session.user.image;
      }

      return session;
    },
  },
});
