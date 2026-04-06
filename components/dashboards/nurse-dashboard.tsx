import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Activity } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";

interface NurseDashboardProps {
  user: User;
}

export default async function NurseDashboard({ user }: NurseDashboardProps) {
  const { data: assignedPatients } = await supabaseAdmin
    .from("access_grants")
    .select("*, users!access_grants_patient_id_fkey(*)")
    .eq("granted_to_id", user.id)
    .eq("status", "active");

  const { data: recentActivity } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nurse Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Assigned Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedPatients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Activities Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivity?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Recent actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Records Access</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedPatients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Available records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Patients</CardTitle>
          <CardDescription>Patients under your care</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignedPatients && assignedPatients.length > 0 ? (
              assignedPatients.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {assignment.users?.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{assignment.users?.name}</p>
                      <p className="text-xs text-muted-foreground">{assignment.users?.email}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Access until: {new Date(assignment.expires_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No assigned patients</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border-l-2 border-primary/20">
                  <Activity className="h-4 w-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
