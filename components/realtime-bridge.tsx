"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { useToast } from "@/components/toast-provider";

export function RealtimeBridge() {
  const router = useRouter();
  const { toast } = useToast();
  const socketRef = React.useRef<Socket | null>(null);
  const meRef = React.useRef<{ id: string; role: string } | null>(null);

  React.useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/session");
      const data = (await res.json()) as { user: { id: string; role: string } | null };
      if (!data.user || cancelled) {
        return;
      }
      meRef.current = data.user;

      const socket = io(url, {
        auth: { userId: data.user.id, role: data.user.role },
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      socket.on("record:uploaded", (payload: { patientId?: string }) => {
        const me = meRef.current;
        const isSelfPatient =
          me?.role === "patient" && payload.patientId && payload.patientId === me.id;
        if (!isSelfPatient) {
          toast({
            title: "New medical record",
            description: "Dashboard data was refreshed.",
          });
        }
        router.refresh();
      });

      socket.on("access:updated", () => {
        toast({
          title: "Access updated",
          description: "Permissions or grants changed.",
        });
        router.refresh();
      });

      socket.on("admin:users_updated", () => {
        toast({
          title: "Users directory",
          description: "User data may have changed.",
        });
        router.refresh();
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [router, toast]);

  return null;
}
