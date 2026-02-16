import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, FileText, Stethoscope, Pill,
  Receipt, Landmark, TrendingUp, UserCog, Settings,
  Cable, BarChart3, Activity, FlaskConical, CalendarCheck,
  UserRound, DollarSign, Shield, Heart, LogOut, ShoppingBag,
  TestTubes
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
  { i18nKey: "sidebar.dashboard", url: "/", icon: LayoutDashboard, iconColor: "text-blue-500" },
  { i18nKey: "sidebar.makePayment", url: "/billing", icon: FileText, iconColor: "text-amber-500" },
  { i18nKey: "sidebar.opdManagement", url: "/opd", icon: Stethoscope, iconColor: "text-emerald-500" },
  { i18nKey: "sidebar.appointments", url: "/appointments", icon: CalendarCheck, iconColor: "text-violet-500" },
  { i18nKey: "sidebar.services", url: "/services", icon: Activity, iconColor: "text-pink-500" },
  { i18nKey: "sidebar.packages", url: "/packages", icon: ShoppingBag, iconColor: "text-fuchsia-500" },
  { i18nKey: "sidebar.labTests", url: "/lab-tests", icon: FlaskConical, iconColor: "text-cyan-500" },
  { i18nKey: "sidebar.sampleCollections", url: "/sample-collections", icon: TestTubes, iconColor: "text-teal-500" },
  { i18nKey: "sidebar.medicines", url: "/medicines", icon: Pill, iconColor: "text-orange-500" },
  { i18nKey: "sidebar.medicinePurchases", url: "/medicine-purchases", icon: ShoppingBag, iconColor: "text-lime-500" },
  { i18nKey: "sidebar.doctorManagement", url: "/doctors", icon: UserRound, iconColor: "text-teal-500" },
];

const financeItems = [
  { i18nKey: "sidebar.expenses", url: "/expenses", icon: Receipt, iconColor: "text-rose-500" },
  { i18nKey: "sidebar.bankTransactions", url: "/bank", icon: Landmark, iconColor: "text-indigo-500" },
  { i18nKey: "sidebar.investments", url: "/investments", icon: TrendingUp, iconColor: "text-green-500" },
  { i18nKey: "sidebar.salary", url: "/salary", icon: DollarSign, iconColor: "text-yellow-500" },
];

const systemItems = [
  { i18nKey: "sidebar.userAndRole", url: "/staff", icon: UserCog, iconColor: "text-sky-500" },
  { i18nKey: "sidebar.authentication", url: "/authentication", icon: Shield, iconColor: "text-red-500" },
  { i18nKey: "sidebar.integrations", url: "/integrations", icon: Cable, iconColor: "text-purple-500" },
  { i18nKey: "sidebar.reports", url: "/reports", icon: BarChart3, iconColor: "text-lime-500" },
  { i18nKey: "sidebar.settings", url: "/settings", icon: Settings, iconColor: "text-slate-400" },
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
                >
                  <Link href={item.url} data-testid={`link-nav-${item.i18nKey.split('.').pop()}`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                    <span className="text-[13px] font-medium">{title}</span>
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

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

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

  const sidebarAppName = settings?.appName || t("common.appName");
  const sidebarTagline = settings?.appTagline || t("common.appTagline");
  const sidebarLogo = settings?.logo;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-3">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
            {sidebarLogo ? (
              <img
                src={sidebarLogo}
                alt={sidebarAppName}
                className="h-10 w-10 rounded-xl object-cover shadow-lg"
                data-testid="img-sidebar-logo"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 shadow-lg shadow-blue-500/20">
                <Heart className="h-5 w-5 text-white" fill="white" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">{sidebarAppName}</span>
              <span className="text-[10px] text-slate-400 dark:text-blue-300/60 font-medium">{sidebarTagline}</span>
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
