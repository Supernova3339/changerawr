// scripts/ftb/server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Get missing environment variables from command line args
const missingVars = process.argv.slice(2);

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const htmlPath = path.join(__dirname, 'index.html');

        fs.readFile(htmlPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading page');
                return;
            }

            // Replace placeholder with actual missing variables
            const html = data.replace('{{MISSING_VARS}}', missingVars.join(', '));

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`\n🚨 CHANGERAWR FAILURE TO BOOT (FTB) 🚨`);
    console.log(`╔══════════════════════════════════════╗`);
    console.log(`║  CRITICAL CONFIGURATION ERROR       ║`);
    console.log(`║  Missing environment variables       ║`);
    console.log(`╚══════════════════════════════════════╝`);
    console.log(`\nError server running at: http://localhost:${PORT}`);
    console.log(`Missing variables: ${missingVars.join(', ')}\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down error server...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nShutting down error server...');
    server.close(() => {
        process.exit(0);
    });
});