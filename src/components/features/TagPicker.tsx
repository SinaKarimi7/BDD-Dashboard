import { useState, useMemo } from "react";
import { Plus, Tag, Palette } from "lucide-react";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Badge, Button, Input, Modal } from "@/components/ui";
import { TAG_COLORS, generateColorFromName, hslToHex } from "@/lib/colors";

interface TagPickerProps {
  projectId: string;
  featureId: string;
  targetType: "feature" | "scenario";
  targetId: string;
}

export function TagPicker({
  projectId,
  featureId,
  targetType,
  targetId,
}: TagPickerProps) {
  const tags = useAppStore(useShallow((s) => s.getProjectTags(projectId)));
  const addTag = useAppStore((s) => s.addTag);
  const assignTag = useAppStore((s) => s.assignTag);
  const unassignTag = useAppStore((s) => s.unassignTag);

  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [useAutoColor, setUseAutoColor] = useState(true);

  const autoColor = useMemo(
    () =>
      newTagName ? hslToHex(generateColorFromName(newTagName)) : TAG_COLORS[0],
    [newTagName],
  );

  const effectiveColor = useAutoColor ? autoColor : newTagColor;

  // Get currently assigned tags
  const feature = useAppStore((s) => s.getFeature(featureId));
  const assignedTagIds = new Set<string>();

  if (targetType === "feature" && feature) {
    feature.tags.forEach((t) => assignedTagIds.add(t.id));
  } else if (targetType === "scenario" && feature) {
    const sc = feature.scenarios.find((s) => s.id === targetId);
    sc?.tags.forEach((t) => assignedTagIds.add(t.id));
  }

  const handleToggleTag = (tagId: string) => {
    if (assignedTagIds.has(tagId)) {
      unassignTag(featureId, tagId, targetType, targetId);
    } else {
      assignTag(featureId, tagId, targetType, targetId);
    }
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const tag = addTag(projectId, {
      name: newTagName.trim(),
      color: effectiveColor,
    });
    assignTag(featureId, tag.id, targetType, targetId);
    setNewTagName("");
    setUseAutoColor(true);
    setShowCreate(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
      >
        <Tag className="w-3 h-3" />
        Tag
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Manage Tags"
        size="sm"
      >
        <div className="space-y-3">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tags yet. Create your first tag.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className="cursor-pointer"
                >
                  <Badge
                    color={tag.color}
                    className={`transition-all ${
                      assignedTagIds.has(tag.id)
                        ? "ring-2 ring-offset-1 ring-primary"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    @{tag.name}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {showCreate ? (
            <div className="space-y-3 pt-2 border-t border-border">
              {/* Live preview */}
              {newTagName.trim() && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Preview:
                  </span>
                  <Badge color={effectiveColor}>@{newTagName.trim()}</Badge>
                </div>
              )}
              <Input
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              />
              {/* Color section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    Color
                  </span>
                  <button
                    onClick={() => setUseAutoColor(!useAutoColor)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer ${
                      useAutoColor
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                    title="Auto-generate color from name"
                  >
                    <Palette className="w-3 h-3" />
                    Auto
                  </button>
                </div>
                {!useAutoColor && (
                  <div className="flex gap-1.5 flex-wrap">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          newTagColor === color
                            ? "scale-125 ring-2 ring-offset-1 ring-primary"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {/* Custom color input */}
                    <label className="relative w-6 h-6 rounded-full cursor-pointer overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span
                        className="block w-full h-full rounded-full"
                        style={{ backgroundColor: newTagColor }}
                      />
                    </label>
                  </div>
                )}
                {useAutoColor && newTagName.trim() && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ backgroundColor: effectiveColor }}
                    />
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {effectiveColor}
                    </span>
                    <button
                      onClick={() => {
                        setNewTagColor(effectiveColor);
                        setUseAutoColor(false);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Customize
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreate(false);
                    setNewTagName("");
                    setUseAutoColor(true);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4" />
              Create New Tag
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
