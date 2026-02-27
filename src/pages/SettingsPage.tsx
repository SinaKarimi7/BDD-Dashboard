import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle, Check, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
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
  const features = useAppStore(
    useShallow((s) =>
      s.features
        .filter((f) => f.projectId === projectId)
        .sort((a, b) => a.position - b.position),
    ),
  );

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [showDelete, setShowDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  // Project stats (memoized — must be before early return)
  const totalScenarios = useMemo(
    () => features.reduce((acc, f) => acc + f.scenarios.length, 0),
    [features],
  );
  const totalSteps = useMemo(
    () =>
      features.reduce(
        (acc, f) => acc + f.scenarios.reduce((a2, s) => a2 + s.steps.length, 0),
        0,
      ),
    [features],
  );

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
          Settings
        </h1>

        <div className="space-y-8">
          {/* ── Project Settings ──────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Project Settings
            </h2>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-medium">General</h3>
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

              {/* Project overview / stats */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-3">Project Overview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">
                        {features.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Features
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{totalScenarios}</div>
                      <div className="text-xs text-muted-foreground">
                        Scenarios
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{totalSteps}</div>
                      <div className="text-xs text-muted-foreground">Steps</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">
                        {new Date(project.createdAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Danger zone */}
              <Card className="border-destructive/30">
                <CardContent className="p-6">
                  <h3 className="font-medium text-destructive mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This permanently wipes the project, every feature, every
                    scenario, and every tag. There's no going back.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDelete(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
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
