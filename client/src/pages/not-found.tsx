import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/i18n";
import { useLocation } from "wouter";

export default function NotFound() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-404-title">{t("notFound.title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("notFound.message")}</p>
          <Button className="mt-6" onClick={() => navigate("/")} data-testid="button-go-home">
            {t("notFound.goHome")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
