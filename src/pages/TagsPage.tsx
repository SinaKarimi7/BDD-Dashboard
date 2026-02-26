import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Edit3, Trash2, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
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

const TAG_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

export function TagsPage() {
  const { projectId } = useParams<{ projectId: string }>();
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

  return (
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
            Manage tags for organizing features and scenarios
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
          title="No tags yet"
          description="Tags help you organize and filter your features and scenarios."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              Create Tag
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map((tag, idx) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <Badge color={tag.color}>@{tag.name}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {getUsageCount(tag.id)} times
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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
        </div>
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
    </div>
  );
}
