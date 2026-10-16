import https from "node:https";
import dns from "node:dns/promises";
import net from "node:net";

export const FEED_MAX_BYTES = 10 * 1024 * 1024;
export const ARTICLE_MAX_BYTES = 2 * 1024 * 1024;

function publicAddress(ip) {
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224 ||
      (a === 198 && [18, 19].includes(b))
    );
  }
  return /^[23][0-9a-f]{3}:/i.test(ip);
}

export async function download(
  url,
  headers = {},
  { maxBytes = FEED_MAX_BYTES, label = "Feed", hops = 0 } = {},
) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw Error("Use a public HTTPS feed on port 443");
  const addresses = await dns.lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw Error("Private network feed addresses are not allowed");
  const address = addresses[0];
  return new Promise((ok, no) => {
    const req = https.get(
      u,
      {
        headers: {
          "User-Agent": "QuietNews/1.0 personal RSS reader",
          ...headers,
        },
        lookup: (_host, opts, cb) =>
          opts.all
            ? cb(null, [address])
            : cb(null, address.address, address.family),
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          if (hops >= 3) return no(Error("Too many redirects"));
          download(new URL(res.headers.location, u).href, headers, {
            maxBytes,
            label,
            hops: hops + 1,
          }).then(ok, no);
          return;
        }
        if (res.statusCode === 304) {
          res.resume();
          ok({ status: 304 });
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          no(Error(`HTTP ${res.statusCode}`));
          return;
        }
        let size = 0;
        const chunks = [];
        res.on("data", (c) => {
          size += c.length;
          if (size > maxBytes) {
            const error = Error(
              `${label} exceeds ${maxBytes / 1024 / 1024} MiB`,
            );
            error.code = "ERR_RESPONSE_TOO_LARGE";
            res.destroy(error);
            return;
          }
          chunks.push(c);
        });
        res.on("error", no);
        res.on("end", () =>
          ok({
            status: 200,
            text: Buffer.concat(chunks).toString(),
            etag: res.headers.etag,
            modified: res.headers["last-modified"],
          }),
        );
      },
    );
    const deadline = setTimeout(
      () => req.destroy(Error("Page request timed out")),
      15000,
    );
    req.once("close", () => clearTimeout(deadline));
    req.setTimeout(12000, () => req.destroy(Error("Page request timed out")));
    req.on("error", no);
  });
}
