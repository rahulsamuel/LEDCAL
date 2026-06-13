
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Settings, Upload, Download, Save, Cloud, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useProjectContext } from '@/contexts/project-context';
import { useRef, useState } from 'react';
import { DownloadProject } from './download-project';
import { useAuth } from '@/contexts/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { Project } from '@/services/project-service';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function GettingStarted() {
    const { state, exportConfig, importConfig, saveProject, loadProject, deleteProject, createNewProject } = useProjectContext();
    const { user } = useAuth();
    const { projects, isProjectsLoading, activeProjectId } = state;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState<Project | null>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            importConfig(file);
        }
    };

    const openDeleteDialog = (project: Project) => {
        setDeleteCandidate(project);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (deleteCandidate) {
            deleteProject(deleteCandidate.id);
            setIsDeleteDialogOpen(false);
            setDeleteCandidate(null);
        }
    };

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to LEDTools Suite!</CardTitle>
          <CardDescription>
            Your all-in-one toolkit for planning and managing LED screen setups. Here's how to get started:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-primary/10 text-primary p-3 rounded-full">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="font-semibold">1. Configure Your Project</h3>
              <p className="text-sm text-muted-foreground">
                Use the sidebar on the left to input your screen layout and the specifications for an individual LED panel.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
               <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Upload className="w-8 h-8" />
              </div>
              <h3 className="font-semibold">2. Or, Import a Setup</h3>
              <p className="text-sm text-muted-foreground">
                If you have a previous configuration file, use the import button below to load it instantly.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
               <div className="bg-primary/10 text-primary p-3 rounded-full">
                 <Lightbulb className="w-8 h-8" />
              </div>
              <h3 className="font-semibold">3. Explore the Tools</h3>
              <p className="text-sm text-muted-foreground">
                Navigate through the tabs above to see calculated values, generate maps, and get AI-powered help.
              </p>
            </div>
          </div>
          
          <div className="text-center pt-4">
              <p className="text-muted-foreground">Ready to begin? Start by setting up your project in the sidebar!</p>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Manage Project Configuration</CardTitle>
              <CardDescription>
                  Save your current setup to your device, or save it to the cloud to access later.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
             {user && (
                <Button onClick={saveProject}>
                    <Save className="mr-2 h-4 w-4" /> {activeProjectId ? 'Update Cloud Project' : 'Save to Cloud'}
                </Button>
            )}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
            />
            <Button variant="outline" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" /> Import from File
            </Button>
            <Button variant="outline" onClick={exportConfig}>
                <Download className="mr-2 h-4 w-4" /> Export to File
            </Button>
          </CardContent>
      </Card>
      
      {user && (
          <Card>
              <CardHeader>
                  <CardTitle>Cloud Projects</CardTitle>
                  <CardDescription>Load or manage your projects saved in the cloud.</CardDescription>
              </CardHeader>
              <CardContent>
                  {isProjectsLoading ? (
                      <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                  ) : projects.length > 0 ? (
                      <div className="space-y-4">
                          <Button onClick={createNewProject} variant="outline" className="w-full">
                              <PlusCircle className="mr-2 h-4 w-4" /> Start New Project
                          </Button>
                          <div className="space-y-2">
                              {projects.map(project => (
                                  <div key={project.id} className="flex items-center justify-between rounded-lg border p-3 gap-2">
                                      <div>
                                          <p className="font-semibold">{project.name}</p>
                                          {project.lastModified && (
                                              <p className="text-sm text-muted-foreground">
                                                  Last updated {formatDistanceToNow(new Date(project.lastModified.seconds * 1000), { addSuffix: true })}
                                              </p>
                                          )}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                          <Button onClick={() => loadProject(project)} size="sm" disabled={project.id === activeProjectId}>Load</Button>
                                          <Button onClick={() => openDeleteDialog(project)} size="icon" variant="destructive" className="h-9 w-9">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                          <Cloud className="mx-auto h-12 w-12" />
                          <h3 className="mt-4 text-lg font-semibold">No saved projects</h3>
                          <p className="mt-1 text-sm">Use the "Save to Cloud" button to save your current project.</p>
                      </div>
                  )}
              </CardContent>
          </Card>
      )}


      <DownloadProject />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project "{deleteCandidate?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteCandidate(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
