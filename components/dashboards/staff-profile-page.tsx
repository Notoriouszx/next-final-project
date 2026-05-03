import type { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleBadgeVariant } from "@/lib/role-badge";

export default function StaffProfilePage({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Your staff identity on MediCare</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
              {user.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            2FA: {user.two_factor_enabled ? "enabled" : "disabled"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
