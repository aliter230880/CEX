import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { checkAuth } = useAuth();
  const register = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", username: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    register.mutate({ data }, {
      onSuccess: () => {
        checkAuth();
        setLocation("/");
      },
      onError: (err) => {
        form.setError("root", { message: err.message || "Registration failed" });
      }
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 dark"
      style={{ background: "transparent" }}
    >
      {/* Ambient glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "15%", right: "25%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "15%", left: "20%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 no-hover">
            <img src="/logo.png" alt="" className="w-10 h-10 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
            <span className="text-3xl font-bold" style={{ color: "#00ff88", letterSpacing: "-0.02em" }}>ATEX</span>
          </Link>
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Spot trading with confidence</p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 0 40px rgba(0,0,0,0.4), 0 0 80px rgba(168,85,247,0.04)",
          }}
        >
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#fff" }}>Create an account</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>Join ATEX to start trading</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="name@example.com"
                        {...field}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff",
                          borderRadius: "8px",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe"
                        {...field}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff",
                          borderRadius: "8px",
                        }}
                      />
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
                    <FormLabel style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff",
                          borderRadius: "8px",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <p className="text-sm font-medium" style={{ color: "hsl(0 84% 60%)" }}>
                  {form.formState.errors.root.message}
                </p>
              )}
              <Button
                type="submit"
                className="w-full font-semibold text-sm rounded-lg h-11"
                disabled={register.isPending}
                style={{
                  background: register.isPending ? "rgba(0,255,136,0.4)" : "linear-gradient(135deg, #00ff88, #00cc6a)",
                  color: "#080c18",
                  border: "none",
                  boxShadow: "0 0 20px rgba(0,255,136,0.25)",
                }}
              >
                {register.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>

          <div className="mt-5 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium" style={{ color: "#00ff88" }}>
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
