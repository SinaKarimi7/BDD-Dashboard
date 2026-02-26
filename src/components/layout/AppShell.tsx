import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, MobileMenuButton } from "./Sidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
