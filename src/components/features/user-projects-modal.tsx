'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useFirebase } from '@/firebase';
import { Project, getProjects } from '@/services/project-service';
import { UserWithRole } from '@/services/user-service';
import { Loader2, FolderKanban } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '@/contexts/project-context';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UserProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
}

export function UserProjectsModal({ open, onOpenChange, user }: UserProjectsModalProps) {
  const { firestore } = useFirebase();
  const { loadProject, state } = useProjectContext();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      const fetchProjects = async () => {
        setIsLoading(true);
        try {
          const userProjects = await getProjects(firestore, user.id);
          setProjects(userProjects);
        } catch (error) {
          console.error("Error fetching user's projects:", error);
          toast({ variant: 'destructive', title: 'Error', description: "Could not fetch user's projects." });
        } finally {
          setIsLoading(false);
        }
      };
      fetchProjects();
    }
  }, [open, user, firestore, toast]);

  const handleLoadProject = (project: Project) => {
    loadProject(project);
    onOpenChange(false); // Close modal after loading
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setProjects([]); // Clear projects on close
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban /> Projects for {user?.email}
          </DialogTitle>
          <DialogDescription>
            View and load projects belonging to this user.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      {project.lastModified ? formatDistanceToNow(new Date(project.lastModified.seconds * 1000), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleLoadProject(project)} disabled={project.id === state.activeProjectId}>
                        Load
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">This user has no saved projects.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
