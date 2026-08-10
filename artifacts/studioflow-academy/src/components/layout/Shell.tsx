import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Image as ImageIcon, 
  BookOpen, 
  GraduationCap, 
  Medal, 
  Briefcase, 
  UserCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Creator Hub", icon: LayoutDashboard },
  { href: "/habits", label: "Habits", icon: CheckSquare },
  { href: "/studio-log", label: "Studio Log", icon: ImageIcon },
  { href: "/workshops", label: "Workshops", icon: BookOpen },
  { href: "/enrollments", label: "My Courses", icon: GraduationCap },
  { href: "/skill-tracks", label: "Skill Tracks", icon: Medal },
  { href: "/job-board", label: "Job Board", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  // Do not wrap landing page in the shell
  if (location === "/") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl leading-none tracking-tighter">S</span>
            </div>
            <span className="font-bold text-lg tracking-tight uppercase">StudioFlow</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-16 md:pb-0 bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
