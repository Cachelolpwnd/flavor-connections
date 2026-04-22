import { useState, useEffect, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { Map, Leaf, FlaskConical, Tag, Info, Sun, Moon, Globe, GitCompare, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Карта", path: "/", icon: Map },
  { title: "Кухни мира", path: "/cuisines", icon: Globe },
  { title: "Подбор", path: "/compare", icon: GitCompare },
  { title: "Рецепты", path: "/recipes", icon: UtensilsCrossed },
  { title: "Ингредиенты", path: "/ingredients", icon: Leaf },
  { title: "Соединения", path: "/compounds", icon: FlaskConical },
  { title: "Теги", path: "/tags", icon: Tag },
  { title: "О проекте", path: "/about", icon: Info },
];

function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setIsDark((d) => !d)}
      data-testid="button-theme-toggle"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <span className="font-serif text-lg font-semibold tracking-tight" data-testid="text-app-title">
          Flavor Atlas
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    tooltip={item.title}
                  >
                    <Link href={item.path} data-testid={`link-nav-${item.path === "/" ? "map" : item.path.slice(1)}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}

const sidebarStyle = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "3rem",
} as React.CSSProperties;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 backdrop-blur p-2">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto paper">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
