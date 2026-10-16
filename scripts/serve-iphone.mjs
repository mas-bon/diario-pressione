import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import querystring from 'node:querystring';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const MAIN_PORT = 3000;
const FILE_PORT = 3001;

// In-memory temporary stash for iOS Home Screen HTTP file handoff
const fileStash = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function handleRequest(req, res) {
  const hostHeader = req.headers.host || `localhost:${MAIN_PORT}`;
  const urlObj = new URL(req.url || '/', `http://${hostHeader}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. POST /api/open-file (Synchronous form POST from iOS Home Screen app -> 303 redirect to GET /api/file/:id/:filename)
  if (req.method === 'POST' && (urlObj.pathname === '/api/open-file' || urlObj.pathname === '/api/stash-file')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'] || '';
        const payload = contentType.includes('application/json')
          ? JSON.parse(body)
          : querystring.parse(body);

        const base64 = String(payload.base64 || '');
        const filename = String(payload.filename || 'Report-Pressione.pdf');
        const mimeType = String(payload.mimeType || 'application/pdf');
        const disposition = String(payload.disposition || 'inline');

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const buffer = Buffer.from(base64, 'base64');
        fileStash.set(id, {
          buffer,
          filename,
          mimeType,
          disposition,
        });
        setTimeout(() => fileStash.delete(id), 15 * 60 * 1000);

        if (urlObj.pathname === '/api/open-file') {
          const targetUrl = `/api/file/${id}/${encodeURIComponent(filename)}`;
          res.writeHead(303, { Location: targetUrl });
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Errore elaborazione file.');
      }
    });
    return;
  }

  // 2. GET /api/file/:id/:filename -> serves stashed file to Safari / SFSafariViewController
  if (req.method === 'GET' && urlObj.pathname.startsWith('/api/file/')) {
    const parts = urlObj.pathname.split('/');
    const id = parts[3];
    const item = fileStash.get(id);
    if (!item) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File scaduto o non trovato. Riprova dal Diario.');
      return;
    }

    res.writeHead(200, {
      'Content-Type': item.mimeType,
      'Content-Length': item.buffer.length,
      'Content-Disposition': `${item.disposition}; filename="${item.filename}"`,
      'Cache-Control': 'no-store',
    });
    res.end(item.buffer);
    return;
  }

  // 3. Static files from dist/
  let safePath = decodeURIComponent(urlObj.pathname);
  if (safePath === '/') safePath = '/index.html';

  const filePath = path.join(distDir, safePath);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexFallback = path.join(distDir, 'index.html');
    if (fs.existsSync(indexFallback)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
      fs.createReadStream(indexFallback).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

const mainServer = http.createServer(handleRequest);
const fileServer = http.createServer(handleRequest);

mainServer.listen(MAIN_PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n============================================================');
  console.log(' 📱 SERVER DIARIO PRESSIONE ATTIVO (PORTA 3000 + 3001)');
  console.log('============================================================');
  for (const ip of ips) {
    console.log(`   👉  http://${ip.address}:${MAIN_PORT}   (${ip.name})`);
  }
  console.log('============================================================\n');
});

fileServer.listen(FILE_PORT, '0.0.0.0', () => {
  console.log(` ✅ Server PDF/Export ausiliario per iPhone Home attivo su porta ${FILE_PORT}`);
});
