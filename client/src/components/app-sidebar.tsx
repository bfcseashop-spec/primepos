import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, FileText, Stethoscope, Pill,
  Receipt, Landmark, TrendingUp, UserCog, Settings,
  Cable, BarChart3, Activity, FlaskConical, CalendarCheck,
  UserRound, DollarSign, Shield, Heart, LogOut, ChevronRight
} from "lucide-react";
import { useTranslation } from "@/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const mainItems = [
  { i18nKey: "sidebar.dashboard", url: "/", icon: LayoutDashboard, gradient: "from-blue-500 to-cyan-400", boxBg: "bg-blue-50 dark:bg-blue-500/10", boxBorder: "border-blue-200 dark:border-blue-500/20", textColor: "text-blue-700 dark:text-blue-300" },
  { i18nKey: "sidebar.makePayment", url: "/billing", icon: FileText, gradient: "from-amber-500 to-orange-400", boxBg: "bg-amber-50 dark:bg-amber-500/10", boxBorder: "border-amber-200 dark:border-amber-500/20", textColor: "text-amber-700 dark:text-amber-300" },
  { i18nKey: "sidebar.opdManagement", url: "/opd", icon: Stethoscope, gradient: "from-emerald-500 to-teal-400", boxBg: "bg-emerald-50 dark:bg-emerald-500/10", boxBorder: "border-emerald-200 dark:border-emerald-500/20", textColor: "text-emerald-700 dark:text-emerald-300" },
  { i18nKey: "sidebar.appointments", url: "/appointments", icon: CalendarCheck, gradient: "from-violet-500 to-purple-400", boxBg: "bg-violet-50 dark:bg-violet-500/10", boxBorder: "border-violet-200 dark:border-violet-500/20", textColor: "text-violet-700 dark:text-violet-300" },
  { i18nKey: "sidebar.services", url: "/services", icon: Activity, gradient: "from-pink-500 to-rose-400", boxBg: "bg-pink-50 dark:bg-pink-500/10", boxBorder: "border-pink-200 dark:border-pink-500/20", textColor: "text-pink-700 dark:text-pink-300" },
  { i18nKey: "sidebar.labTests", url: "/lab-tests", icon: FlaskConical, gradient: "from-cyan-500 to-sky-400", boxBg: "bg-cyan-50 dark:bg-cyan-500/10", boxBorder: "border-cyan-200 dark:border-cyan-500/20", textColor: "text-cyan-700 dark:text-cyan-300" },
  { i18nKey: "sidebar.medicines", url: "/medicines", icon: Pill, gradient: "from-orange-500 to-amber-400", boxBg: "bg-orange-50 dark:bg-orange-500/10", boxBorder: "border-orange-200 dark:border-orange-500/20", textColor: "text-orange-700 dark:text-orange-300" },
  { i18nKey: "sidebar.doctorManagement", url: "/doctors", icon: UserRound, gradient: "from-teal-500 to-emerald-400", boxBg: "bg-teal-50 dark:bg-teal-500/10", boxBorder: "border-teal-200 dark:border-teal-500/20", textColor: "text-teal-700 dark:text-teal-300" },
];

const financeItems = [
  { i18nKey: "sidebar.expenses", url: "/expenses", icon: Receipt, gradient: "from-rose-500 to-pink-400", boxBg: "bg-rose-50 dark:bg-rose-500/10", boxBorder: "border-rose-200 dark:border-rose-500/20", textColor: "text-rose-700 dark:text-rose-300" },
  { i18nKey: "sidebar.bankTransactions", url: "/bank", icon: Landmark, gradient: "from-indigo-500 to-blue-400", boxBg: "bg-indigo-50 dark:bg-indigo-500/10", boxBorder: "border-indigo-200 dark:border-indigo-500/20", textColor: "text-indigo-700 dark:text-indigo-300" },
  { i18nKey: "sidebar.investments", url: "/investments", icon: TrendingUp, gradient: "from-green-500 to-emerald-400", boxBg: "bg-green-50 dark:bg-green-500/10", boxBorder: "border-green-200 dark:border-green-500/20", textColor: "text-green-700 dark:text-green-300" },
  { i18nKey: "sidebar.salary", url: "/salary", icon: DollarSign, gradient: "from-yellow-500 to-amber-400", boxBg: "bg-yellow-50 dark:bg-yellow-500/10", boxBorder: "border-yellow-200 dark:border-yellow-500/20", textColor: "text-yellow-700 dark:text-yellow-300" },
];

const systemItems = [
  { i18nKey: "sidebar.userAndRole", url: "/staff", icon: UserCog, gradient: "from-sky-500 to-cyan-400", boxBg: "bg-sky-50 dark:bg-sky-500/10", boxBorder: "border-sky-200 dark:border-sky-500/20", textColor: "text-sky-700 dark:text-sky-300" },
  { i18nKey: "sidebar.authentication", url: "/authentication", icon: Shield, gradient: "from-red-500 to-rose-400", boxBg: "bg-red-50 dark:bg-red-500/10", boxBorder: "border-red-200 dark:border-red-500/20", textColor: "text-red-700 dark:text-red-300" },
  { i18nKey: "sidebar.integrations", url: "/integrations", icon: Cable, gradient: "from-purple-500 to-violet-400", boxBg: "bg-purple-50 dark:bg-purple-500/10", boxBorder: "border-purple-200 dark:border-purple-500/20", textColor: "text-purple-700 dark:text-purple-300" },
  { i18nKey: "sidebar.reports", url: "/reports", icon: BarChart3, gradient: "from-lime-500 to-green-400", boxBg: "bg-lime-50 dark:bg-lime-500/10", boxBorder: "border-lime-200 dark:border-lime-500/20", textColor: "text-lime-700 dark:text-lime-300" },
  { i18nKey: "sidebar.settings", url: "/settings", icon: Settings, gradient: "from-slate-400 to-zinc-400", boxBg: "bg-slate-50 dark:bg-slate-500/10", boxBorder: "border-slate-200 dark:border-slate-500/20", textColor: "text-slate-700 dark:text-slate-300" },
];

function NavGroup({ label, items, isActive }: { label: string; items: typeof mainItems; isActive: (url: string) => boolean }) {
  const { t } = useTranslation();
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-3 mb-1">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url);
            const title = t(item.i18nKey);
            return (
              <SidebarMenuItem key={item.i18nKey}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={`rounded-md border ${item.boxBg} ${item.boxBorder}`}
                >
                  <Link href={item.url} data-testid={`link-nav-${item.i18nKey.split('.').pop()}`}>
                    <span className={`inline-flex items-center justify-center rounded-md p-1 bg-gradient-to-br ${item.gradient} shadow-sm`}>
                      <item.icon className="h-3.5 w-3.5 text-white" />
                    </span>
                    <span className={`text-[13px] font-bold ${item.textColor}`}>{title}</span>
                    {active && (
                      <ChevronRight className={`ml-auto h-3.5 w-3.5 ${item.textColor} opacity-60`} />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("clinicpos_user");
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const handleLogout = () => {
    window.dispatchEvent(new Event("clinicpos_logout"));
  };

  const userInitials = currentUser?.fullName
    ? currentUser.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-3">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 shadow-lg shadow-blue-500/20">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">{t("common.appName")}</span>
              <span className="text-[10px] text-slate-400 dark:text-blue-300/60 font-medium">{t("common.appTagline")}</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <div className="px-4 pb-2">
        <Separator className="bg-slate-200 dark:bg-white/[0.06]" />
      </div>

      <SidebarContent className="px-1">
        <NavGroup label={t("sidebar.main")} items={mainItems} isActive={isActive} />
        <NavGroup label={t("sidebar.finance")} items={financeItems} isActive={isActive} />
        <NavGroup label={t("sidebar.system")} items={systemItems} isActive={isActive} />
      </SidebarContent>

      <div className="px-4 pt-1">
        <Separator className="bg-slate-200 dark:bg-white/[0.06]" />
      </div>

      <SidebarFooter className="p-3">
        {currentUser && (
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] px-2.5 py-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate">{currentUser.email || currentUser.username}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLogout}
              className="shrink-0 text-slate-400"
              data-testid="button-sidebar-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {!currentUser && (
          <div className="text-[10px] text-slate-400 text-center font-medium">
            {t("common.appName")} {t("common.version")}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
