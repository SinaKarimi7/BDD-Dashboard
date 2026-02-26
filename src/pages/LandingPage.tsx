import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Beaker,
  FileText,
  Tags,
  Download,
  GripVertical,
  Layers,
  Zap,
  ArrowRight,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui";

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Visual Feature Editor",
      description:
        "Write and manage Gherkin feature files with an intuitive visual editor. No more plain text editing.",
    },
    {
      icon: GripVertical,
      title: "Drag & Drop Scenarios",
      description:
        "Reorder scenarios and steps with drag and drop. Manage your BDD workflow like a kanban board.",
    },
    {
      icon: Tags,
      title: "Smart Tagging",
      description:
        "Organize features and scenarios with colored tags. Filter and search across your entire test suite.",
    },
    {
      icon: Download,
      title: "Export Anywhere",
      description:
        "Export individual .feature files or download your entire project as a ZIP with proper folder structure.",
    },
    {
      icon: Layers,
      title: "Scenario Outlines",
      description:
        "Full support for Scenario Outlines with Examples tables. Edit data tables inline with ease.",
    },
    {
      icon: Zap,
      title: "Import Existing Files",
      description:
        "Drag and drop existing .feature files to import them. The Gherkin parser handles the rest.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Beaker className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">BDD Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/SinaKarimi7/BDD-Dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <Button onClick={() => navigate("/dashboard")}>
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <Beaker className="w-4 h-4 text-primary" />
              Open Source BDD Tool
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground mb-6">
              Write BDD Features <span className="text-primary">Visually</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              An interactive dashboard for creating, editing, and managing
              Cucumber feature files. Drag-and-drop scenarios, tag management,
              and instant Gherkin export — all in your browser.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/dashboard")}>
                Start Building
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See Features
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 mx-auto max-w-4xl"
        >
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-muted-foreground">
                BDD Dashboard — Feature Editor
              </span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed">
              <div className="gherkin-tag">@smoke @authentication</div>
              <div>
                <span className="gherkin-keyword">Feature:</span> User Login
              </div>
              <div className="text-muted-foreground ml-2">
                As a registered user
              </div>
              <div className="text-muted-foreground ml-2">
                I want to log in to my account
              </div>
              <div className="text-muted-foreground ml-2">
                So that I can access my dashboard
              </div>
              <div className="mt-4 ml-2">
                <span className="gherkin-keyword">Scenario:</span> Successful
                login with valid credentials
              </div>
              <div className="ml-4">
                <span className="text-blue-600 font-bold">Given </span>I am on
                the login page
              </div>
              <div className="ml-4">
                <span className="text-amber-600 font-bold">When </span>I enter
                "user@example.com" and "password123"
              </div>
              <div className="ml-4">
                <span className="text-green-600 font-bold">Then </span>I should
                see the dashboard page
              </div>
              <div className="ml-4">
                <span className="text-gray-500 font-bold">And </span>I should
                see a welcome message
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Everything you need for BDD
          </h2>
          <p className="text-muted-foreground text-lg">
            A complete toolkit for writing and managing Cucumber feature files.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to write better BDD?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Start creating and managing your Cucumber feature files today. No
            account required — everything runs in your browser.
          </p>
          <Button size="lg" onClick={() => navigate("/dashboard")}>
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Beaker className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              BDD Dashboard — Visual BDD Feature Editor
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a
              href="https://github.com/SinaKarimi7/BDD-Dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span>Built with React + TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
