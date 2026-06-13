'use client';

import { ChangePasswordForm } from '@/components/features/auth/change-password-form';
import Header from '@/components/layout/header';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function SettingsPage() {
  const { user, isUserLoading } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen bg-background">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
              <p className="text-muted-foreground">Manage your account settings.</p>
            </div>
            {isUserLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : user ? (
              <ChangePasswordForm />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Authentication Required</CardTitle>
                  <CardDescription>
                    You need to be logged in to view this page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center p-8">
                  <Lock className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Please log in to access your settings.
                  </p>
                </CardContent>
              </Card>
            )}
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
