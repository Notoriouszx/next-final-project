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
import { ExternalLink } from "lucide-react";

export default async function PatientMyRecordsPage({ user }: { user: User }) {
  const records = await prisma.medicalRecord.findMany({
    where: { patientId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Records</h1>
        <p className="text-muted-foreground">All documents you have uploaded</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Medical records</CardTitle>
          <CardDescription>{records.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-end">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.fileName ?? "Record"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.fileType ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.fileSize != null ? `${(r.fileSize / 1024).toFixed(1)} KB` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.createdAt.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-end">
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
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
