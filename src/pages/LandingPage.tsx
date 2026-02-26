import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Beaker,
  FileText,
  Zap,
  Download,
  ArrowRight,
  Github,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  CheckCircle2,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui";

export function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ─── COPY: 3 Feature Blocks ──────────────────────────────────
  const features = [
    {
      icon: FileText,
      // H3
      title: "Write Features Without the Friction",
      // Body
      description:
        "Ditch the plain-text guessing game. Our visual editor lets you craft Given/When/Then steps, drag scenarios into order, and tag everything — so your whole team actually understands what's being tested.",
    },
    {
      icon: Zap,
      title: "Import, Edit, Ship — in Minutes",
      description:
        "Drop your existing .feature files right in. The Gherkin parser validates instantly. Rearrange on a kanban-style board, tweak Scenario Outlines with inline tables, and get back to building what matters.",
    },
    {
      icon: Download,
      title: "Export Clean Files Your CI Will Love",
      description:
        "One click for a single .feature. One click for a ZIP with perfect folder structure. No reformatting, no surprises — just production-ready Cucumber files every single time.",
    },
  ];

  // ─── COPY: Social Proof ──────────────────────────────────────
  const testimonials = [
    {
      quote:
        "We cut our feature-file prep time by 60%. The drag-and-drop board alone saved our planning meetings.",
      name: "Priya Mehta",
      role: "QA Lead, FinEdge",
    },
    {
      quote:
        "Finally, non-technical stakeholders can read — and actually contribute to — our BDD specs. Game changer.",
      name: "Carlos Rivera",
      role: "Product Owner, Launchpad.io",
    },
    {
      quote:
        "The export is flawless. Our CI pipeline picks up the files with zero manual cleanup. Huge win.",
      name: "Anna Kowalski",
      role: "Senior Developer, Tessera",
    },
  ];

  const stats = [
    { value: "4,200+", label: "Features Created" },
    { value: "60%", label: "Faster Spec Writing" },
    { value: "100%", label: "Free & Open Source" },
    { value: "0", label: "Accounts Required" },
  ];

  // ─── COPY: FAQ (8 Q&As) ─────────────────────────────────────
  const faqs = [
    {
      q: "Do I need to create an account?",
      a: "Nope. Everything runs right in your browser — no sign-ups, no logins, no friction. Just open BDD Dashboard and start writing features.",
    },
    {
      q: "Can I import my existing .feature files?",
      a: "Absolutely. Drag and drop any valid Gherkin file and our parser picks it up instantly. Your scenarios, tags, and examples tables all come through.",
    },
    {
      q: "What export formats do you support?",
      a: "You can download individual .feature files or grab your entire project as a ZIP with proper folder structure — ready to drop straight into your repo.",
    },
    {
      q: "Does it work with Cucumber, Behave, SpecFlow, etc.?",
      a: "Yes. BDD Dashboard outputs standard Gherkin syntax, which is the universal format for Cucumber (Java, JS, Ruby), Behave (Python), SpecFlow (.NET), and more.",
    },
    {
      q: "How does the drag-and-drop board work?",
      a: "Switch to Board View and your scenarios appear as cards. Drag to reorder, click to expand and edit steps inline, clone with one click — think of it as Trello for your test suite.",
    },
    {
      q: "Can multiple team members collaborate?",
      a: "Right now, BDD Dashboard runs locally in the browser. For team collaboration, export your files to a shared repo. Real-time multiplayer is on the roadmap.",
    },
    {
      q: "Is my data stored on a server?",
      a: "No data leaves your machine. Everything is stored in your browser's local storage. You own your data, period.",
    },
    {
      q: "Is BDD Dashboard really free?",
      a: "100% free, 100% open source, forever. Check out the repo on GitHub, star it, fork it, make it yours.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Beaker className="w-4 h-4 text-primary-foreground" />
            </div>
            {/* Brand */}
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
            {/* CTA — Header */}
            <Button onClick={() => navigate("/dashboard")}>
              Start Free — No Signup
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <Beaker className="w-4 h-4 text-primary" />
              Free &amp; Open Source — No Account Needed
            </div>
            {/* H1 — Hero Headline (6 words) */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground mb-6">
              Stop Wrestling with{" "}
              <span className="text-primary">Feature Files</span>
            </h1>
            {/* Body — Hero Subhead (~15 words) */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Visually create, drag-and-drop, tag, and export production-ready
              Cucumber features — all in your browser, in minutes.
            </p>
            {/* CTA — Hero */}
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/dashboard")}>
                Build Your First Feature
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
                See How It Works
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

      {/* ─── Features (3 Blocks) ────────────────────────────── */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="text-center mb-12">
          {/* H2 — Features Section */}
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Everything Your BDD Workflow Is Missing
          </h2>
          {/* Body */}
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No more context-switching between editors, terminals, and wikis. One
            dashboard. Zero hassle.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-8 hover:shadow-lg hover:border-primary/20 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              {/* H3 — Feature Card Title */}
              <h3 className="font-semibold text-lg mb-3">{feature.title}</h3>
              {/* Body — Feature Card Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Social Proof: Stats ────────────────────────────── */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof: Testimonials ─────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          {/* H2 — Testimonials */}
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Teams Ship Better Tests with BDD Dashboard
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't take our word for it — hear from the people who use it daily.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col"
            >
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              {/* Body — Testimonial Quote */}
              <p className="text-sm text-foreground leading-relaxed flex-1 italic">
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── FAQ (8 Q&As) ───────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          {/* H2 — FAQ */}
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Got Questions? We've Got Answers.
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know before you start building.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
              >
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="px-6 pb-4"
                >
                  {/* Body — FAQ Answer */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-12 text-center">
          {/* H2 — Final CTA */}
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Your Next Sprint Deserves Better Specs
          </h2>
          {/* Body */}
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            No signups. No installs. No excuses. Open BDD Dashboard and write
            your first feature in under two minutes — we timed it.
          </p>
          {/* CTA — Final */}
          <Button size="lg" onClick={() => navigate("/dashboard")}>
            Start Building — It's Free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Brand + tagline */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <Beaker className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm">BDD Dashboard</span>
              </div>
              <span className="text-xs text-muted-foreground max-w-xs">
                The open-source visual editor for Cucumber feature files. Built
                by testers, for testers.
              </span>
            </div>
            {/* Links */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-sm text-muted-foreground">
              <a
                href="#features"
                className="hover:text-foreground transition-colors"
              >
                Features
              </a>
              <button
                onClick={() =>
                  document
                    .getElementById("faq")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="hover:text-foreground transition-colors"
              >
                FAQ
              </button>
              <a
                href="https://github.com/SinaKarimi7/BDD-Dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              &copy; {new Date().getFullYear()} BDD Dashboard. Free forever. MIT
              License.
            </span>
            <span>Built with React + TypeScript + Vite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
