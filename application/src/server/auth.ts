import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

import { env } from "@/env";
import { VehicleClass } from "@/generated/prisma/enums";
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
    id?: string;
    role?: UserRole;
    vehicleClass?: VehicleClass | null;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.vehicleClass = user.vehicleClass;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as UserRole,
        vehicleClass: token.vehicleClass as VehicleClass | null,
      },
    }),
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GithubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "local-test",
      name: "Local test account",
      credentials: { role: { label: "Role", type: "text" } },
      async authorize(credentials) {
        if (!env.ALLOW_LOCAL_TEST_AUTH || (credentials?.role !== "USER" && credentials?.role !== "DRIVER")) return null;
        const isDriver = credentials.role === "DRIVER";
        const user = await db.user.upsert({
          where: { email: isDriver ? "driver.local@teleport.test" : "customer.local@teleport.test" },
          update: { role: isDriver ? "DRIVER" : "USER", vehicleClass: isDriver ? "BIKE" : null },
          create: {
            email: isDriver ? "driver.local@teleport.test" : "customer.local@teleport.test",
            name: isDriver ? "Aarav Driver" : "Maya Customer",
            role: isDriver ? "DRIVER" : "USER",
            vehicleClass: isDriver ? "BIKE" : null,
          },
        });
        if (!isDriver && await db.address.count({ where: { userId: user.id } }) === 0) {
          await db.address.createMany({ data: [
            { userId: user.id, nickname: "Home", address: "100 Feet Road, Indiranagar, Bengaluru", contactName: "Maya Customer", mobile: "9999999001", latitude: 12.9784, longitude: 77.6408 },
            { userId: user.id, nickname: "Office", address: "Koramangala 5th Block, Bengaluru", contactName: "Maya Customer", mobile: "9999999001", latitude: 12.9352, longitude: 77.6245 },
          ] });
        }
        return {
          ...user,
          role: isDriver ? "DRIVER" : "USER",
          vehicleClass: isDriver ? "BIKE" : null,
        };
      },
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
