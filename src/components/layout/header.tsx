'use client';

import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { LoginModal } from '@/components/features/auth/login-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChangePasswordModal } from '@/components/features/auth/change-password-modal';
import { SignUpModal } from '@/components/features/auth/sign-up-modal';

export default function Header() {
  const { user, signOut, isUserLoading } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (email) {
        return email[0].toUpperCase();
    }
    return 'U';
  }

  return (
    <>
      <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/ledtools-suite.firebasestorage.app/o/Logo%2Ficon-removebg-preview.png?alt=media&token=63c4b43c-d464-4517-bfb9-01797476714b"
            alt="LEDTools Suite Logo"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <h1 className="text-lg font-semibold">LEDTools Suite</h1>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <ThemeToggle />
          {isUserLoading ? (
             <Button variant="outline" size="icon" disabled>
                <User className="h-4 w-4 animate-pulse" />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'User'} />
                    <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsChangePasswordModalOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsLoginModalOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Login
              </Button>
              <Button onClick={() => setIsSignUpModalOpen(true)}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </header>
      <LoginModal open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
      <SignUpModal open={isSignUpModalOpen} onOpenChange={setIsSignUpModalOpen} />
      {user && (
          <ChangePasswordModal open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen} />
      )}
    </>
  );
}
