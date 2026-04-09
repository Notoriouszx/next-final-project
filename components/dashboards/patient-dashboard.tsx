import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FileText, Key, Shield, Upload } from "lucide-react";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface PatientDashboardProps {
  user: User;
}

export default async function PatientDashboard({ user }: PatientDashboardProps) {
  const [myRecords, totalRecords, activeGrants, totalGrants] = await Promise.all([
    prisma.medicalRecord.findMany({
      where: { patientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.medicalRecord.count({ where: { patientId: user.id } }),
    prisma.accessGrant.findMany({
      where: { patientId: user.id, status: "active" },
      include: { doctor: true, nurse: true },
    }),
    prisma.accessGrant.count({ where: { patientId: user.id } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patient Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">Total medical records</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Access</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGrants.length}</div>
            <p className="text-xs text-muted-foreground">Granted permissions</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.two_factor_enabled ? "On" : "Off"}
            </div>
            <p className="text-xs text-muted-foreground">2FA Status</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grants</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGrants}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Medical Records</CardTitle>
            <CardDescription>Your latest uploaded documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myRecords.length > 0 ? (
                myRecords.map(
                  (record: {
                    id: string;
                    fileName: string | null;
                    description: string | null;
                    createdAt: Date;
                  }) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                  >
                    <FileText className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {record.fileName ?? "Record"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.description ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  )
                )
              ) : (
                <div className="py-6 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-sm text-muted-foreground">
                    No records uploaded yet
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/upload">
                      <Upload className="me-2 h-4 w-4" />
                      Upload your first record
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Active Access Grants</CardTitle>
            <CardDescription>
              Doctors and nurses with access to your records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeGrants.length > 0 ? (
                activeGrants.map((grant: {
                  id: string;
                  doctorId: string | null;
                  expiresAt: Date;
                  doctor: { name: string } | null;
                  nurse: { name: string } | null;
                }) => {
                  const provider = grant.doctor ?? grant.nurse;
                  return (
                    <div
                      key={grant.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium">
                            {provider?.name.charAt(0).toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{provider?.name}</p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {grant.doctorId ? "doctor" : "nurse"}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires: {grant.expiresAt.toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center">
                  <Key className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-sm text-muted-foreground">
                    No active access grants
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/grant-access">
                      <Key className="me-2 h-4 w-4" />
                      Grant access
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer border-primary/10 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <Upload className="mb-2 h-10 w-10 text-primary" />
            <CardTitle>Upload record</CardTitle>
            <CardDescription>Add a new medical document</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/upload">Upload now</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-primary/10 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <Key className="mb-2 h-10 w-10 text-primary" />
            <CardTitle>Grant access</CardTitle>
            <CardDescription>Share records with providers</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/grant-access">Manage access</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-primary/10 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <Shield className="mb-2 h-10 w-10 text-primary" />
            <CardTitle>Security</CardTitle>
            <CardDescription>2FA and session safety</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/dashboard/security">Security settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
