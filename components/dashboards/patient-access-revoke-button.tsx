"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PatientAccessRevokeButton({ grantId }: { grantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch(`/api/access-grants/${grantId}`, { method: "DELETE" });
        setLoading(false);
        router.refresh();
      }}
    >
      Revoke
    </Button>
  );
}
