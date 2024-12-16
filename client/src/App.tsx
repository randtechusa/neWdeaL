import { Switch, Route } from "wouter";
import { Home } from "@/pages/Home";
import { ChartOfAccounts } from "@/pages/ChartOfAccounts";
import { Analysis } from "@/pages/Analysis";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { ActiveSubscribers } from "@/pages/admin/ActiveSubscribers";
import { DeactivatedSubscribers } from "@/pages/admin/DeactivatedSubscribers";
import { AdminSettings } from "@/pages/admin/AdminSettings";
import AuthPage from "@/pages/AuthPage";
import { useUser } from "@/hooks/use-user";
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  Upload as UploadIcon,
  FileText,
  Settings,
  ChevronDown,
  Wallet,
  BookOpen,
  Scale,
  BarChart2,
  TrendingUp,
  BadgeDollarSign,
  Users,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Admin Chart of Accounts component
const AdminChartOfAccounts = () => <div>Chart of Accounts (Admin)</div>;


function App() {
  const userNavItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />
    },
    {
      href: "/upload",
      label: "Data Upload",
      icon: <UploadIcon className="h-4 w-4" />
    },
    {
      href: "/analysis",
      label: "Data Analysis",
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      label: "Reports",
      icon: <FileText className="h-4 w-4" />,
      dropdown: [
        { href: "/reports/bank-statements", label: "Bank Statements", icon: <Wallet className="h-4 w-4" /> },
        { href: "/reports/general-ledger", label: "General Ledger", icon: <BookOpen className="h-4 w-4" /> },
        { href: "/reports/trial-balance", label: "Trial Balance", icon: <Scale className="h-4 w-4" /> },
        { href: "/reports/financial-position", label: "Statement of Financial Position", icon: <BarChart2 className="h-4 w-4" /> },
        { href: "/reports/income", label: "Statement of Income", icon: <TrendingUp className="h-4 w-4" /> },
        { href: "/reports/cash-flow", label: "Statement of Cash Flow", icon: <BadgeDollarSign className="h-4 w-4" /> }
      ]
    },
    {
      href: "/chart-of-accounts",
      label: "Chart of Accounts",
      icon: <FileSpreadsheet className="h-4 w-4" />
    },
    {
      href: "/settings",
      label: "Company Settings",
      icon: <Settings className="h-4 w-4" />
    }
  ];

  const adminNavItems = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />
    },
    {
      href: "/admin/active-subscribers",
      label: "Active Subscribers",
      icon: <Users className="h-4 w-4" />
    },
    {
      href: "/admin/deactivated-subscribers",
      label: "Deactivated Subscribers",
      icon: <Users className="h-4 w-4" />
    },
    {
      href: "/admin/chart-of-accounts",
      label: "Charts of Accounts",
      icon: <FileSpreadsheet className="h-4 w-4" />
    },
    {
      href: "/admin/settings",
      label: "Admin Settings",
      icon: <Settings className="h-4 w-4" />
    }
  ];

  const { user, isLoading } = useUser();
  const navItems = user?.role === 'admin' ? adminNavItems : userNavItems;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <a href="/" className="flex items-center space-x-2">
              <span className="font-bold">Analee</span>
            </a>
          </div>
          <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
            {navItems.map((item) =>
              item.dropdown ? (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                    {item.icon}
                    <span>{item.label}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {item.dropdown.map((subItem) => (
                      <DropdownMenuItem key={subItem.href} asChild>
                        <a
                          href={subItem.href}
                          className="flex items-center gap-2 w-full"
                        >
                          {subItem.icon}
                          <span>{subItem.label}</span>
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              )
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chart-of-accounts" component={ChartOfAccounts} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/active-subscribers" component={ActiveSubscribers} />
          <Route path="/admin/deactivated-subscribers" component={DeactivatedSubscribers} />
          <Route path="/admin/chart-of-accounts" component={AdminChartOfAccounts} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route>
            <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold">404: Page Not Found</h1>
                <p className="text-muted-foreground">
                  The page you're looking for doesn't exist.
                </p>
              </div>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

export default App;