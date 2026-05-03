import { User } from "@/lib/types";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText } from "lucide-react";

export default async function DoctorRecordsPage({ user }: { user: User }) {
  const now = new Date();
  const grants = await prisma.accessGrant.findMany({
    where: { doctorId: user.id, status: "active", expiresAt: { gt: now } },
    select: { patientId: true },
  });
  const patientIds = [...new Set(grants.map((g) => g.patientId))];
  const records =
    patientIds.length === 0
      ? []
      : await prisma.medicalRecord.findMany({
          where: { patientId: { in: patientIds } },
          orderBy: { createdAt: "desc" },
          take: 80,
          include: { patient: { select: { name: true } } },
        });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medical records</h1>
        <p className="text-muted-foreground">Documents for patients you can access</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Records
          </CardTitle>
          <CardDescription>{records.length} recent files</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records visible yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patient.name}</TableCell>
                    <TableCell>{r.fileName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.fileType ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.createdAt.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
