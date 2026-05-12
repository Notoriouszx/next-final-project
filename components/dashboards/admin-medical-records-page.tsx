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

export default async function AdminMedicalRecordsPage() {
  const records = await prisma.medicalRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      patient: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medical records</h1>
        <p className="text-muted-foreground">Cross-patient record index (admin)</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All records</CardTitle>
          <CardDescription>Latest {records.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.patient.name}</div>
                    <div className="text-muted-foreground text-xs">{r.patient.email}</div>
                  </TableCell>
                  <TableCell>{r.fileName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.fileType ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.fileSize != null ? `${(r.fileSize / 1024).toFixed(1)} KB` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{r.createdAt.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
