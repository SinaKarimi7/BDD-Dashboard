import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  FolderOpen,
  MoreHorizontal,
  Trash2,
  Edit3,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  EmptyState,
  Modal,
  Input,
  Textarea,
  SearchInput,
  DropdownMenu,
  DropdownItem,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { formatDate } from "@/lib/utils";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "@/components/animation";
import { staggerContainer, staggerItem, easing, duration } from "@/lib/motion";

export function DashboardPage() {
  const navigate = useNavigate();
  const projects = useAppStore((s) => s.projects);
  const features = useAppStore((s) => s.features);
  const addProject = useAppStore((s) => s.addProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const updateProject = useAppStore((s) => s.updateProject);

  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [deletingProject, setDeletingProject] = useState<
    (typeof projects)[0] | null
  >(null);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = () => {
    if (!name.trim()) return;
    const project = addProject({
      name: name.trim(),
      description: description.trim(),
    });
    setName("");
    setDescription("");
    setShowCreate(false);
    navigate(`/projects/${project.id}`);
  };

  const handleUpdate = () => {
    if (!editingProject || !name.trim()) return;
    updateProject(editingProject, {
      name: name.trim(),
      description: description.trim(),
    });
    setName("");
    setDescription("");
    setEditingProject(null);
  };

  const startEdit = (project: (typeof projects)[0]) => {
    setName(project.name);
    setDescription(project.description);
    setEditingProject(project.id);
  };

  const getFeatureCount = (projectId: string) =>
    features.filter((f) => f.projectId === projectId).length;

  const getScenarioCount = (projectId: string) =>
    features
      .filter((f) => f.projectId === projectId)
      .reduce((acc, f) => acc + f.scenarios.length, 0);

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
            <p className="text-muted-foreground mt-1">
              Your command center for every feature file, scenario, and tag.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {projects.length > 0 && (
          <div className="mb-6">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search projects..."
              className="max-w-sm"
            />
          </div>
        )}

        {filteredProjects.length === 0 && projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-12 h-12" />}
            title="It's quiet in here — let's fix that"
            description="Spin up your first project and start writing features your whole team will actually understand."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            }
          />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No matches found"
            description="Try different keywords or clear your search to see all projects."
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainer(60, 50)}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  variants={staggerItem}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: {
                      duration: duration.normal,
                      ease: easing.apple,
                    },
                  }}
                  layout
                >
                  <Card
                    hover
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="truncate">
                          {/* Real link so keyboard users can open the project */}
                          <Link
                            to={`/projects/${project.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="focus-visible:outline-none"
                          >
                            {project.name}
                          </Link>
                        </CardTitle>
                        <DropdownMenu
                          trigger={
                            <button
                              type="button"
                              aria-label={`Actions for ${project.name}`}
                              className="rounded-lg p-1.5 hover:bg-accent transition-colors cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                        >
                          <DropdownItem
                            onClick={() => {
                              startEdit(project);
                            }}
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </DropdownItem>
                          <DropdownItem
                            destructive
                            onClick={() => setDeletingProject(project)}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{getFeatureCount(project.id)} features</span>
                        <span>{getScenarioCount(project.id)} scenarios</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {formatDate(project.updatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Project Modal */}
        <Modal
          open={showCreate}
          onClose={() => {
            setShowCreate(false);
            setName("");
            setDescription("");
          }}
          title="Create Project"
        >
          <div className="space-y-4">
            <Input
              label="Project Name"
              placeholder="e.g. E-Commerce Platform"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Textarea
              label="Description"
              placeholder="Brief description of the project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setName("");
                  setDescription("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>
                Create Project
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Project Modal */}
        <Modal
          open={!!editingProject}
          onClose={() => {
            setEditingProject(null);
            setName("");
            setDescription("");
          }}
          title="Edit Project"
        >
          <div className="space-y-4">
            <Input
              label="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProject(null);
                  setName("");
                  setDescription("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!name.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={!!deletingProject}
          onClose={() => setDeletingProject(null)}
          title="Delete Project"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                This will permanently delete{" "}
                <strong>{deletingProject?.name}</strong> and all its data.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeletingProject(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deletingProject) deleteProject(deletingProject.id);
                  setDeletingProject(null);
                }}
              >
                Delete Project
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
