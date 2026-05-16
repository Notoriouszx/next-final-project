import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Server } from "socket.io";

const PORT = Number(process.env.SOCKET_PORT ?? 3001);
const SECRET = process.env.REALTIME_EMIT_SECRET ?? "dev-realtime-secret";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "POST" && req.url === "/internal/emit") {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${SECRET}`) {
      res.writeHead(401).end("unauthorized");
      return;
    }
    try {
      const raw = await readBody(req);
      const parsed = JSON.parse(raw) as {
        event: string;
        rooms: string[];
        payload?: Record<string, unknown>;
      };
      for (const room of parsed.rooms) {
        io.to(room).emit(parsed.event, parsed.payload ?? {});
      }
      res.writeHead(200).end("ok");
    } catch {
      res.writeHead(400).end("bad request");
    }
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

io.use((socket, next) => {
  const userId = socket.handshake.auth?.userId as string | undefined;
  const role = socket.handshake.auth?.role as string | undefined;
  if (!userId || !role) {
    next(new Error("unauthorized"));
    return;
  }
  socket.data.userId = userId;
  socket.data.role = role;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;
  const role = socket.data.role as string;
  void socket.join(`user:${userId}`);
  if (role === "patient") void socket.join(`patient:${userId}`);
  if (role === "admin") void socket.join("admin");
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO listening on ${PORT}`);
});
