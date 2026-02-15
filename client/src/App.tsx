import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient, apiRequest, safeJsonRes, API_NOT_REACHABLE_MSG } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DocumentHeadFromSettings } from "@/components/document-head-from-settings";
import { ThemeProvider } from "@/components/theme-provider";
import { LayoutHeader } from "@/components/page-header";
import { I18nProvider } from "@/i18n";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import OpdPage from "@/pages/opd";
import BillingPage from "@/pages/billing";
import ServicesPage from "@/pages/services";
import PackagesPage from "@/pages/packages";
import MedicinesPage from "@/pages/medicines";
import ExpensesPage from "@/pages/expenses";
import BankTransactionsPage from "@/pages/bank-transactions";
import InvestmentsPage from "@/pages/investments";
import StaffPage from "@/pages/staff";
import IntegrationsPage from "@/pages/integrations";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import LabTestsPage from "@/pages/lab-tests";
import RegisterPatientPage from "@/pages/register-patient";
import AppointmentsPage from "@/pages/appointments";
import DoctorManagementPage from "@/pages/doctor-management";
import SalaryPage from "@/pages/salary";
import AuthenticationPage from "@/pages/authentication";
import SignInPage from "@/pages/sign-in";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/opd" component={OpdPage} />
      <Route path="/register-patient" component={RegisterPatientPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/packages" component={PackagesPage} />
      <Route path="/lab-tests" component={LabTestsPage} />
      <Route path="/medicines" component={MedicinesPage} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route path="/bank" component={BankTransactionsPage} />
      <Route path="/investments" component={InvestmentsPage} />
      <Route path="/staff" component={StaffPage} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/appointments" component={AppointmentsPage} />
      <Route path="/doctors" component={DoctorManagementPage} />
      <Route path="/salary" component={SalaryPage} />
      <Route path="/authentication" component={AuthenticationPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return safeJsonRes(res);
      })
      .then((user) => {
        setCurrentUser(user);
        localStorage.setItem("clinicpos_user", JSON.stringify(user));
        setAuthChecked(true);
      })
      .catch(async (err: Error) => {
        if (err?.message === API_NOT_REACHABLE_MSG) {
          console.error(API_NOT_REACHABLE_MSG);
        }
        const stored = localStorage.getItem("clinicpos_user");
        let restored: any = null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed.id === "number" && parsed.username) {
              restored = parsed;
            }
          } catch {}
        }
        if (restored) {
          setCurrentUser(restored);
          setAuthChecked(true);
          try {
            const recheck = await fetch("/api/auth/me", { credentials: "include" });
            if (!recheck.ok) {
              setCurrentUser(null);
              localStorage.removeItem("clinicpos_user");
              queryClient.clear();
            } else {
              const user = await safeJsonRes(recheck);
              setCurrentUser(user);
              localStorage.setItem("clinicpos_user", JSON.stringify(user));
            }
          } catch {
            // Network or HTML response: keep restored user; next API call will fail if API unreachable
          }
        } else {
          setCurrentUser(null);
          localStorage.removeItem("clinicpos_user");
          setAuthChecked(true);
        }
      });

    const onLogout = () => {
      apiRequest("POST", "/api/auth/logout")
        .catch(() => {})
        .finally(() => {
          setCurrentUser(null);
          localStorage.removeItem("clinicpos_user");
          queryClient.clear();
        });
    };
    const onForceLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem("clinicpos_user");
      queryClient.clear();
    };
    window.addEventListener("clinicpos_logout", onLogout);
    window.addEventListener("clinicpos_logout_redirect", onForceLogout);
    return () => {
      window.removeEventListener("clinicpos_logout", onLogout);
      window.removeEventListener("clinicpos_logout_redirect", onForceLogout);
    };
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem("clinicpos_user", JSON.stringify(user));
    // Refetch all data with the new session cookie (avoids stale 401 cache)
    queryClient.invalidateQueries();
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (!authChecked) {
    return (
      <ThemeProvider>
        <I18nProvider>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        </I18nProvider>
      </ThemeProvider>
    );
  }

  if (!currentUser) {
    return (
      <ThemeProvider>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <SignInPage onLogin={handleLogin} />
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </I18nProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SidebarProvider style={sidebarStyle as React.CSSProperties}>
              <DocumentHeadFromSettings />
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <LayoutHeader />
                  <main className="flex-1 overflow-hidden">
                    <Router />
                  </main>
                </div>
              </div>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
