import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 bg-background overflow-x-auto min-w-0">
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="flex items-center h-12 px-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
          </div>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}