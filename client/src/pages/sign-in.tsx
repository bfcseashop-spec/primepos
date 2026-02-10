import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, User, Lock, Eye, EyeOff, Globe } from "lucide-react";
import { useTranslation, LANGUAGES, type Language } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SignInPageProps {
  onLogin: (user: any) => void;
}

export default function SignInPage({ onLogin }: SignInPageProps) {
  const { toast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: t("signIn.welcomeBack"), description: `${t("signIn.signedInAs")} ${data.fullName}` });
      onLogin(data);
    },
    onError: (err: any) => {
      toast({ title: t("signIn.signInFailed"), description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    loginMutation.mutate({ username: username.trim(), password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 dark:from-blue-900 dark:via-cyan-800 dark:to-teal-700" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-blue-300/10 blur-2xl" />

        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg mb-4">
            <Heart className="h-10 w-10 text-white" fill="white" />
          </div>
          <div className="absolute top-4 right-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5 text-white text-sm font-medium" data-testid="button-signin-language">
                  <Globe className="h-3.5 w-3.5" />
                  {LANGUAGES.find(l => l.code === language)?.flag}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => setLanguage(lang.code)} data-testid={`menu-signin-lang-${lang.code}`}>
                    <span className="text-xs font-bold w-6 text-center">{lang.flag}</span>
                    <span>{lang.nativeLabel}</span>
                    {language === lang.code && <span className="ml-auto text-emerald-500">&#10003;</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight" data-testid="text-app-title">
            {t("common.appName")}
          </h1>
          <p className="text-white/70 text-sm mt-1">{t("common.appTagline")}</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold" data-testid="text-sign-in-title">{t("signIn.title")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("signIn.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-username">{t("signIn.username")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("signIn.usernamePlaceholder")}
                    className="pl-10"
                    autoComplete="username"
                    data-testid="input-signin-username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">{t("signIn.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("signIn.passwordPlaceholder")}
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                    data-testid="input-signin-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 border-0 text-white"
                disabled={!username.trim() || !password.trim() || loginMutation.isPending}
                data-testid="button-signin"
              >
                {loginMutation.isPending ? t("signIn.signingIn") : t("signIn.signInButton")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-white/50 text-xs mt-6">
          {t("common.appName")} {t("common.version")} &middot; {t("common.appTagline")}
        </p>
      </div>
    </div>
  );
}
