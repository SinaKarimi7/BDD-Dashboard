import { useState } from "react";
import { Check, Lightbulb, Monitor, Save as SaveIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store";
import type { TriageStatus } from "@/types";
import { Button, Card, CardContent, Select } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageTransition } from "@/components/animation";
import { easing, duration } from "@/lib/motion";

export function SystemSettingsPage() {
  const systemSettings = useAppStore((s) => s.systemSettings);
  const updateSystemSettings = useAppStore((s) => s.updateSystemSettings);

  const [defaultStatus, setDefaultStatus] = useState<TriageStatus>(
    systemSettings?.defaultScenarioStatus || "backlog",
  );
  const [autoSave, setAutoSave] = useState(
    systemSettings?.autoSaveDrafts ?? true,
  );
  const [gherkinLang, setGherkinLang] = useState(
    systemSettings?.gherkinLanguage || "en",
  );
  const [exportFormat, setExportFormat] = useState<"feature" | "json">(
    systemSettings?.exportFormat || "feature",
  );
  const [showSuggestions, setShowSuggestions] = useState(
    systemSettings?.showStepSuggestions ?? true,
  );
  const [systemSaved, setSystemSaved] = useState(false);

  const handleSave = () => {
    updateSystemSettings({
      defaultScenarioStatus: defaultStatus,
      autoSaveDrafts: autoSave,
      gherkinLanguage: gherkinLang,
      exportFormat,
      showStepSuggestions: showSuggestions,
    });
    setSystemSaved(true);
    setTimeout(() => setSystemSaved(false), 2000);
  };

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "System Settings" },
          ]}
        />

        <h1 className="text-2xl font-bold tracking-tight mt-4 mb-8 flex items-center gap-2">
          <Monitor className="w-6 h-6 text-primary" />
          System Settings
        </h1>

        <div className="space-y-6">
          {/* Defaults */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <h3 className="font-medium">Defaults</h3>

              <div className="space-y-4">
                <Select
                  label="Default Status for New Scenarios"
                  value={defaultStatus}
                  onChange={(e) =>
                    setDefaultStatus(e.target.value as TriageStatus)
                  }
                  options={[
                    { value: "backlog", label: "Backlog" },
                    { value: "todo", label: "To Do" },
                    { value: "wip", label: "In Progress" },
                    { value: "done", label: "Done" },
                  ]}
                />

                <Select
                  label="Default Export Format"
                  value={exportFormat}
                  onChange={(e) =>
                    setExportFormat(e.target.value as "feature" | "json")
                  }
                  options={[
                    { value: "feature", label: "Gherkin (.feature)" },
                    { value: "json", label: "JSON (.json)" },
                  ]}
                />

                <Select
                  label="Gherkin Language"
                  value={gherkinLang}
                  onChange={(e) => setGherkinLang(e.target.value)}
                  options={[
                    { value: "en", label: "English" },
                    { value: "fr", label: "French (Français)" },
                    { value: "de", label: "German (Deutsch)" },
                    { value: "es", label: "Spanish (Español)" },
                    { value: "pt", label: "Portuguese (Português)" },
                    { value: "ja", label: "Japanese (日本語)" },
                    { value: "zh", label: "Chinese (中文)" },
                    { value: "ru", label: "Russian (Русский)" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Behavior */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <h3 className="font-medium">Behavior</h3>

              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium flex items-center gap-2">
                      <SaveIcon className="w-4 h-4 text-muted-foreground" />
                      Auto-save drafts
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Automatically save changes as you edit features
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSave}
                    onClick={() => setAutoSave(!autoSave)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${autoSave ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${autoSave ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-muted-foreground" />
                      Step suggestions
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show keyword suggestions when adding steps
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showSuggestions}
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showSuggestions ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${showSuggestions ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>Save System Settings</Button>
            {systemSaved && (
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
        </div>
      </div>
    </PageTransition>
  );
}
