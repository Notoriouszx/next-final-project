import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Clock, CircleCheck as CheckCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";

interface DoctorDashboardProps {
  user: User;
}

export default async function DoctorDashboard({ user }: DoctorDashboardProps) {
  const { data: accessGrants } = await supabaseAdmin
    .from("access_grants")
    .select("*, users!access_grants_patient_id_fkey(*)")
    .eq("granted_to_id", user.id)
    .eq("status", "active");

  const { data: pendingRequests } = await supabaseAdmin
    .from("access_grants")
    .select("*, users!access_grants_patient_id_fkey(*)")
    .eq("granted_to_id", user.id)
    .eq("status", "pending");

  const { data: recentRecords } = await supabaseAdmin
    .from("medical_records")
    .select("*, users(*)")
    .in(
      "patient_id",
      accessGrants?.map((g) => g.patient_id) || []
    )
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Dr. {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">My Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessGrants?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active patient access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Records Viewed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentRecords?.length || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Access Requests</CardTitle>
            <CardDescription>Patients requesting your access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests && pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {request.users?.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{request.users?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-yellow-600 font-medium">Pending</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No pending requests</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
            <CardDescription>Recently viewed patient records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecords && recentRecords.length > 0 ? (
                recentRecords.map((record) => (
                  <div key={record.id} className="flex items-start gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                    <FileText className="h-4 w-4 mt-1 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{record.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Patient: {record.users?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent records</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Patients</CardTitle>
          <CardDescription>Patients who granted you access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accessGrants && accessGrants.length > 0 ? (
              accessGrants.map((grant) => (
                <div key={grant.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {grant.users?.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{grant.users?.name}</p>
                      <p className="text-xs text-muted-foreground">{grant.users?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">
                      Expires: {new Date(grant.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No patients yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
