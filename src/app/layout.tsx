import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { validateRequest } from "~/server/auth/lucia";
import Link from "next/link";
import LogoutButton from "./_components/LogoutButton";

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Manage your tasks efficiently",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await validateRequest();
  
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <header className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              Task Manager
            </Link>
            
            <nav>
              {user ? (
                <div className="flex items-center gap-4">
                  <span>Hello, {user.name ?? user.email}</span>
                  <LogoutButton />
                </div>
              ) : (
                <div className="flex gap-4">
                  <Link href="/login" className="hover:underline">
                    Login
                  </Link>
                  <Link href="/signup" className="hover:underline">
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </header>
        
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
