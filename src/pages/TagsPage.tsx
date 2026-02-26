import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Edit3,
  Trash2,
  Tag,
  FileText,
  FlaskConical,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import type { Tag as TagType } from "@/types";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Modal,
  Input,
  EmptyState,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageTransition } from "@/components/animation";
import { staggerContainer, staggerItem, easing, duration } from "@/lib/motion";

const TAG_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#e11d48",
  "#0891b2",
  "#7c3aed",
  "#ea580c",
  "#059669",
  "#d946ef",
];

export function TagsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.getProject(projectId!));
  const tags = useAppStore(useShallow((s) => s.getProjectTags(projectId!)));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId!)),
  );
  const addTag = useAppStore((s) => s.addTag);
  const updateTag = useAppStore((s) => s.updateTag);
  const deleteTag = useAppStore((s) => s.deleteTag);

  const [showCreate, setShowCreate] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);

  if (!project) return null;

  const handleCreate = () => {
    if (!name.trim()) return;
    addTag(projectId!, { name: name.trim(), color });
    setName("");
    setColor(TAG_COLORS[0]);
    setShowCreate(false);
  };

  const handleUpdate = () => {
    if (!editingTag || !name.trim()) return;
    updateTag(editingTag, { name: name.trim(), color });
    setName("");
    setEditingTag(null);
  };

  const getUsageCount = (tagId: string) => {
    let count = 0;
    features.forEach((f) => {
      if (f.tags.some((t) => t.id === tagId)) count++;
      f.scenarios.forEach((s) => {
        if (s.tags.some((t) => t.id === tagId)) count++;
      });
    });
    return count;
  };

  const sortedTags = [...tags].sort(
    (a, b) => getUsageCount(b.id) - getUsageCount(a.id),
  );

  const getTagUsages = (tagId: string) => {
    const usages: {
      type: "feature" | "scenario";
      featureId: string;
      featureName: string;
      scenarioName?: string;
    }[] = [];
    features.forEach((f) => {
      if (f.tags.some((t) => t.id === tagId)) {
        usages.push({
          type: "feature",
          featureId: f.id,
          featureName: f.name,
        });
      }
      f.scenarios.forEach((s) => {
        if (s.tags.some((t) => t.id === tagId)) {
          usages.push({
            type: "scenario",
            featureId: f.id,
            featureName: f.name,
            scenarioName: s.name,
          });
        }
      });
    });
    return usages;
  };

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name, path: `/projects/${projectId}` },
            { label: "Tags" },
          ]}
        />

        <div className="flex items-center justify-between mt-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Color-code and categorize your features — find anything instantly.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            New Tag
          </Button>
        </div>

        {tags.length === 0 ? (
          <EmptyState
            icon={<Tag className="w-12 h-12" />}
            title="No tags yet — let's add some color"
            description="Tags make it dead simple to organize, filter, and find features and scenarios across your project."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" />
                Create Tag
              </Button>
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            variants={staggerContainer(40, 50)}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {sortedTags.map((tag, idx) => (
                <motion.div
                  key={tag.id}
                  variants={staggerItem}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: duration.fast, ease: easing.apple },
                  }}
                  layout
                >
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <button
                        className="flex items-center gap-3 text-left cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                        onClick={() => setSelectedTag(tag)}
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <div className="min-w-0">
                          <Badge color={tag.color}>@{tag.name}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Used {getUsageCount(tag.id)} times
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setName(tag.name);
                            setColor(tag.color);
                            setEditingTag(tag.id);
                          }}
                          className="rounded-lg p-1.5 hover:bg-accent transition-colors cursor-pointer text-muted-foreground"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTag(tag.id)}
                          className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors cursor-pointer text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create / Edit Modal */}
        <Modal
          open={showCreate || !!editingTag}
          onClose={() => {
            setShowCreate(false);
            setEditingTag(null);
            setName("");
          }}
          title={editingTag ? "Edit Tag" : "Create Tag"}
          size="sm"
        >
          <div className="space-y-4">
            <Input
              label="Tag Name"
              placeholder="e.g. smoke, regression, auth"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (editingTag ? handleUpdate() : handleCreate())
              }
            />
            <div>
              <p className="text-sm font-medium mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                      color === c
                        ? "scale-125 ring-2 ring-offset-2 ring-primary"
                        : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Preview:</span>
              <Badge color={color}>@{name || "tag-name"}</Badge>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setEditingTag(null);
                  setName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingTag ? handleUpdate : handleCreate}
                disabled={!name.trim()}
              >
                {editingTag ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Tag Usage Detail Modal */}
        <Modal
          open={!!selectedTag}
          onClose={() => setSelectedTag(null)}
          title={`Tag Usage: @${selectedTag?.name || ""}`}
          size="md"
        >
          {selectedTag &&
            (() => {
              const usages = getTagUsages(selectedTag.id);
              return usages.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    This tag isn't used by any features or scenarios yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-3">
                    Used in {usages.length} place
                    {usages.length !== 1 ? "s" : ""}
                  </p>
                  {usages.map((usage, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTag(null);
                        navigate(
                          `/projects/${projectId}/features/${usage.featureId}`,
                        );
                      }}
                    >
                      {usage.type === "feature" ? (
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {usage.type === "feature"
                            ? usage.featureName
                            : usage.scenarioName}
                        </p>
                        {usage.type === "scenario" && (
                          <p className="text-xs text-muted-foreground truncate">
                            in {usage.featureName}
                          </p>
                        )}
                      </div>
                      <Badge
                        color={usage.type === "feature" ? "#3b82f6" : "#8b5cf6"}
                        className="ml-auto text-[10px] shrink-0"
                      >
                        {usage.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              );
            })()}
        </Modal>
      </div>
    </PageTransition>
  );
}
