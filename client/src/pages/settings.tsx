import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Save, AppWindow, Coins, Building2, ScrollText,
  Trash2, Clock, User, ArrowRightLeft, Upload, X, ImageIcon,
} from "lucide-react";
import type { ClinicSettings, ActivityLog } from "@shared/schema";

const tabsList = [
  { id: "metadata", label: "Application Metadata", icon: AppWindow },
  { id: "currency", label: "Currency & Localization", icon: Coins },
  { id: "company", label: "Company Details", icon: Building2 },
  { id: "logs", label: "Activity Logs", icon: ScrollText },
] as const;

type TabId = typeof tabsList[number]["id"];

const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20AC" },
  { code: "GBP", name: "British Pound", symbol: "\u00A3" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5" },
  { code: "KHR", name: "Cambodian Riel", symbol: "\u17DB" },
  { code: "THB", name: "Thai Baht", symbol: "\u0E3F" },
  { code: "VND", name: "Vietnamese Dong", symbol: "\u20AB" },
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "KRW", name: "South Korean Won", symbol: "\u20A9" },
];

const dateFormats = [
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "DD.MM.YYYY",
];

const timezones = [
  "UTC", "Asia/Phnom_Penh", "Asia/Bangkok", "Asia/Ho_Chi_Minh",
  "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("metadata");

  const [primaryCurrency, setPrimaryCurrency] = useState("USD");
  const [secondaryCurrency, setSecondaryCurrency] = useState("none");
  const [currencyDisplay, setCurrencyDisplay] = useState("symbol");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timezone, setTimezone] = useState("UTC");

  const { data: settings, isLoading } = useQuery<ClinicSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: activityLogs = [], isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  useEffect(() => {
    if (settings) {
      setPrimaryCurrency(settings.currency || "USD");
      setSecondaryCurrency(settings.secondaryCurrency || "none");
      setCurrencyDisplay(settings.currencyDisplay || "symbol");
      setDateFormat(settings.dateFormat || "MM/DD/YYYY");
      setTimezone(settings.timezone || "UTC");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/activity-logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({ title: "Activity logs cleared" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function settingsToPayload(s: ClinicSettings | undefined) {
    if (!s) return {};
    const { id, ...rest } = s;
    return rest;
  }

  const handleSaveMetadata = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      ...settingsToPayload(settings),
      appName: form.get("appName") || "ClinicPOS",
      appTagline: form.get("appTagline") || null,
      appVersion: form.get("appVersion") || "1.0.0",
      clinicName: form.get("clinicName") || "My Clinic",
      address: form.get("address") || null,
      phone: form.get("phone") || null,
      email: form.get("email") || null,
      invoicePrefix: form.get("invoicePrefix") || "INV",
      visitPrefix: form.get("visitPrefix") || "VIS",
      patientPrefix: form.get("patientPrefix") || "PAT",
    });
  };

  const handleSaveCurrency = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      ...settingsToPayload(settings),
      currency: primaryCurrency,
      secondaryCurrency: secondaryCurrency === "none" ? null : secondaryCurrency,
      exchangeRate: form.get("exchangeRate") || "1",
      currencyDisplay: currencyDisplay,
      dateFormat: dateFormat,
      timezone: timezone,
      taxRate: form.get("taxRate") || "0",
    });
  };

  const handleSaveCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      ...settingsToPayload(settings),
      companyName: form.get("companyName") || null,
      companyAddress: form.get("companyAddress") || null,
      companyPhone: form.get("companyPhone") || null,
      companyEmail: form.get("companyEmail") || null,
      companyWebsite: form.get("companyWebsite") || null,
      companyTaxId: form.get("companyTaxId") || null,
      receiptFooter: form.get("receiptFooter") || null,
    });
  };

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  }

  function getActionColor(action: string) {
    switch (action) {
      case "create": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "update": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "delete": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1></div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your application settings</p>
      </div>

      <div className="p-6">
        <div className="flex gap-2 border-b mb-6 flex-wrap">
          {tabsList.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "metadata" && (
          <form onSubmit={handleSaveMetadata} className="space-y-4 max-w-2xl">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AppWindow className="h-4 w-4" /> Application Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="appName">Application Name</Label>
                    <Input id="appName" name="appName" defaultValue={settings?.appName || "ClinicPOS"} data-testid="input-app-name" />
                  </div>
                  <div>
                    <Label htmlFor="appVersion">Version</Label>
                    <Input id="appVersion" name="appVersion" defaultValue={settings?.appVersion || "1.0.0"} data-testid="input-app-version" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="appTagline">Tagline</Label>
                  <Input id="appTagline" name="appTagline" placeholder="Your clinic management tagline" defaultValue={settings?.appTagline || ""} data-testid="input-app-tagline" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Clinic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label htmlFor="clinicName">Clinic Name</Label>
                  <Input id="clinicName" name="clinicName" defaultValue={settings?.clinicName || ""} data-testid="input-clinic-name" />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" defaultValue={settings?.address || ""} data-testid="input-clinic-address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={settings?.phone || ""} data-testid="input-clinic-phone" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={settings?.email || ""} data-testid="input-clinic-email" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">ID Prefixes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                    <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings?.invoicePrefix || "INV"} data-testid="input-invoice-prefix" />
                  </div>
                  <div>
                    <Label htmlFor="visitPrefix">Visit Prefix</Label>
                    <Input id="visitPrefix" name="visitPrefix" defaultValue={settings?.visitPrefix || "VIS"} data-testid="input-visit-prefix" />
                  </div>
                  <div>
                    <Label htmlFor="patientPrefix">Patient Prefix</Label>
                    <Input id="patientPrefix" name="patientPrefix" defaultValue={settings?.patientPrefix || "PAT"} data-testid="input-patient-prefix" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-metadata">
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        )}

        {activeTab === "currency" && (
          <form onSubmit={handleSaveCurrency} className="space-y-4 max-w-2xl">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4" /> Dual Currency Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Currency</Label>
                    <Select value={primaryCurrency} onValueChange={setPrimaryCurrency}>
                      <SelectTrigger data-testid="select-primary-currency"><SelectValue placeholder="Select currency" /></SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Main currency for billing and reports</p>
                  </div>
                  <div>
                    <Label>Secondary Currency</Label>
                    <Select value={secondaryCurrency} onValueChange={setSecondaryCurrency}>
                      <SelectTrigger data-testid="select-secondary-currency"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Optional secondary display currency</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="exchangeRate" className="flex items-center gap-1">
                      <ArrowRightLeft className="h-3 w-3" /> Exchange Rate
                    </Label>
                    <Input
                      id="exchangeRate"
                      name="exchangeRate"
                      type="number"
                      step="0.0001"
                      defaultValue={settings?.exchangeRate || "1"}
                      data-testid="input-exchange-rate"
                    />
                    <p className="text-xs text-muted-foreground mt-1">1 primary = X secondary</p>
                  </div>
                  <div>
                    <Label>Display Format</Label>
                    <Select value={currencyDisplay} onValueChange={setCurrencyDisplay}>
                      <SelectTrigger data-testid="select-currency-display"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="symbol">Symbol ($, \u20AC, \u00A3)</SelectItem>
                        <SelectItem value="code">Code (USD, EUR, GBP)</SelectItem>
                        <SelectItem value="both">Both ($ USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Localization</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger data-testid="select-date-format"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {dateFormats.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger data-testid="select-timezone"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input id="taxRate" name="taxRate" type="number" step="0.01" defaultValue={settings?.taxRate || "0"} data-testid="input-tax-rate" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-currency">
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        )}

        {activeTab === "company" && (
          <form onSubmit={handleSaveCompany} className="space-y-4 max-w-2xl">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Company Details for Receipts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label htmlFor="companyName">Company / Business Name</Label>
                  <Input id="companyName" name="companyName" placeholder="Legal business name for receipts" defaultValue={settings?.companyName || ""} data-testid="input-company-name" />
                </div>
                <div>
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Textarea
                    id="companyAddress"
                    name="companyAddress"
                    placeholder="Full address as it appears on receipts"
                    defaultValue={settings?.companyAddress || ""}
                    className="resize-none"
                    rows={3}
                    data-testid="input-company-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="companyPhone">Phone</Label>
                    <Input id="companyPhone" name="companyPhone" defaultValue={settings?.companyPhone || ""} data-testid="input-company-phone" />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input id="companyEmail" name="companyEmail" type="email" defaultValue={settings?.companyEmail || ""} data-testid="input-company-email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input id="companyWebsite" name="companyWebsite" placeholder="https://..." defaultValue={settings?.companyWebsite || ""} data-testid="input-company-website" />
                  </div>
                  <div>
                    <Label htmlFor="companyTaxId">Tax ID / Registration No.</Label>
                    <Input id="companyTaxId" name="companyTaxId" defaultValue={settings?.companyTaxId || ""} data-testid="input-company-tax-id" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="receiptFooter">Receipt Footer Text</Label>
                  <Textarea
                    id="receiptFooter"
                    name="receiptFooter"
                    placeholder="Thank you for visiting! This will appear at the bottom of receipts."
                    defaultValue={settings?.receiptFooter || ""}
                    className="resize-none"
                    rows={2}
                    data-testid="input-receipt-footer"
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-company">
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        )}

        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold" data-testid="text-logs-title">Activity Logs</h2>
                <p className="text-sm text-muted-foreground">Recent system activities and changes</p>
              </div>
              {activityLogs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { if (confirm("Clear all activity logs?")) clearLogsMutation.mutate(); }}
                  disabled={clearLogsMutation.isPending}
                  data-testid="button-clear-logs"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Logs
                </Button>
              )}
            </div>

            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-3 text-left font-medium text-muted-foreground">Time</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Action</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Module</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">User</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                  ) : activityLogs.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No activity logs recorded yet</td></tr>
                  ) : activityLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0" data-testid={`row-log-${log.id}`}>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{formatDate(log.createdAt as any)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`text-xs ${getActionColor(log.action)} no-default-hover-elevate no-default-active-elevate`}>
                          {log.action.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 capitalize">{log.module}</td>
                      <td className="p-3">{log.description}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{log.userName || "System"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
