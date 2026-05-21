"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2,X } from "lucide-react";

export function PatientAccessRevokeButton({ grantId }: { grantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      className="border border-red-600/50 bg-red-950/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1.5 transition-colors"
      onClick={async () => {
        setLoading(true);
        await fetch(`/api/access-grants/${grantId}`, { method: "DELETE" });
        setLoading(false);
        router.refresh();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      Revoke
    </Button>
  );
}
