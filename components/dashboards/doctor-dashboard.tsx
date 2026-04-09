import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Users,
  FileText,
  Clock,
  CircleCheck as CheckCircle,
} from "lucide-react";
import prisma from "@/lib/prisma";

interface DoctorDashboardProps {
  user: User;
}

export default async function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [accessGrants, pendingRequests, patientIds] = await Promise.all([
    prisma.accessGrant.findMany({
      where: { doctorId: user.id, status: "active" },
      include: { patient: true },
    }),
    prisma.accessGrant.findMany({
      where: { doctorId: user.id, status: "pending" },
      include: { patient: true },
    }),
    prisma.accessGrant
      .findMany({
        where: { doctorId: user.id, status: "active" },
        select: { patientId: true },
      })
      .then(
        (rows: { patientId: string }[]) => rows.map((r: { patientId: string }) => r.patientId)
      ),
  ]);

  const recentRecords =
    patientIds.length === 0
      ? []
      : await prisma.medicalRecord.findMany({
          where: { patientId: { in: patientIds } },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { patient: true },
        });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Dr. {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessGrants.length}</div>
            <p className="text-xs text-muted-foreground">Active patient access</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Viewed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentRecords.length}</div>
            <p className="text-xs text-muted-foreground">Recent in your network</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Pending Access Requests</CardTitle>
            <CardDescription>Patients requesting your access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map(
                  (request: {
                    id: string;
                    createdAt: Date;
                    patient: { name: string };
                  }) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium">
                          {request.patient.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{request.patient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-amber-600">Pending</div>
                  </div>
                  )
                )
              ) : (
                <p className="text-sm text-muted-foreground">No pending requests</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
            <CardDescription>Recently updated patient records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecords.length > 0 ? (
                recentRecords.map(
                  (record: {
                    id: string;
                    fileName: string | null;
                    createdAt: Date;
                    patient: { name: string };
                  }) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                  >
                    <FileText className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {record.fileName ?? "Medical record"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Patient: {record.patient.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  )
                )
              ) : (
                <p className="text-sm text-muted-foreground">No recent records</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>My Patients</CardTitle>
          <CardDescription>Patients who granted you access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accessGrants.length > 0 ? (
              accessGrants.map(
                (grant: {
                  id: string;
                  expiresAt: Date;
                  patient: { name: string; email: string };
                }) => (
                <div
                  key={grant.id}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium">
                        {grant.patient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{grant.patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {grant.patient.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">
                      Expires: {grant.expiresAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
                )
              )
            ) : (
              <p className="text-sm text-muted-foreground">No patients yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
