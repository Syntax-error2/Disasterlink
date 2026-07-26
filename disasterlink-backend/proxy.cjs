const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({
  ws: true // Enable WebSocket proxying
});

const server = http.createServer((req, res) => {
  // Pusher/Reverb endpoints always start with /app/ or /apps/
  if (req.url.startsWith('/app') || req.url.startsWith('/apps')) {
    proxy.web(req, res, { target: 'http://127.0.0.1:8080' }, (err) => {
      res.writeHead(502);
      res.end('WebSocket server is down.');
    });
  } else {
    // Everything else goes to the main Laravel HTTP server
    proxy.web(req, res, { target: 'http://127.0.0.1:8000' }, (err) => {
      res.writeHead(502);
      res.end('Laravel API is down.');
    });
  }
});

// Handle WebSocket upgrade requests
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/app') || req.url.startsWith('/apps')) {
    proxy.ws(req, socket, head, { target: 'http://127.0.0.1:8080' });
  } else {
    proxy.ws(req, socket, head, { target: 'http://127.0.0.1:8000' });
  }
});

console.log("Unified Proxy Server running on port 3000");
console.log(" - API Traffic -> 8000");
console.log(" - WebSocket Traffic -> 8080");
server.listen(3000);
