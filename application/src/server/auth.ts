import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { env } from "@/env";
import type { VehicleClass } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * User roles.
 */
export type UserRole = "USER" | "DRIVER" | "ADMIN";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      vehicleClass: VehicleClass | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    vehicleClass: VehicleClass | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    vehicleClass: VehicleClass | null;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => {
      // With JWT strategy, user data comes from token
      if (token && "id" in token) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.id,
            role: token.role ?? "USER",
            vehicleClass: token.vehicleClass ?? null,
          },
        };
      }
      return session;
    },
    jwt: async ({ token, user, account }) => {
      // Initial sign in - add user info to token
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.vehicleClass = user.vehicleClass ?? null;
      }
      // For OAuth providers, fetch user from DB to get role and vehicleClass
      if (account && account.provider !== "credentials" && user?.id) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, vehicleClass: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role ?? "USER";
          token.vehicleClass = dbUser.vehicleClass ?? null;
        }
      }
      return token;
    },
  },
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        // Type assertion needed until Prisma types are fully updated
        const userWithPassword = user as typeof user & { password: string | null };

        if (!userWithPassword?.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          userWithPassword.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: userWithPassword.id,
          email: userWithPassword.email ?? undefined,
          name: userWithPassword.name ?? undefined,
          role: userWithPassword.role ?? "USER",
          vehicleClass: userWithPassword.vehicleClass,
        };
      },
    }),
    GithubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Google provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
