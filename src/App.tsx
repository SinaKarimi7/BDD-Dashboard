import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/pages/LandingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProjectPage } from "@/pages/ProjectPage";
import { FeatureEditorPage } from "@/pages/FeatureEditorPage";
import { BoardViewPage } from "@/pages/BoardViewPage";
import { TagsPage } from "@/pages/TagsPage";
import { ExportPage } from "@/pages/ExportPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SystemSettingsPage } from "@/pages/SystemSettingsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { GitHubSyncPage } from "@/pages/GitHubSyncPage";
import { ProjectBoardPage } from "@/pages/ProjectBoardPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public landing page — no shell */}
          <Route path="/" element={<LandingPage />} />

          {/* App routes with sidebar shell */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SystemSettingsPage />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route
              path="/projects/:projectId/features/:featureId"
              element={<FeatureEditorPage />}
            />
            <Route
              path="/projects/:projectId/features/:featureId/board"
              element={<BoardViewPage />}
            />
            <Route
              path="/projects/:projectId/board"
              element={<ProjectBoardPage />}
            />
            <Route path="/projects/:projectId/tags" element={<TagsPage />} />
            <Route
              path="/projects/:projectId/analytics"
              element={<AnalyticsPage />}
            />
            <Route
              path="/projects/:projectId/github"
              element={<GitHubSyncPage />}
            />
            <Route
              path="/projects/:projectId/export"
              element={<ExportPage />}
            />
            <Route
              path="/projects/:projectId/settings"
              element={<SettingsPage />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
