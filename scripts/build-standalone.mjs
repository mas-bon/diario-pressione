import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist-standalone');
const outputDistDir = path.join(rootDir, 'dist');

const indexHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('Errore: dist-standalone/index.html non trovato. Esegui `npm run build:standalone`.');
  process.exit(1);
}

let html = fs.readFileSync(indexHtmlPath, 'utf-8');

// 1. Inline all <link rel="stylesheet" ... href="...">
html = html.replace(
  /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
  (fullMatch, href) => {
    const cleanHref = href.replace(/^\.?\//, '');
    const cssPath = path.join(distDir, cleanHref);
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      return `<style>\n${cssContent}\n</style>`;
    }
    return fullMatch;
  }
);

// 2. Remove external PWA manifest & registerSW script tags for the single-file standalone HTML
html = html.replace(/<link[^>]*rel=["']manifest["'][^>]*>/gi, () => '');
html = html.replace(/<script[^>]*id=["']vite-plugin-pwa:register-sw["'][^>]*><\/script>/gi, () => '');

// 3. Inline icon.svg and apple-touch-icon.png as data URIs
const iconSvgPath = path.join(rootDir, 'public', 'icon.svg');
if (fs.existsSync(iconSvgPath)) {
  const svgBase64 = fs.readFileSync(iconSvgPath).toString('base64');
  html = html.replace(
    /href=["']\.?\/icon\.svg["']/gi,
    () => `href="data:image/svg+xml;base64,${svgBase64}"`
  );
}

const appleIconPath = path.join(rootDir, 'public', 'apple-touch-icon.png');
if (fs.existsSync(appleIconPath)) {
  const pngBase64 = fs.readFileSync(appleIconPath).toString('base64');
  html = html.replace(
    /href=["']\.?\/apple-touch-icon\.png["']/gi,
    () => `href="data:image/png;base64,${pngBase64}"`
  );
}

// 4. Extract the <script type="module" src="..."> from <head> and move it as a classic IIFE <script> at the end of <body>
let inlinedScriptTag = '';
html = html.replace(
  /<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
  (_fullMatch, src) => {
    const cleanSrc = src.replace(/^\.?\//, '');
    const jsPath = path.join(distDir, cleanSrc);
    if (fs.existsSync(jsPath)) {
      const jsContent = fs
        .readFileSync(jsPath, 'utf-8')
        .replace(/<\/script/gi, () => '<\\/script');
      // Use standard <script> wrapped in an IIFE so iOS WebViews on file:// don't block ES modules
      inlinedScriptTag = `<script>\n(function(){\n${jsContent}\n})();\n</script>`;
      return '';
    }
    return '';
  }
);

// 5. Add a helpful fallback inside <div id="root"> in case iOS Quick Look (Files/WhatsApp preview) completely disables JS
const iosQuickLookFallback = `<div id="root">
  <div style="max-width:460px;margin:32px auto;padding:22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f1d36;color:#f1f5f9;border:1px solid #1e2f4d;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.4);text-align:left;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <div style="width:44px;height:44px;border-radius:12px;background:#2563eb;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#fff;flex-shrink:0;">♥</div>
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:800;color:#fff;">Diario della Pressione</h2>
        <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">Blocco Anteprima File di Apple iOS</p>
      </div>
    </div>
    <p style="font-size:14px;line-height:1.5;color:#e2e8f0;margin:0 0 14px;">
      Hai aperto questo file nell'<strong>Anteprima di iPhone</strong> (app <em>File</em>, <em>WhatsApp</em> o <em>Mail</em>). Per sicurezza, Apple <strong>disattiva tutti i pulsanti e i grafici</strong> quando apri un file <code>.html</code> direttamente come allegato.
    </p>
    <div style="background:#0a1120;border:1px solid #1e2f4d;border-radius:14px;padding:14px;font-size:13px;line-height:1.6;color:#cbd5e1;">
      <strong style="color:#60a5fa;display:block;margin-bottom:6px;">Come aprirla su iPhone in 10 secondi:</strong>
      1. Sul PC apri <strong>Avvia-per-iPhone.bat</strong>.<br/>
      2. Inquadra il <strong>QR Code</strong> con la fotocamera dell'iPhone per aprirla in <strong>Safari</strong>.<br/>
      3. Oppure su iPhone apri questo file con l'app gratuita <strong>Documents</strong> o <strong>HTML Viewer</strong> dall'App Store.
    </div>
  </div>
</div>`;

html = html.replace(/<div id=["']root["']><\/div>/i, () => iosQuickLookFallback);

// Place the inline script right before </body> using a function callback so $& in JS is never expanded
html = html.replace(/<\/body>/i, () => `${inlinedScriptTag}\n</body>`);

const standaloneOutputRoot = path.join(rootDir, 'Diario-Pressione-Standalone.html');
const standaloneOutputDist = path.join(outputDistDir, 'Diario-Pressione-Standalone.html');

fs.mkdirSync(outputDistDir, { recursive: true });
fs.writeFileSync(standaloneOutputRoot, html, 'utf-8');
fs.writeFileSync(standaloneOutputDist, html, 'utf-8');

const sizeKb = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
console.log(`✅ Creato file unico autonomo (compatibile IIFE + iOS): Diario-Pressione-Standalone.html (${sizeKb} KB)`);
