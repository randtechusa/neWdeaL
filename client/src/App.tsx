import { Switch, Route } from "wouter";
import { Home } from "@/pages/Home";
import { ChartOfAccounts } from "@/pages/ChartOfAccounts";
import { Analysis } from "@/pages/Analysis";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  BarChart3,
  Upload,
  FileText,
  Settings
} from "lucide-react";

function App() {
  const navItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: <LayoutDashboard className="h-4 w-4" /> 
    },
    { 
      href: "/upload", 
      label: "Data Upload", 
      icon: <Upload className="h-4 w-4" /> 
    },
    { 
      href: "/analysis", 
      label: "Data Analysis", 
      icon: <BarChart3 className="h-4 w-4" /> 
    },
    { 
      href: "/reports", 
      label: "Reports", 
      icon: <FileText className="h-4 w-4" /> 
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
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <a href="/" className="flex items-center space-x-2">
              <span className="font-bold">Accounting System</span>
            </a>
          </div>
          <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chart-of-accounts" component={ChartOfAccounts} />
          <Route path="/analysis" component={Analysis} />
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
