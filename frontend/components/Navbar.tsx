"use client";

import { useAuthenticator } from "@aws-amplify/ui-react";
import { Youtube } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Navbar() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut && signOut();
    router.push("/");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center fixed top-0 left-0 z-10">
      <div className="flex items-center gap-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-xl text-gray-900 group"
        >
          <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
            <Youtube className="w-5 h-5 text-red-600" />
          </div>
          Briefly AI
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-colors ${
              isActive("/dashboard")
                ? "text-red-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Summarizer
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 hidden sm:block">
          {user?.signInDetails?.loginId}
        </span>
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
