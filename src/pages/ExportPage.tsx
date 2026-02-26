import { useParams } from "react-router-dom";
import { Download, FileText, FolderArchive } from "lucide-react";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Button, Card, CardContent, EmptyState } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { exportSingleFeature, exportAllFeatures } from "@/lib/export";

export function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useAppStore((s) => s.getProject(projectId!));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId!)),
  );

  if (!project) return null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: project.name, path: `/projects/${projectId}` },
          { label: "Export" },
        ]}
      />

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Export</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Download your feature files in Gherkin format
        </p>
      </div>

      {features.length === 0 ? (
        <EmptyState
          icon={<Download className="w-12 h-12" />}
          title="Nothing to export"
          description="Create some features first, then come back to export them."
        />
      ) : (
        <div className="space-y-6">
          {/* Export all */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                  <FolderArchive className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Export All as ZIP</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Download all {features.length} feature files with proper
                    folder structure in a single ZIP archive.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>
                      Folder structure based on each feature's folder path
                      setting.
                    </p>
                    <p>
                      Total: {features.length} features,{" "}
                      {features.reduce((a, f) => a + f.scenarios.length, 0)}{" "}
                      scenarios
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => exportAllFeatures(features, project.name)}
                >
                  <Download className="w-4 h-4" />
                  Download ZIP
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Individual features */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Export Individual Features
            </h2>
            <div className="space-y-2">
              {features.map((feature) => (
                <Card key={feature.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {feature.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {feature.scenarios.length} scenarios ·{" "}
                          {feature.folderPath}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportSingleFeature(feature)}
                    >
                      <Download className="w-4 h-4" />
                      .feature
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
