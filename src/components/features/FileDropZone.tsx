import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { Feature } from "@/types";
import { parseFeatureFiles } from "@/lib/gherkin";
import { Button } from "@/components/ui";
import { staggerContainer, staggerItem, easing, duration } from "@/lib/motion";

interface FileDropZoneProps {
  projectId: string;
  onImport: (features: Feature[]) => void;
}

export function FileDropZone({ projectId, onImport }: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedFeatures, setParsedFeatures] = useState<Feature[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const dragCounter = useRef(0);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter(
        (f) => f.name.endsWith(".feature") || f.type === "text/plain",
      );

      if (fileArray.length === 0) {
        setErrors([
          "No .feature files found. Please upload files with .feature extension.",
        ]);
        return;
      }

      const fileContents = await Promise.all(
        fileArray.map(async (f) => ({
          name: f.name,
          content: await f.text(),
          path: (f as any).webkitRelativePath
            ? (f as any).webkitRelativePath.split("/").slice(0, -1).join("/")
            : "features",
        })),
      );

      const parsed = parseFeatureFiles(fileContents, projectId);
      const errs: string[] = [];

      fileArray.forEach((f, i) => {
        if (!parsed[i]) {
          errs.push(`Failed to parse: ${f.name}`);
        }
      });

      setParsedFeatures(parsed);
      setErrors(errs);
    },
    [projectId],
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        animate={{
          borderColor: dragActive
            ? "var(--color-primary)"
            : "var(--color-border)",
          backgroundColor: dragActive ? "rgba(22,163,74,0.05)" : "transparent",
        }}
        transition={{ duration: duration.normal, ease: easing.apple }}
        className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10"
      >
        <motion.div
          animate={{ scale: dragActive ? 1.15 : 1, y: dragActive ? -4 : 0 }}
          transition={{ duration: duration.normal, ease: easing.spring }}
        >
          <Upload
            className={`w-10 h-10 mb-3 transition-colors duration-200 ${
              dragActive ? "text-primary" : "text-muted-foreground"
            }`}
          />
        </motion.div>
        <p className="text-sm font-medium text-foreground mb-1">
          {dragActive
            ? "Drop files to import"
            : "Drag & drop .feature files here"}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          or click to browse files
        </p>
        <input
          type="file"
          multiple
          accept=".feature,.txt"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </motion.div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {parsedFeatures.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {parsedFeatures.length} feature(s) ready to import:
          </p>
          <motion.div
            className="space-y-2 max-h-[300px] overflow-y-auto"
            variants={staggerContainer(40, 50)}
            initial="initial"
            animate="animate"
          >
            {parsedFeatures.map((feature) => (
              <motion.div
                key={feature.id}
                variants={staggerItem}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{feature.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {feature.scenarios.length} scenarios
                  </p>
                </div>
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
            ))}
          </motion.div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setParsedFeatures([]);
                setErrors([]);
              }}
            >
              Clear
            </Button>
            <Button onClick={() => onImport(parsedFeatures)}>
              Import {parsedFeatures.length} Feature(s)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
