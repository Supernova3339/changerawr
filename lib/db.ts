import {PrismaClient} from "@prisma/client";

// Create a singleton function for Prisma Client
const prismaClientSingleton = () => {
    return new PrismaClient();
};

// Declare global type to avoid TypeScript errors
declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// Use globalThis instead of global for better compatibility
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export {prisma as db};

// Only cache in development to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prisma;
}