import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Save, AppWindow, Coins, Building2, ScrollText,
  Trash2, Clock, User, ArrowRightLeft, Upload, X, ImageIcon, FileText,
  Globe, Hash,
} from "lucide-react";
import type { ClinicSettings, ActivityLog } from "@shared/schema";

const tabsList = [
  { id: "metadata", label: "Application Metadata", icon: AppWindow },
  { id: "currency", label: "Invoice Settings", icon: Coins },
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
  const [secondaryCurrency, setSecondaryCurrency] = useState("KHR");
  const [dualCurrencyEnabled, setDualCurrencyEnabled] = useState(false);
  const [exchangeRate, setExchangeRate] = useState("4100");
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
      const hasDual = !!settings.secondaryCurrency && settings.secondaryCurrency !== settings.currency;
      setDualCurrencyEnabled(hasDual);
      setSecondaryCurrency(settings.secondaryCurrency || "KHR");
      setExchangeRate(settings.exchangeRate || "4100");
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

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/settings/upload-logo", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({ title: "Logo uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/settings/logo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({ title: "Logo removed" });
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
      secondaryCurrency: dualCurrencyEnabled ? secondaryCurrency : null,
      exchangeRate: exchangeRate || "1",
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
      case "create": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
      case "update": return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20";
      case "delete": return "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20";
      default: return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20";
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Settings" description="Configure your application settings" />
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" description="Configure your application settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-1 border-b mb-6 flex-wrap">
          {tabsList.map(tab => {
            const iconColors: Record<string, string> = {
              metadata: "text-blue-500",
              currency: "text-amber-500",
              company: "text-emerald-500",
              logs: "text-violet-500",
            };
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors rounded-t-md ${
                  activeTab === tab.id
                    ? "border-primary text-foreground bg-muted/50"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {activeTab === tab.id ? (
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${
                    tab.id === "metadata" ? "from-blue-500 to-blue-600" :
                    tab.id === "currency" ? "from-amber-500 to-amber-600" :
                    tab.id === "company" ? "from-emerald-500 to-emerald-600" :
                    "from-violet-500 to-violet-600"
                  }`}>
                    <tab.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                ) : (
                  <tab.icon className="h-4 w-4" />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "metadata" && (
          <form onSubmit={handleSaveMetadata} className="space-y-4 max-w-2xl">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600">
                    <AppWindow className="h-3.5 w-3.5 text-white" />
                  </div>
                  Application Info
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600">
                    <Building2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  Clinic Information
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
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-violet-600">
                    <Hash className="h-3.5 w-3.5 text-white" />
                  </div>
                  ID Prefixes
                </CardTitle>
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

            <Button type="submit" className="bg-blue-600 text-white" disabled={updateMutation.isPending} data-testid="button-save-metadata">
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        )}

        {activeTab === "currency" && (() => {
          const pCur = currencies.find(c => c.code === primaryCurrency);
          const sCur = currencies.find(c => c.code === secondaryCurrency);
          const pSym = pCur?.symbol || "$";
          const sSym = sCur?.symbol || "៛";
          const rate = Number(exchangeRate) || 1;
          const pDecimals = ["JPY", "KRW", "VND", "KHR"].includes(primaryCurrency) ? 0 : 2;
          const sDecimals = ["JPY", "KRW", "VND", "KHR"].includes(secondaryCurrency) ? 0 : 2;
          const sampleItems = [
            { desc: "Consultation Fee", amount: 50 },
            { desc: "Lab Test - Blood Work", amount: 75 },
            { desc: "Medication", amount: 25 },
          ];
          const sampleTotal = sampleItems.reduce((s, i) => s + i.amount, 0);
          const commonPairs = [
            { p: "USD", s: "KHR" }, { p: "USD", s: "BDT" }, { p: "USD", s: "INR" },
            { p: "BDT", s: "USD" }, { p: "KHR", s: "USD" },
          ];
          return (
          <form onSubmit={handleSaveCurrency} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-[1fr,auto] gap-4 items-start">
              <div>
                <Label className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-amber-500" /> Primary Currency</Label>
                <Select value={primaryCurrency} onValueChange={setPrimaryCurrency}>
                  <SelectTrigger data-testid="select-primary-currency"><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.name} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="taxRate" className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-emerald-500" /> Tax Rate (%)</Label>
                <Input id="taxRate" name="taxRate" type="number" step="0.01" defaultValue={settings?.taxRate || "0"} data-testid="input-tax-rate" />
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" /> Enable Dual Currency</p>
                    <p className="text-xs text-muted-foreground">Show amounts in both primary and secondary currencies on invoices</p>
                  </div>
                  <Switch
                    checked={dualCurrencyEnabled}
                    onCheckedChange={setDualCurrencyEnabled}
                    data-testid="switch-dual-currency"
                  />
                </div>

                {dualCurrencyEnabled && (
                  <div className="mt-4 space-y-4">
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Secondary Currency</Label>
                        <Select value={secondaryCurrency} onValueChange={setSecondaryCurrency}>
                          <SelectTrigger data-testid="select-secondary-currency"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {currencies.filter(c => c.code !== primaryCurrency).map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.code} - {c.name} ({c.symbol})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Exchange Rate (1 {primaryCurrency} = ? {secondaryCurrency})</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          data-testid="input-exchange-rate"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Example: {pSym}100 {primaryCurrency} = {(100 * rate).toLocaleString()} {secondaryCurrency}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Common Currency Pairs</p>
                      <div className="flex gap-2 flex-wrap">
                        {commonPairs.map(pair => (
                          <Button
                            key={`${pair.p}/${pair.s}`}
                            type="button"
                            variant={primaryCurrency === pair.p && secondaryCurrency === pair.s ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setPrimaryCurrency(pair.p);
                              setSecondaryCurrency(pair.s);
                            }}
                            data-testid={`button-pair-${pair.p}-${pair.s}`}
                          >
                            {pair.p} / {pair.s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {dualCurrencyEnabled && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoice Preview</p>
                <div className="border rounded-md overflow-hidden bg-white dark:bg-card">
                  <div className="bg-slate-800 dark:bg-slate-900 text-white p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-sm">{settings?.clinicName || "Prime Clinic"}</p>
                      {settings?.address && <p className="text-[10px] text-slate-300">{settings.address}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-sm tracking-wide">INVOICE</p>
                      <p className="text-[10px] text-slate-300">{settings?.invoicePrefix || "INV"}-1001</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="grid grid-cols-[1fr,auto,auto] border-b bg-muted/30">
                      <span className="p-2.5 font-semibold text-xs">Description</span>
                      <span className="p-2.5 font-semibold text-xs text-right w-28">{primaryCurrency}</span>
                      <span className="p-2.5 font-semibold text-xs text-right w-32">{secondaryCurrency}</span>
                    </div>
                    {sampleItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr,auto,auto] border-b">
                        <span className="p-2.5 text-xs">{item.desc}</span>
                        <span className="p-2.5 text-xs text-right w-28">{item.amount.toFixed(pDecimals)}</span>
                        <span className="p-2.5 text-xs text-right w-32">{(item.amount * rate).toLocaleString(undefined, { minimumFractionDigits: sDecimals, maximumFractionDigits: sDecimals })}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-[1fr,auto,auto] border-b">
                      <span className="p-2.5 text-xs font-semibold">Subtotal</span>
                      <span className="p-2.5 text-xs text-right font-semibold w-28">{sampleTotal.toFixed(pDecimals)}</span>
                      <span className="p-2.5 text-xs text-right font-semibold w-32">{(sampleTotal * rate).toLocaleString(undefined, { minimumFractionDigits: sDecimals, maximumFractionDigits: sDecimals })}</span>
                    </div>
                    <div className="grid grid-cols-[1fr,auto,auto] bg-slate-800 dark:bg-slate-900 text-white">
                      <span className="p-2.5 text-xs font-bold">TOTAL</span>
                      <span className="p-2.5 text-xs text-right font-bold w-28">{primaryCurrency} {sampleTotal.toFixed(pDecimals)}</span>
                      <span className="p-2.5 text-xs text-right font-bold w-32">{secondaryCurrency} {(sampleTotal * rate).toLocaleString(undefined, { minimumFractionDigits: sDecimals, maximumFractionDigits: sDecimals })}</span>
                    </div>
                  </div>

                  <p className="text-center text-[10px] text-muted-foreground py-2">
                    Exchange Rate: 1 {primaryCurrency} = {Number(exchangeRate).toLocaleString()} {secondaryCurrency}
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" className="bg-amber-600 text-white" disabled={updateMutation.isPending} data-testid="button-save-currency">
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
          );
        })()}

        {activeTab === "company" && (
          <form onSubmit={handleSaveCompany} className="space-y-4 max-w-2xl">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600">
                    <Building2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  Company Details for Receipts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4 mt-1">
                    {settings?.logo ? (
                      <div className="relative">
                        <img
                          src={settings.logo}
                          alt="Company logo"
                          className="h-20 w-20 rounded-md border object-contain bg-white"
                          data-testid="img-company-logo"
                        />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                          onClick={() => removeLogoMutation.mutate()}
                          disabled={removeLogoMutation.isPending}
                          data-testid="button-remove-logo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                        data-testid="input-logo-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        data-testid="button-upload-logo"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {logoUploading ? "Uploading..." : settings?.logo ? "Change Logo" : "Upload Logo"}
                      </Button>
                      <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP or SVG. Max 5MB.</p>
                    </div>
                  </div>
                </div>
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

            <Button type="submit" className="bg-emerald-600 text-white" disabled={updateMutation.isPending} data-testid="button-save-company">
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        )}

        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-logs-title"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-violet-600">
                    <ScrollText className="h-4 w-4 text-white" />
                  </div> Activity Logs</h2>
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
                        <Badge variant="outline" className={`text-xs ${getActionColor(log.action)} no-default-hover-elevate no-default-active-elevate`}>
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
