import Link from "next/link";
import { BookOpen, Library, ClipboardList, User } from "lucide-react";
import { COPY } from "@/features/study/constants";
import { cn } from "@/lib/cn";

// App navigation (mockup 2): Accueil active; Bibliothèque, Examens and
// Profil arrive in slices 4 and 5 and render as "Bientôt" placeholders.
const items = [
  { href: "/", label: COPY.navHome, icon: BookOpen, active: true },
  { href: "#", label: COPY.navLibrary, icon: Library, active: false },
  { href: "#", label: COPY.navExams, icon: ClipboardList, active: false },
  { href: "#", label: COPY.navProfile, icon: User, active: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <li key={item.label} className="flex-1">
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              title={item.active ? undefined : COPY.soonBadge}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                item.active ? "text-primary-text" : "text-muted-text hover:text-text",
              )}
            >
              <item.icon className={cn("size-5", item.active && "text-primary")} aria-hidden />
              <span className="flex items-center gap-1">
                {item.label}
                {!item.active && (
                  <span className="text-[10px] font-normal opacity-70">{COPY.soonBadge}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
