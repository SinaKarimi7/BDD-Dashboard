import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store";
import {
  Button,
  Card,
  CardContent,
  Input,
  Textarea,
  Modal,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageTransition } from "@/components/animation";
import { easing, duration } from "@/lib/motion";

export function SettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.getProject(projectId!));
  const updateProject = useAppStore((s) => s.updateProject);
  const deleteProject = useAppStore((s) => s.deleteProject);

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [showDelete, setShowDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!project) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    updateProject(projectId!, {
      name: name.trim(),
      description: description.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    deleteProject(projectId!);
    navigate("/dashboard");
  };

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name, path: `/projects/${projectId}` },
            { label: "Settings" },
          ]}
        />

        <h1 className="text-2xl font-bold tracking-tight mt-4 mb-8">
          Project Settings
        </h1>
        {/* Body — settings intro handled per card below */}

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg">General</h2>
              <Input
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={!name.trim()}>
                  Save Changes
                </Button>
                {saved && (
                  <motion.span
                    className="text-sm text-primary font-medium inline-flex items-center gap-1"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: duration.normal,
                      ease: easing.spring,
                    }}
                  >
                    <Check className="w-4 h-4" /> Saved!
                  </motion.span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg text-destructive mb-2">
                Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                This permanently wipes the project, every feature, every
                scenario, and every tag. There's no going back.
              </p>
              <Button variant="destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="w-4 h-4" />
                Delete Project
              </Button>
            </CardContent>
          </Card>
        </div>

        <Modal
          open={showDelete}
          onClose={() => setShowDelete(false)}
          title="Delete Project"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                This will permanently delete <strong>{project.name}</strong> and
                all its data.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Project
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
