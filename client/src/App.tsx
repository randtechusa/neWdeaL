import { Switch, Route } from "wouter";
import { Home } from "@/pages/Home";
import { ChartOfAccounts } from "@/pages/ChartOfAccounts";
import { Analysis } from "@/pages/Analysis";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  BarChart3 
} from "lucide-react";

function App() {
  const navItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: <LayoutDashboard className="h-4 w-4" /> 
    },
    { 
      href: "/chart-of-accounts", 
      label: "Chart of Accounts", 
      icon: <FileSpreadsheet className="h-4 w-4" /> 
    },
    { 
      href: "/analysis", 
      label: "Transaction Analysis", 
      icon: <BarChart3 className="h-4 w-4" /> 
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader>
            <h2 className="px-4 text-lg font-semibold tracking-tight">
              Accounting System
            </h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <a href={item.href} className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/chart-of-accounts" component={ChartOfAccounts} />
            <Route path="/analysis" component={Analysis} />
            <Route>
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">404: Page Not Found</h1>
                  <p className="text-muted-foreground">
                    The page you're looking for doesn't exist.
                  </p>
                </div>
              </div>
            </Route>
          </Switch>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default App;
