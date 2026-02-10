import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import OpdPage from "@/pages/opd";
import BillingPage from "@/pages/billing";
import ServicesPage from "@/pages/services";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/opd" component={OpdPage} />
      <Route path="/register-patient" component={RegisterPatientPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/services" component={ServicesPage} />
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
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <main className="flex-1 overflow-hidden">
                <Router />
              </main>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
