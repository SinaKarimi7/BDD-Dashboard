import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Tags,
  Download,
  Settings,
  ChevronLeft,
  Menu,
  Beaker,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { easing, duration } from "@/lib/motion";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { projectId } = useParams();
  const project = useAppStore((s) => s.getProject(projectId || ""));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId || "")),
  );

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const mainNav = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  ];

  const projectNav = projectId
    ? [
        {
          icon: FolderOpen,
          label: "Features",
          path: `/projects/${projectId}`,
          isActive: (p: string) =>
            p === `/projects/${projectId}` ||
            p.startsWith(`/projects/${projectId}/features/`),
        },
        {
          icon: Tags,
          label: "Tags",
          path: `/projects/${projectId}/tags`,
          isActive: (p: string) => isActive(`/projects/${projectId}/tags`),
        },
        {
          icon: Download,
          label: "Export",
          path: `/projects/${projectId}/export`,
          isActive: (p: string) => isActive(`/projects/${projectId}/export`),
        },
        {
          icon: Settings,
          label: "Settings",
          path: `/projects/${projectId}/settings`,
          isActive: (p: string) => isActive(`/projects/${projectId}/settings`),
        },
      ]
    : [];

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border flex flex-col",
          "lg:relative lg:z-auto",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed
            ? "w-0 lg:w-16 -translate-x-full lg:translate-x-0"
            : "w-[280px] translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Beaker className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: duration.normal, ease: easing.apple }}
              className="font-bold text-lg text-sidebar-foreground"
            >
              BDD Dashboard
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mainNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {projectId && project && (
            <>
              <div className="pt-4 pb-2">
                {!collapsed && (
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {project.name}
                  </p>
                )}
              </div>

              {projectNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    item.isActive(location.pathname)
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}

              {/* Feature list in sidebar */}
              {!collapsed && features.length > 0 && (
                <div className="pt-3">
                  <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Features ({features.length})
                  </p>
                  <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                    {features.map((feature) => (
                      <Link
                        key={feature.id}
                        to={`/projects/${projectId}/features/${feature.id}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive(
                            `/projects/${projectId}/features/${feature.id}`,
                          )
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground",
                        )}
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">{feature.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {feature.scenarios.length}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex items-center justify-center p-3 border-t border-sidebar-border">
          <button
            onClick={onToggle}
            className="rounded-lg p-2 hover:bg-accent transition-colors text-muted-foreground cursor-pointer"
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: duration.slow, ease: easing.apple }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
