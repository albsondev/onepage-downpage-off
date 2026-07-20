const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const MAX_BODY_SIZE = 10 * 1024;
const MAX_LOG_SIZE = 50 * 1024;
const DOWNLOADS_DIRECTORY = path.join(os.homedir(), 'Downloads');
let isDownloading = false;

function parsePort(value) {
  const port = Number(value);

  return Number.isInteger(port) && port >= 1 && port <= 65535
    ? port
    : 3000;
}

const PORT = parsePort(process.env.PORT);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro ao carregar o arquivo solicitado.');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function parseDownloadUrl(value) {
  const parsedUrl = new URL(value);

  if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
    throw new Error('invalid-url');
  }

  return parsedUrl.toString();
}

function appendLog(currentLog, data) {
  const updatedLog = currentLog + data.toString();
  return updatedLog.length > MAX_LOG_SIZE
    ? updatedLog.slice(-MAX_LOG_SIZE)
    : updatedLog;
}

async function ensureDownloadsDirectory() {
  try {
    await fs.promises.mkdir(DOWNLOADS_DIRECTORY, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function downloadSite(url, onComplete) {
  let finished = false;

  function finish(result) {
    if (finished) return;
    finished = true;
    onComplete(result);
  }

  ensureDownloadsDirectory()
    .then((isDirectoryReady) => {
      if (!isDirectoryReady) {
        finish({
          success: false,
          statusCode: 500,
          message: 'Não foi possível acessar a pasta Downloads do sistema.',
        });
        return;
      }

      const wget = spawn('wget', [
        '--mirror',
        '--convert-links',
        '--adjust-extension',
        '--page-requisites',
        '--no-parent',
        '--no-check-certificate',
        `--directory-prefix=${DOWNLOADS_DIRECTORY}`,
        '--',
        url,
      ]);

      let logOutput = '';
      wget.stdout.on('data', (data) => { logOutput = appendLog(logOutput, data); });
      wget.stderr.on('data', (data) => { logOutput = appendLog(logOutput, data); });

      wget.on('error', (error) => {
        const message = error.code === 'ENOENT'
          ? 'O comando wget não está instalado neste computador.'
          : 'Não foi possível iniciar o wget.';
        finish({ success: false, statusCode: 500, message });
      });

      wget.on('close', (code) => {
        if (code === 0) {
          finish({ success: true, statusCode: 200, message: 'Site baixado com sucesso!' });
          return;
        }

        finish({
          success: false,
          statusCode: 500,
          message: `Erro ao baixar (código ${code}).`,
          log: logOutput,
        });
      });
    })
    .catch(() => {
      finish({
        success: false,
        statusCode: 500,
        message: 'Não foi possível preparar o download.',
      });
    });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    serveFile(res, path.join(__dirname, 'index.html'), 'text/html; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && req.url === '/css/style.css') {
    serveFile(res, path.join(__dirname, 'css', 'style.css'), 'text/css; charset=utf-8');
    return;
  }

  if (req.method !== 'POST' || req.url !== '/download') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página não encontrada');
    return;
  }

  let body = '';

  req.on('data', (chunk) => {
    if (body.length + chunk.length > MAX_BODY_SIZE) {
      sendJson(res, 413, { success: false, message: 'Requisição muito grande.' });
      req.destroy();
      return;
    }

    body += chunk;
  });

  req.on('end', () => {
    if (req.destroyed) return;

    try {
      const { url } = JSON.parse(body);
      const validatedUrl = parseDownloadUrl(url);

      if (isDownloading) {
        sendJson(res, 409, { success: false, message: 'Já existe um download em andamento.' });
        return;
      }

      isDownloading = true;
      downloadSite(validatedUrl, (result) => {
        isDownloading = false;
        sendJson(res, result.statusCode, result);
      });
    } catch {
      sendJson(res, 400, { success: false, message: 'URL ou requisição inválida.' });
    }
  });
});

server.on('error', (error) => {
  console.error(`Não foi possível iniciar o servidor: ${error.message}`);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Interface rodando em: http://localhost:${PORT}`);
});
