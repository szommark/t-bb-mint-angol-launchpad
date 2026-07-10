import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Log in — Több mint angol" },
      { name: "description", content: "Sign in to your account or create a new one." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPassword2, setSignupPassword2] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 8) return toast.error("Password must be at least 8 characters.");
    if (signupPassword !== signupPassword2) return toast.error("Passwords don't match.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: { name: signupName.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Account created! Let's find your starting level.");
      navigate({ to: "/free-placement-test" });
    } else {
      toast.success("Check your inbox to confirm your email.");
    }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("If an account exists, we've emailed a reset link.");
    setForgotOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              {forgotOpen ? (
                <form onSubmit={onForgot} className="space-y-4">
                  <h2 className="text-lg font-semibold">Reset your password</h2>
                  <div className="space-y-2">
                    <Label htmlFor="fe">Email</Label>
                    <Input id="fe" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
                  </Button>
                  <button type="button" onClick={() => setForgotOpen(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                    Back to log in
                  </button>
                </form>
              ) : (
                <form onSubmit={onLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="le">Email</Label>
                    <Input id="le" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lp">Password</Label>
                    <Input id="lp" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-[var(--teal-accent)] hover:bg-[var(--teal-accent-strong)]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log in
                  </Button>
                  <button type="button" onClick={() => setForgotOpen(true)} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={onSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sn">Full name</Label>
                  <Input id="sn" required value={signupName} onChange={(e) => setSignupName(e.target.value)} maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="se">Email</Label>
                  <Input id="se" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp">Password</Label>
                  <Input id="sp" type="password" required minLength={8} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp2">Confirm password</Label>
                  <Input id="sp2" type="password" required minLength={8} value={signupPassword2} onChange={(e) => setSignupPassword2(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[var(--teal-accent)] hover:bg-[var(--teal-accent-strong)]">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}