import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Building2 } from "lucide-react";
import type { ClinicSettings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<ClinicSettings>({
    queryKey: ["/api/settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      clinicName: form.get("clinicName"),
      address: form.get("address") || null,
      phone: form.get("phone") || null,
      email: form.get("email") || null,
      currency: form.get("currency") || "USD",
      taxRate: form.get("taxRate") || "0",
      invoicePrefix: form.get("invoicePrefix") || "INV",
      visitPrefix: form.get("visitPrefix") || "VIS",
      patientPrefix: form.get("patientPrefix") || "PAT",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Settings" description="Configure clinic settings" />
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" description="Configure your clinic settings" />
      <div className="flex-1 overflow-auto p-4">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
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
              <CardTitle className="text-sm font-semibold">Billing Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue={settings?.currency || "USD"} data-testid="input-currency" />
                </div>
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input id="taxRate" name="taxRate" type="number" step="0.01" defaultValue={settings?.taxRate || "0"} data-testid="input-tax-rate" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">ID Prefixes</CardTitle>
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

          <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-1" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </div>
    </div>
  );
}
