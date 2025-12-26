const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getDirectoryListing(dirPath, urlPath) {
  const files = fs.readdirSync(dirPath);
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Chrome Extension Build - ${urlPath || '/'}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    .info { background: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px; border-bottom: 1px solid #eee; }
    li:hover { background: #f5f5f5; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .folder { color: #f0a500; }
    .file { color: #666; }
  </style>
</head>
<body>
  <h1>WhatsApp Group Link Extractor - Chrome Extension</h1>
  <div class="info">
    <strong>How to install this extension:</strong>
    <ol>
      <li>Download all files from this <code>dist</code> folder</li>
      <li>Open Chrome and go to <code>chrome://extensions/</code></li>
      <li>Enable "Developer mode" (toggle in top right)</li>
      <li>Click "Load unpacked" and select the downloaded folder</li>
    </ol>
  </div>
  <h2>Extension Files${urlPath ? ` - ${urlPath}` : ''}</h2>
  <ul>`;

  if (urlPath && urlPath !== '/') {
    const parentPath = path.dirname(urlPath);
    html += `<li><a href="${parentPath === '/' ? '/' : parentPath}">..</a> (parent directory)</li>`;
  }

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    const href = path.join(urlPath || '/', file);
    const icon = stat.isDirectory() ? '📁' : '📄';
    const className = stat.isDirectory() ? 'folder' : 'file';
    html += `<li class="${className}">${icon} <a href="${href}">${file}</a></li>`;
  });

  html += `</ul></body></html>`;
  return html;
}

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '';
  
  const filePath = path.join(DIST_DIR, urlPath);
  
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - File Not Found</h1><p><a href="/">Go back to file listing</a></p>');
    return;
  }

  const stat = fs.statSync(filePath);
  
  if (stat.isDirectory()) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getDirectoryListing(filePath, urlPath || '/'));
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Extension file server running at http://0.0.0.0:${PORT}`);
  console.log(`Serving files from: ${DIST_DIR}`);
});
