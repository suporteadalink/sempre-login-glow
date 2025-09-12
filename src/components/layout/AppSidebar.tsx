import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Target,
  Settings,
  FolderOpen,
  Building2,
  Users,
  FileText,
  CheckSquare,
  LogOut,
  Bot
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Pipeline", url: "/pipeline", icon: Target },
  { title: "Projetos", url: "/projetos", icon: FolderOpen },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare },
  { title: "Propostas", url: "/propostas", icon: FileText },
  { title: "IA Monitoring", url: "/ai-monitoring", icon: Bot },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state: sidebarState } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = sidebarState === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar className="border-r bg-zinc-900 text-white">
      <SidebarHeader className="p-6">
        <div className="flex items-center">
          <h1 className={`font-bold bg-gradient-primary bg-clip-text text-transparent ${
            isCollapsed ? "text-lg" : "text-xl"
          }`}>
            {isCollapsed ? "SC" : "Sempre CRM"}
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-400 text-xs uppercase tracking-wider px-3">
            {!isCollapsed && "Navegação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`
                      w-full justify-start px-3 py-2 transition-all duration-300 ease-out
                      ${isActive(item.url) 
                        ? "bg-gradient-to-r from-yellow-400/10 to-orange-400/10 text-yellow-400 border-r-2 border-yellow-400 shadow-lg" 
                        : "text-zinc-300 hover:bg-gradient-to-r hover:from-yellow-400/5 hover:to-orange-400/5 hover:text-yellow-300"
                      }
                    `}
                  >
                    <NavLink to={item.url} className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-zinc-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400 truncate">
                {user?.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 flex-shrink-0"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}