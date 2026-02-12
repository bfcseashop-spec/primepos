import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, User, LogOut, Calendar, Clock, ShoppingCart, Activity, Globe } from "lucide-react";
import { useTranslation, LANGUAGES } from "@/i18n";

const LOCALE_MAP: Record<string, string> = { en: "en-US", km: "km-KH", zh: "zh-CN" };

function LiveDateTime() {
  const [now, setNow] = useState(new Date());
  const { language } = useTranslation();
  const locale = LOCALE_MAP[language] || "en-US";

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const timeStr = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex items-center gap-3 text-sm flex-wrap" data-testid="text-live-datetime">
      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium">{dateStr}</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
        <Clock className="h-3.5 w-3.5" />
        <span className="tabular-nums font-medium">{timeStr}</span>
      </div>
    </div>
  );
}

function getUser() {
  try {
    const saved = localStorage.getItem("clinicpos_user");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-language-switcher">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("header.language")}</div>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`gap-2 ${language === lang.code ? "bg-accent" : ""}`}
            data-testid={`menu-lang-${lang.code}`}
          >
            <span className="text-xs font-bold w-6 text-center rounded bg-muted px-1 py-0.5">{lang.flag}</span>
            <span className="flex-1">{lang.nativeLabel}</span>
            {language === lang.code && <span className="text-xs text-emerald-500">&#10003;</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { t } = useTranslation();
  const user = getUser();
  const displayName = user?.fullName || "Admin";
  const displayEmail = user?.email || "";
  const initials = getInitials(displayName);
  const roleName = user?.role || "Administrator";

  const handleLogout = () => {
    localStorage.removeItem("clinicpos_user");
    window.dispatchEvent(new Event("clinicpos_logout"));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-profile-menu">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                {displayEmail && <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>}
                <Badge variant="secondary" className="mt-1 text-[10px] w-fit">{roleName}</Badge>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditProfileOpen(true)} data-testid="menu-edit-profile" className="gap-2">
            <User className="h-4 w-4 text-blue-500" />
            {t("header.editProfile")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout" className="gap-2 text-red-600 dark:text-red-400">
            <LogOut className="h-4 w-4" />
            {t("header.logOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("header.editProfile")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); setEditProfileOpen(false); }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <Label htmlFor="profileName">{t("header.fullName")}</Label>
              <Input id="profileName" defaultValue={displayName} data-testid="input-profile-name" />
            </div>
            <div>
              <Label htmlFor="profileEmail">{t("common.email")}</Label>
              <Input id="profileEmail" type="email" defaultValue={displayEmail} data-testid="input-profile-email" />
            </div>
            <div>
              <Label htmlFor="profilePhone">{t("common.phone")}</Label>
              <Input id="profilePhone" defaultValue={user?.phone || ""} data-testid="input-profile-phone" />
            </div>
            <Button type="submit" className="w-full" data-testid="button-save-profile">
              {t("common.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LayoutHeader() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <header className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-background sticky top-0 z-50" data-testid="layout-header">
      <div className="flex items-center gap-2 flex-wrap">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div className="hidden sm:flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("common.online")}</span>
        </div>
      </div>
      <div className="hidden md:flex items-center">
        <LiveDateTime />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="default"
          onClick={() => setLocation("/billing")}
          className="bg-gradient-to-r from-blue-600 to-violet-600 border-blue-700 text-white"
          data-testid="button-header-pos"
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">{t("header.makePayment")}</span>
          <span className="sm:hidden">{t("header.pos")}</span>
        </Button>
        <LanguageSwitcher />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/30 flex-wrap">
      <div>
        <h1 className="text-lg font-semibold" data-testid="text-page-title">{title}</h1>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
