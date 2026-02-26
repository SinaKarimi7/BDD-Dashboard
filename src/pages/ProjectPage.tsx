import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Upload,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit3,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
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
  Badge,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FileDropZone } from "@/components/features/FileDropZone";
import { exportSingleFeature, exportAllFeatures } from "@/lib/export";
import { PageTransition } from "@/components/animation";
import { staggerContainer, staggerItem, easing, duration } from "@/lib/motion";

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.getProject(projectId!));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId!)),
  );
  const addFeature = useAppStore((s) => s.addFeature);
  const deleteFeature = useAppStore((s) => s.deleteFeature);
  const updateFeature = useAppStore((s) => s.updateFeature);
  const importFeatures = useAppStore((s) => s.importFeatures);

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [search, setSearch] = useState("");

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          title="Project not found"
          description="This project doesn't exist."
        />
      </div>
    );
  }

  const filteredFeatures = features.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = () => {
    if (!name.trim()) return;
    const feature = addFeature(projectId!, {
      name: name.trim(),
      description: description.trim(),
      folderPath: folderPath.trim() || "features",
    });
    resetForm();
    setShowCreate(false);
    navigate(`/projects/${projectId}/features/${feature.id}`);
  };

  const handleUpdate = () => {
    if (!editingFeature || !name.trim()) return;
    updateFeature(editingFeature, {
      name: name.trim(),
      description: description.trim(),
      folderPath: folderPath.trim() || "features",
    });
    resetForm();
    setEditingFeature(null);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setFolderPath("");
  };

  const startEdit = (feature: (typeof features)[0]) => {
    setName(feature.name);
    setDescription(feature.description);
    setFolderPath(feature.folderPath);
    setEditingFeature(feature.id);
  };

  const handleImport = useCallback(
    (imported: typeof features) => {
      importFeatures(projectId!, imported);
      setShowImport(false);
    },
    [projectId, importFeatures],
  );

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" />
              Import
            </Button>
            {features.length > 0 && (
              <Button
                variant="outline"
                onClick={() => exportAllFeatures(features, project.name)}
              >
                <Download className="w-4 h-4" />
                Export All
              </Button>
            )}
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              New Feature
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Features", value: features.length },
            {
              label: "Scenarios",
              value: features.reduce((acc, f) => acc + f.scenarios.length, 0),
            },
            {
              label: "Steps",
              value: features.reduce(
                (acc, f) =>
                  acc + f.scenarios.reduce((a, s) => a + s.steps.length, 0),
                0,
              ),
            },
            {
              label: "Tags Used",
              value: new Set(
                features.flatMap((f) => [
                  ...f.tags.map((t) => t.id),
                  ...f.scenarios.flatMap((s) => s.tags.map((t) => t.id)),
                ]),
              ).size,
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {features.length > 0 && (
          <div className="mb-6">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search features..."
              className="max-w-sm"
            />
          </div>
        )}

        {filteredFeatures.length === 0 && features.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="No features yet"
            description="Create a new feature file or import existing .feature files to get started."
            action={
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowImport(true)}>
                  <Upload className="w-4 h-4" />
                  Import Files
                </Button>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" />
                  New Feature
                </Button>
              </div>
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainer(50, 50)}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {filteredFeatures.map((feature) => (
                <motion.div
                  key={feature.id}
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
                    onClick={() =>
                      navigate(`/projects/${projectId}/features/${feature.id}`)
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="truncate text-base">
                          {feature.name}
                        </CardTitle>
                        <DropdownMenu
                          trigger={
                            <button
                              className="rounded-lg p-1.5 hover:bg-accent transition-colors cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                        >
                          <DropdownItem onClick={() => startEdit(feature)}>
                            <Edit3 className="w-4 h-4" /> Edit
                          </DropdownItem>
                          <DropdownItem
                            onClick={() => exportSingleFeature(feature)}
                          >
                            <Download className="w-4 h-4" /> Export
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            destructive
                            onClick={() => deleteFeature(feature.id)}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </div>
                      {feature.description && (
                        <CardDescription className="line-clamp-2">
                          {feature.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {feature.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {feature.tags.map((tag) => (
                            <Badge key={tag.id} color={tag.color}>
                              @{tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{feature.scenarios.length} scenarios</span>
                        <span className="text-xs">{feature.folderPath}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Feature Modal */}
        <Modal
          open={showCreate}
          onClose={() => {
            setShowCreate(false);
            resetForm();
          }}
          title="Create Feature"
        >
          <div className="space-y-4">
            <Input
              label="Feature Name"
              placeholder="e.g. User Authentication"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Textarea
              label="Description"
              placeholder="As a [role], I want [feature] so that [benefit]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Input
              label="Folder Path"
              placeholder="e.g. features/auth"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>
                Create Feature
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Feature Modal */}
        <Modal
          open={!!editingFeature}
          onClose={() => {
            setEditingFeature(null);
            resetForm();
          }}
          title="Edit Feature"
        >
          <div className="space-y-4">
            <Input
              label="Feature Name"
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
            <Input
              label="Folder Path"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingFeature(null);
                  resetForm();
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

        {/* Import Modal */}
        <Modal
          open={showImport}
          onClose={() => setShowImport(false)}
          title="Import Feature Files"
          size="lg"
        >
          <FileDropZone projectId={projectId!} onImport={handleImport} />
        </Modal>
      </div>
    </PageTransition>
  );
}
