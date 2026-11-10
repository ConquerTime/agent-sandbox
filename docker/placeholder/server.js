const http = require('node:http');

const agentPort = Number(process.env.AGENT_PORT || 4000);
const previewPort = Number(process.env.PREVIEW_PORT || 8000);
const projectId = process.env.PROJECT_ID || 'unknown';

http
  .createServer((req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'placeholder-agent',
          projectId,
        })
      );
      return;
    }
    if (req.url === '/api/chat' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          message: `placeholder chat for ${projectId}`,
        })
      );
      return;
    }
    res.writeHead(404).end('not found');
  })
  .listen(agentPort, '0.0.0.0', () => {
    console.log(`[placeholder] agent on :${agentPort}`);
  });

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      `<!doctype html><html><body><h1>Placeholder preview</h1><p>project=${projectId}</p></body></html>`
    );
  })
  .listen(previewPort, '0.0.0.0', () => {
    console.log(`[placeholder] preview on :${previewPort}`);
  });
