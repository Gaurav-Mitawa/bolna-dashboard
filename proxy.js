/**
 * Frontend Proxy Server
 * Proxies requests from port 3000 to 8001 (unified backend server)
 * This is needed because Emergent preview expects frontend on port 3000
 */
const http = require('http');

const TARGET_PORT = 8001;
const LISTEN_PORT = 3000;

const server = http.createServer((req, res) => {
  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxy, { end: true });

  proxy.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.writeHead(502);
    res.end('Proxy error');
  });
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Forwarding port ${LISTEN_PORT} -> ${TARGET_PORT}`);
});
