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

export default async function DoctorMyPatientsPage({ user }: { user: User }) {
  const now = new Date();
  const grants = await prisma.accessGrant.findMany({
    where: { doctorId: user.id, status: "active", expiresAt: { gt: now } },
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My patients</h1>
        <p className="text-muted-foreground">Patients who granted you active access</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active access</CardTitle>
          <CardDescription>{grants.length} patients</CardDescription>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active patients yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.patient.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {g.patient.email}
                    </TableCell>
                    <TableCell className="text-sm">{g.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{g.expiresAt.toLocaleDateString()}</TableCell>
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
