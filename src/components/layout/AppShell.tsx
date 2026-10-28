import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, MobileMenuButton } from "./Sidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Matches Tailwind's lg breakpoint, where the sidebar sits beside the content
const isLargeScreen = () => window.matchMedia("(min-width: 1024px)").matches;

export function AppShell() {
  const location = useLocation();
  // On small screens the sidebar is an overlay, so start it closed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => !isLargeScreen(),
  );
  const [lastPath, setLastPath] = useState(location.pathname);

  // Close the overlay after navigating on small screens
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    if (!isLargeScreen()) setSidebarCollapsed(true);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <MobileMenuButton onClick={() => setSidebarCollapsed(false)} />
          <span className="font-semibold flex-1">BDD Dashboard</span>
          <ThemeToggle collapsed />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
