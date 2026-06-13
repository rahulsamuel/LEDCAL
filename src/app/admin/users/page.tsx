'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase } from '@/firebase';
import { getAllUsersWithRoles, updateUserRole, UserWithRole } from '@/services/user-service';
import Header from '@/components/layout/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminUsersPage() {
  const { user, isAdmin, isUserLoading } = useAuth();
  const { firestore } = useFirebase();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        setIsLoading(true);
        try {
          const usersWithRoles = await getAllUsersWithRoles(firestore);
          setUsers(usersWithRoles);
        } catch (error) {
          console.error("Error fetching users:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch user data.' });
        } finally {
          setIsLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isAdmin, firestore, toast]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await updateUserRole(firestore, userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: 'Success', description: `User role updated to ${newRole}.` });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update user role.' });
    }
  };
  
  if (isUserLoading || (isAdmin && isLoading)) {
    return (
       <SidebarProvider>
        <div className="flex flex-col h-screen bg-background">
            <Header />
            <main className="flex-1 overflow-auto p-4 md:p-6 flex items-center justify-center">
                 <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
            </main>
        </div>
       </SidebarProvider>
    )
  }

  if (!isAdmin) {
      return (
       <SidebarProvider>
        <div className="flex flex-col h-screen bg-background">
            <Header />
            <main className="flex-1 overflow-auto p-4 md:p-6">
                 <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldAlert /> Access Denied</CardTitle>
                        <CardDescription>You do not have permission to view this page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>This page is restricted to administrators.</p>
                         <Button asChild variant="outline" className="mt-4">
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
       </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen bg-background">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto w-full space-y-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">View and manage user roles.</p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead className="w-[150px]">Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(u => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.email}</TableCell>
                                        <TableCell className="text-muted-foreground">{u.id}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={u.role}
                                                onValueChange={(newRole: 'admin' | 'user') => handleRoleChange(u.id, newRole)}
                                                disabled={u.id === user?.uid}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
