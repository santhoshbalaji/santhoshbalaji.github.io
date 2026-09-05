import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { gzipSync } from "node:zlib";
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name)+1] : fallback;
const root = resolve(option("--root", ".")), port = Number(option("--port", "4173"));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8" };
http.createServer(async (req,res) => {
  try {
    if (!["GET","HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
    let name = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    let path = resolve(root, `.${name}`);
    if ((!path.startsWith(root+sep) && path!==root) || /(?:^|\/)\.|node_modules/.test(name)) { res.writeHead(403); res.end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path,"index.html");
    let body = await readFile(path);
    const type = mime[extname(path)] || "application/octet-stream";
    res.setHeader("Content-Type",type);
    res.setHeader("Cache-Control","public, max-age=600");
    res.setHeader("Vary","Accept-Encoding");
    if (/gzip/.test(req.headers["accept-encoding"]||"") && /text\/|javascript|json|xml|svg/.test(type)) {
      body = gzipSync(body); res.setHeader("Content-Encoding","gzip");
    }
    res.setHeader("Content-Length",body.length);
    res.end(req.method==="HEAD" ? undefined : body);
  } catch { res.writeHead(404,{"Content-Type":"text/plain"}); res.end("Not found"); }
}).listen(port,"127.0.0.1",()=>console.log(`Portfolio preview: http://127.0.0.1:${port} (${root})`));
