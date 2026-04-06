import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Key, Shield, Upload } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PatientDashboardProps {
  user: User;
}

export default async function PatientDashboard({ user }: PatientDashboardProps) {
  const { data: myRecords } = await supabaseAdmin
    .from("medical_records")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: totalRecords } = await supabaseAdmin
    .from("medical_records")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", user.id);

  const { data: activeGrants } = await supabaseAdmin
    .from("access_grants")
    .select("*, users!access_grants_granted_to_id_fkey(*)")
    .eq("patient_id", user.id)
    .eq("status", "active");

  const { count: totalGrants } = await supabaseAdmin
    .from("access_grants")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patient Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">My Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords || 0}</div>
            <p className="text-xs text-muted-foreground">Total medical records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Access</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGrants?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Granted permissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.two_factor_enabled ? "On" : "Off"}</div>
            <p className="text-xs text-muted-foreground">2FA Status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Grants</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGrants || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Medical Records</CardTitle>
            <CardDescription>Your latest uploaded documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myRecords && myRecords.length > 0 ? (
                myRecords.map((record) => (
                  <div key={record.id} className="flex items-start gap-3 p-3 hover:bg-accent rounded-lg transition-colors">
                    <FileText className="h-4 w-4 mt-1 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{record.file_name}</p>
                      <p className="text-xs text-muted-foreground">{record.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No records uploaded yet</p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Record
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Access Grants</CardTitle>
            <CardDescription>Doctors and nurses with access to your records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeGrants && activeGrants.length > 0 ? (
                activeGrants.map((grant) => (
                  <div key={grant.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {grant.users?.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{grant.users?.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {grant.users?.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expires: {new Date(grant.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No active access grants</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/grant-access">
                      <Key className="h-4 w-4 mr-2" />
                      Grant Access
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Upload className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Upload Record</CardTitle>
            <CardDescription>Add a new medical document</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/upload">Upload Now</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Key className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Grant Access</CardTitle>
            <CardDescription>Share records with healthcare providers</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/grant-access">Manage Access</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Shield className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/security">Security Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
