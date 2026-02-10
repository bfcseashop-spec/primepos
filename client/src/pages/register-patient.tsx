import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Upload, Camera, Link as LinkIcon, UserCircle, User, Phone, Heart, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

export default function RegisterPatientPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    address: "",
    city: "",
    patientType: "Out Patient",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalHistory: "",
    allergies: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/patients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Patient registered successfully" });
      navigate("/opd");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/patients/upload-photo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPhotoUrl(data.photoUrl);
      setPhotoPreview(data.photoUrl);
    } catch {
      toast({ title: "Photo upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
      handlePhotoUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
      handlePhotoUpload(file);
    }
  };

  const handleUseUrl = () => {
    if (imageUrlInput.trim()) {
      setPhotoUrl(imageUrlInput.trim());
      setPhotoPreview(imageUrlInput.trim());
    }
  };

  const handleSubmit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: "First Name and Last Name are required", variant: "destructive" });
      return;
    }
    if (!form.phone.trim()) {
      toast({ title: "Phone Number is required", variant: "destructive" });
      return;
    }

    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    createMutation.mutate({
      patientId: `PAT-${String(Date.now()).slice(-6)}`,
      name,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email || null,
      phone: form.phone || null,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      bloodGroup: form.bloodGroup || null,
      address: form.address || null,
      city: form.city || null,
      patientType: form.patientType || "Out Patient",
      photoUrl: photoUrl || null,
      emergencyContactName: form.emergencyContactName || null,
      emergencyContactPhone: form.emergencyContactPhone || null,
      medicalHistory: form.medicalHistory || null,
      allergies: form.allergies || null,
    });
  };

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Add Patient"
        description="Register a new patient"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/opd")} data-testid="button-back-patients">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Patients
          </Button>
        }
      />

      <div className="flex-1 overflow-auto px-6 pb-6 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold border-b pb-2 mb-4 flex items-center gap-2" data-testid="text-section-personal"><User className="h-4 w-4 text-blue-500" /> Personal Information</h2>

            <div className="flex flex-col items-center mb-6">
              <div
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 overflow-hidden"
                data-testid="avatar-patient-photo"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Patient" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="h-12 w-12 text-primary" />
                )}
              </div>

              <div
                className="border-2 border-dashed border-blue-400/40 dark:border-blue-500/30 rounded-md p-4 text-center cursor-pointer w-full max-w-xs hover:border-blue-500/60 dark:hover:border-blue-400/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-photo"
              >
                <p className="text-xs text-muted-foreground mb-1">Drag and drop a photo here, or click to browse</p>
                <Button variant="outline" size="sm" type="button" disabled={uploading}>
                  <Upload className="h-3 w-3 mr-1" /> {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-photo-file"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF (Max 5MB). Drag and drop or click to upload.</p>

              <Button variant="outline" size="sm" className="mt-2" type="button" data-testid="button-take-photo">
                <Camera className="h-3 w-3 mr-1" /> Take Photo
              </Button>

              <div className="mt-3 w-full max-w-lg">
                <Label className="text-xs text-muted-foreground">Or paste image URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="https://..."
                    value={imageUrlInput}
                    onChange={e => setImageUrlInput(e.target.value)}
                    className="flex-1"
                    data-testid="input-image-url"
                  />
                  <Button variant="outline" size="sm" onClick={handleUseUrl} type="button" data-testid="button-use-url">
                    <LinkIcon className="h-3 w-3 mr-1" /> Use URL
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" placeholder="Enter first name" value={form.firstName} onChange={e => update("firstName", e.target.value)} data-testid="input-first-name" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" placeholder="Enter last name" value={form.lastName} onChange={e => update("lastName", e.target.value)} data-testid="input-last-name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="patient@email.com" value={form.email} onChange={e => update("email", e.target.value)} data-testid="input-email" />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" placeholder="+855 XX XXX XXX" value={form.phone} onChange={e => update("phone", e.target.value)} data-testid="input-phone" />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={form.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} data-testid="input-dob" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => update("gender", v)}>
                  <SelectTrigger data-testid="select-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blood Type</Label>
                <Select value={form.bloodGroup} onValueChange={v => update("bloodGroup", v)}>
                  <SelectTrigger data-testid="select-blood-type"><SelectValue placeholder="Select blood type" /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Street address" value={form.address} onChange={e => update("address", e.target.value)} data-testid="input-address" />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="City" value={form.city} onChange={e => update("city", e.target.value)} data-testid="input-city" />
              </div>
            </div>

            <div className="mt-4">
              <Label>Patient Type</Label>
              <Select value={form.patientType} onValueChange={v => update("patientType", v)}>
                <SelectTrigger data-testid="select-patient-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Out Patient">Out Patient</SelectItem>
                  <SelectItem value="In Patient">In Patient</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold border-b pb-2 mb-4 flex items-center gap-2" data-testid="text-section-emergency"><AlertTriangle className="h-4 w-4 text-amber-500" /> Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyName">Contact Name</Label>
                <Input id="emergencyName" placeholder="Emergency contact name" value={form.emergencyContactName} onChange={e => update("emergencyContactName", e.target.value)} data-testid="input-emergency-name" />
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Contact Phone</Label>
                <Input id="emergencyPhone" placeholder="+855 XX XXX XXX" value={form.emergencyContactPhone} onChange={e => update("emergencyContactPhone", e.target.value)} data-testid="input-emergency-phone" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold border-b pb-2 mb-4 flex items-center gap-2" data-testid="text-section-medical"><Heart className="h-4 w-4 text-violet-500" /> Medical Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="medicalHistory">Medical History</Label>
                <Textarea id="medicalHistory" placeholder="Previous conditions, surgeries, ongoing treatments..." rows={3} value={form.medicalHistory} onChange={e => update("medicalHistory", e.target.value)} data-testid="input-medical-history" />
              </div>
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea id="allergies" placeholder="Known allergies to medications, foods, etc..." rows={3} value={form.allergies} onChange={e => update("allergies", e.target.value)} data-testid="input-allergies" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-4">
          <Button variant="outline" onClick={() => navigate("/opd")} data-testid="button-cancel">Cancel</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-register-patient">
            <UserCircle className="h-4 w-4 mr-1" />
            {createMutation.isPending ? "Registering..." : "Register Patient"}
          </Button>
        </div>
      </div>
    </div>
  );
}
