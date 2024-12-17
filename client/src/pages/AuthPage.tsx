import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  userId: z.string().min(3, "User ID must be at least 3 characters"),
});

type AuthForm = z.infer<typeof authSchema>;

export default function AuthPage() {
  const { login, register } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      userId: "",
    },
  });

  async function onSubmit(data: AuthForm) {
    setIsLoading(true);
    try {
      const result = activeTab === "login" 
        ? await login(data)
        : await register(data);

      if (!result.ok) {
        let errorTitle = activeTab === "login" ? "Login Failed" : "Registration Failed";
        let errorDescription = result.message;

        // Provide more user-friendly messages based on error codes
        if (result.code === 'MISSING_CREDENTIALS') {
          errorTitle = "Missing Information";
        } else if (result.code === 'INVALID_EMAIL_FORMAT') {
          errorTitle = "Invalid Email";
        } else if (result.code === 'INVALID_PASSWORD') {
          errorTitle = "Invalid Password";
        } else if (result.code === 'ACCOUNT_DEACTIVATED') {
          errorTitle = "Account Deactivated";
        }

        toast({
          variant: "destructive",
          title: errorTitle,
          description: errorDescription,
          duration: 5000, // Show error for 5 seconds
        });
      } else {
        // Show success message
        toast({
          variant: "default",
          title: activeTab === "login" ? "Welcome Back!" : "Registration Successful",
          description: activeTab === "login" 
            ? "You have successfully logged in."
            : "Your account has been created successfully.",
          duration: 3000,
        });
      }
    } catch (error: any) {
      // Handle unexpected errors
      console.error('Authentication error:', error);
      toast({
        variant: "destructive",
        title: "System Error",
        description: "An unexpected error occurred. Please try again later.",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Analee</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Enterprise-grade Financial Analytics Platform
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {activeTab === "register" && (
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your user ID" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter your email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Enter your password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading 
                    ? (activeTab === "login" ? "Signing in..." : "Registering...") 
                    : (activeTab === "login" ? "Sign in" : "Register")}
                </Button>
              </form>
            </Form>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {activeTab === "login" 
              ? "Don't have an account? Click Register above" 
              : "Already have an account? Click Login above"}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
