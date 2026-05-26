const http = require('http');

const PORT = 5566;

const server = http.createServer((req, res) => {
  // Handle CORS Preflight Options
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { timestamp, user, action } = JSON.parse(body);

        // Cyber-industrial ANSI terminal formatting:
        // Crimson background (\x1b[41m\x1b[37m\x1b[1m)
        const badge = '\x1b[41m\x1b[37m\x1b[1m FENCEIN AUDIT \x1b[0m';
        // Cyan color (\x1b[36m)
        const timeStr = `\x1b[36m[${timestamp}]\x1b[0m`;
        // Pink/Magenta color (\x1b[35m)
        const userStr = `\x1b[35m${user.padEnd(35)}\x1b[0m`;
        // Emerald green color (\x1b[32m)
        const actionStr = `\x1b[32m${action}\x1b[0m`;

        console.log(`${badge}  ${timeStr}  ${userStr}  ${actionStr}`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.clear();
  console.log('\x1b[1m\x1b[31m');
  console.log('  ______ _____ _   _  _____ _____ _____ _   _ ');
  console.log(' |  ____|  ___| \\ | |/ ____|  ___|_   _| \\ | |');
  console.log(' | |__  | |__ |  \\| | |    | |__   | | |  \\| |');
  console.log(' |  __| |  __|| . ` | |    |  __|  | | | . ` |');
  console.log(' | |    | |___| |\\  | |____| |___ _| |_| |\\  |');
  console.log(' |_|    |_____|_| \\_|\\_____|_____|_____|_| \\_|');
  console.log('\x1b[0m');
  console.log('\x1b[31m  ==================================================================\x1b[0m');
  console.log('\x1b[37m\x1b[1m             FENCEIN CENTRAL GUARD AUDIT TELEMETRY TERMINAL\x1b[0m');
  console.log('\x1b[31m  ==================================================================\x1b[0m');
  console.log(`\n\x1b[33m  [STATUS]: Listening on Port ${PORT}... awaiting frontend security logs...\x1b[0m\n`);
});
