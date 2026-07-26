const ngrok = require('@ngrok/ngrok');
const http = require('http');
const httpProxy = require('http-proxy');

// 1. Create a proxy server to merge API (8000) and WebSockets (8080)
const proxy = httpProxy.createProxyServer({ ws: true });

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/app') || req.url.startsWith('/apps')) {
    proxy.web(req, res, { target: 'http://127.0.0.1:8080' }, (err) => {
      res.writeHead(502); res.end('WebSocket server down.');
    });
  } else {
    proxy.web(req, res, { target: 'http://127.0.0.1:8000' }, (err) => {
      res.writeHead(502); res.end('Laravel API down.');
    });
  }
});

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/app') || req.url.startsWith('/apps')) {
    proxy.ws(req, socket, head, { target: 'http://127.0.0.1:8080' });
  } else {
    proxy.ws(req, socket, head, { target: 'http://127.0.0.1:8000' });
  }
});

server.listen(3000, async () => {
  console.log("Unified Proxy Server running on port 3000 (API -> 8000, WS -> 8080)");
  
  // 2. Start Ngrok on port 3000
  try {
    console.log("Starting Ngrok Static Tunnel via native Node bindings...");
    const listener = await ngrok.forward({
      addr: 3000,
      authtoken: '3H0XlR2jLhafj617wPuQhAREoNO_4YSpZcnivrMGQ3reM9QrN',
      domain: 'spoiler-hanky-prideful.ngrok-free.dev'
    });
    console.log("=====================================================");
    console.log("SUCCESS! Ngrok Static Tunnel is LIVE!");
    console.log("Mobile App API & WS URL: " + listener.url());
    console.log("=====================================================");
    console.log("Do NOT close this window. You can minimize it.");
    
    process.stdin.resume();
  } catch (error) {
    console.error("Failed to start Ngrok tunnel:", error);
  }
});
