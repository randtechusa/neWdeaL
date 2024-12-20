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
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { MasterAccount } from "@db/schema";
import { TutorialProvider } from "@/components/TutorialProvider";
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

// Admin Chart of Accounts component with protected data and environment separation
const AdminChartOfAccounts = () => {
  const { data: accounts = [] } = useQuery<MasterAccount[]>({
    queryKey: ["/api/admin/master-accounts"],
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Master Chart of Accounts</h1>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Links</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Sub Category</TableHead>
            <TableHead>Accounts</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts?.map((account) => (
            <TableRow key={account.id}>
              <TableCell>
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => window.open(`/admin/accounts/${account.id}`, '_blank')}
                >
                  View
                </Button>
              </TableCell>
              <TableCell>{account.type}</TableCell>
              <TableCell>{account.parentId ? 'Sub' : 'Main'}</TableCell>
              <TableCell>{account.code}</TableCell>
              <TableCell>{account.name}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View Details"
                    onClick={() => window.open(`/admin/accounts/${account.id}`, '_blank')}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

function App() {
  const { user, isLoading } = useUser();

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

  const userNavItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />
    },
    {
      href: "/data-upload",
      label: "Data Upload",
      icon: <UploadIcon className="h-4 w-4" />
    },
    {
      href: "/data-analysis",
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
      href: "/company-settings",
      label: "Company Settings",
      icon: <Settings className="h-4 w-4" />
    }
  ];

  const adminNavItems = [
    {
      href: "/admin",
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

  const navItems = user.role === 'admin' ? adminNavItems : userNavItems;

  return (
    <TutorialProvider>
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
    </TutorialProvider>
  );
}

export default App;
