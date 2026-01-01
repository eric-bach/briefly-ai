'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { Youtube, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Navbar() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = () => {
    if (signOut) {
      signOut();
    }
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className='w-full bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center fixed top-0 left-0 z-10'>
      <div className='flex items-center gap-8'>
        <Link
          href='/'
          className='flex items-center gap-2 font-bold text-xl text-gray-900 group'
        >
          <div className='p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors'>
            <Youtube className='w-5 h-5 text-red-600' />
          </div>
          Briefly AI
        </Link>
        <div className='flex items-center gap-6'>
          <Link
            href='/dashboard'
            className={`text-sm font-medium transition-colors ${
              isActive('/dashboard')
                ? 'text-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Summarize
          </Link>
          <Link
            href='/prompts'
            className={`text-sm font-medium transition-colors ${
              isActive('/prompts')
                ? 'text-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Prompts
          </Link>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <DropdownMenu>
          <DropdownMenuTrigger className='flex items-center gap-2 cursor-pointer outline-none group'>
            <div className='p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors'>
              <User className='w-4 h-4 text-gray-600' />
            </div>
            <span className='text-sm text-gray-600 hidden sm:block group-hover:text-gray-900 transition-colors'>
              {user?.signInDetails?.loginId}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href='/profile'>
              <DropdownMenuItem className='cursor-pointer'>
                <User className='mr-2 h-4 w-4' />
                <span>Account Settings</span>
              </DropdownMenuItem>
            </Link>
            <Link href='/prompts'>
              <DropdownMenuItem className='cursor-pointer'>
                <User className='mr-2 h-4 w-4' />
                <span>Manage Prompts</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className='text-red-600 focus:text-red-600 cursor-pointer'
            >
              <LogOut className='mr-2 h-4 w-4' />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
