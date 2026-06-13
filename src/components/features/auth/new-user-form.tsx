
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, UserPlus } from 'lucide-react';

const newUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type NewUserValues = z.infer<typeof newUserSchema>;

export function NewUserForm() {
  const { createUser } = useAuth();
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<NewUserValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: NewUserValues) => {
    setAuthError(null);
    try {
      await createUser(data.email, data.password);
      toast({ title: 'User Created', description: `${data.email} has been successfully created.` });
      
      // Dispatch custom event to trigger user list refresh
      const event = new CustomEvent('user-created');
      window.dispatchEvent(event);
      
      form.reset();
    } catch (error: any) {
      let friendlyMessage = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          friendlyMessage = 'This email address is already in use by another account.';
          break;
        case 'auth/weak-password':
          friendlyMessage = 'The password is too weak. Please choose a stronger password.';
          break;
        case 'auth/invalid-email':
            friendlyMessage = 'The email address is not valid.';
            break;
      }
      setAuthError(friendlyMessage);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">Create New User</h3>
        </div>
        
        {authError && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Creation Failed</AlertTitle>
                <AlertDescription className="text-xs">{authError}</AlertDescription>
            </Alert>
        )}
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Email Address</FormLabel>
                            <FormControl>
                                <Input placeholder="user@example.com" {...field} />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Initial Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Confirm Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest h-11">
                    {form.formState.isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating User...
                        </>
                    ) : 'Create User'}
                </Button>
            </form>
        </Form>
    </div>
  );
}
