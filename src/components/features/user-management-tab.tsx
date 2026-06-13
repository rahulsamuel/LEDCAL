
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase } from '@/firebase';
import { getAllUsersWithRoles, updateUserRole, UserWithRole, deleteUserFromFirestore } from '@/services/user-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert, Users, MoreHorizontal, Trash2, FolderKanban, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserProjectsModal } from './user-projects-modal';

export default function UserManagementTab() {
  const { user, isAdmin, isUserLoading } = useAuth();
  const { firestore } = useFirebase();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [selectedUserForProjects, setSelectedUserForProjects] = useState<UserWithRole | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
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
  }, [isAdmin, firestore, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
        setIsLoading(false);
    }
  }, [isAdmin, fetchUsers]);

  // Listen for 'user-created' event from the sidebar form
  useEffect(() => {
    const handleUserCreated = () => fetchUsers();
    window.addEventListener('user-created', handleUserCreated);
    return () => window.removeEventListener('user-created', handleUserCreated);
  }, [fetchUsers]);

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

  const openDeleteDialog = (user: UserWithRole) => {
    setUserToDelete(user);
    setIsDeleteAlertOpen(true);
  };
  
  const openProjectsModal = (user: UserWithRole) => {
    setSelectedUserForProjects(user);
    setIsProjectsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserFromFirestore(firestore, userToDelete.id);
      toast({ title: 'User Data Deleted', description: `Firestore data for ${userToDelete.email} has been removed.` });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete user data.' });
    } finally {
      setIsDeleteAlertOpen(false);
      setUserToDelete(null);
    }
  };

  if (isUserLoading || (isAdmin && isLoading)) {
    return (
       <div className="flex items-center justify-center p-8 h-full bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
       </div>
    )
  }

  if (!isAdmin) {
      return (
            <div className="flex items-center justify-center p-8 h-full bg-background">
                <Card className="max-w-2xl mx-auto border-border bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldAlert /> Access Denied</CardTitle>
                        <CardDescription>You do not have permission to view this page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">This page is restricted to administrators.</p>
                    </CardContent>
                </Card>
            </div>
    )
  }

  return (
    <div className="w-full h-full p-6 space-y-6 overflow-auto font-mono bg-background">
        <Card className="border-border bg-card shadow-none overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight uppercase"><Users className="w-6 h-6 text-primary" /> User Management</CardTitle>
                    <CardDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">View and manage system permissions.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh User List" className="h-10 w-10">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50 border-b border-border">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest py-4">Email</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">User ID</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-[150px]">Role</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-[80px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border">
                            {users.map(u => (
                                <TableRow key={u.id} className="border-none hover:bg-muted/30 transition-colors group">
                                    <TableCell className="font-bold py-4">{u.email}</TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">{u.id}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={u.role}
                                            onValueChange={(newRole: 'admin' | 'user') => handleRoleChange(u.id, newRole)}
                                            disabled={u.id === user?.uid}
                                        >
                                            <SelectTrigger className="h-8 text-[10px] font-bold uppercase bg-background border-border">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={u.id === user?.uid} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">User Actions</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="font-mono uppercase text-[10px]">
                                                <DropdownMenuItem onSelect={() => openProjectsModal(u)}>
                                                    <FolderKanban className="mr-2 h-3.5 w-3.5" /> View Projects
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => openDeleteDialog(u)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        
        <UserProjectsModal open={isProjectsModalOpen} onOpenChange={setIsProjectsModalOpen} user={selectedUserForProjects} />
        
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent className="font-mono">
                <AlertDialogHeader>
                    <AlertDialogTitle className="uppercase tracking-tight">Confirm Data Removal</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-xs">
                        This action will permanently delete the user's application data (profile and role) from the database. It cannot be undone.
                        <br /><br />
                        Note: This does not remove the user from Firebase Authentication.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setUserToDelete(null)} className="text-[10px] font-bold uppercase">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-[10px] font-bold uppercase">Delete User Data</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
