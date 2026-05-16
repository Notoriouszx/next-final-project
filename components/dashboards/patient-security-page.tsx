import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Shield } from "lucide-react";

export default function PatientSecurityPage({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security settings</h1>
        <p className="text-muted-foreground">Protect your health account</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-factor authentication
          </CardTitle>
          <CardDescription>
            Status:{" "}
            <span className="font-medium text-foreground">
              {user.two_factor_enabled ? "Enabled" : "Disabled"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/auth/two-factor">Manage 2FA</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
