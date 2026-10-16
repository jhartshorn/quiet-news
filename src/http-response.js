import { gzip, constants } from "node:zlib";
import { promisify } from "node:util";
const compress = promisify(gzip);

export function acceptsGzip(header = "") {
  const encodings = header.split(",").map((part) => {
    const [name, ...parameters] = part.trim().toLowerCase().split(";");
    const q = parameters.find((p) => p.trim().startsWith("q="));
    return [name, q ? Number(q.trim().slice(2)) : 1];
  });
  return (
    (encodings.find(([name]) => name === "gzip") ||
      encodings.find(([name]) => name === "*"))?.[1] > 0
  );
}

export async function sendSnapshot(req, res, entry) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Accept-Encoding",
  };
  let body = entry.json;
  if (
    Buffer.byteLength(body) >= 1024 &&
    acceptsGzip(req.headers["accept-encoding"])
  ) {
    try {
      entry.gzip ||= compress(body, { level: constants.Z_BEST_SPEED });
      body = await entry.gzip;
      headers["Content-Encoding"] = "gzip";
    } catch {
      // A compression failure must not make otherwise valid news unavailable.
      delete entry.gzip;
    }
  }
  headers["Content-Length"] = Buffer.byteLength(body);
  res.writeHead(200, headers);
  res.end(body);
}
