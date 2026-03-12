import { spawn } from 'node:child_process';
import net from 'node:net';
import { networkInterfaces } from 'node:os';
import process from 'node:process';
import QRCode from 'qrcode';
import './ensure-dev-cert.mjs';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const children = [];
let shuttingDown = false;

function checkPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

function startProcess(name, cwd, args) {
  const child = spawn(npmCommand, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${name}] finalizado com ${reason}`);
    shutdown(code ?? 1);
  });

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[${name}] falhou ao iniciar:`, error);
    shutdown(1);
  });

  children.push(child);
  return child;
}

function getLocalIpAddresses() {
  const interfaces = networkInterfaces();
  const addresses = [];

  for (const network of Object.values(interfaces)) {
    for (const config of network || []) {
      if (config.family === 'IPv4' && !config.internal) {
        addresses.push(config.address);
      }
    }
  }

  return addresses;
}

async function printAccessInfo() {
  const localIps = getLocalIpAddresses();
  const urls = ['https://localhost:5173', ...localIps.map((ip) => `https://${ip}:5173`)];

  console.log('\nAcesso ao app:');
  for (const url of urls) {
    console.log(`- ${url}`);
  }

  if (localIps.length > 0) {
    const mobileUrl = `https://${localIps[0]}:5173`;
    const qr = await QRCode.toString(mobileUrl, {
      type: 'terminal',
      small: true
    });

    console.log('\nQR Code para abrir no celular:');
    console.log(qr);
    console.log(`Abra no celular: ${mobileUrl}`);
    console.log('Se o navegador avisar sobre certificado, aceite o certificado local para liberar a camera.');
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }

    process.exit(exitCode);
  }, 1500).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  const [serverPortFree, clientPortFree] = await Promise.all([
    checkPortAvailable(3000),
    checkPortAvailable(5173),
  ]);

  if (!serverPortFree || !clientPortFree) {
    if (!serverPortFree) {
      console.error('A porta 3000 ja esta em uso. Encerre o processo atual antes de rodar npm run start.');
    }
    if (!clientPortFree) {
      console.error('A porta 5173 ja esta em uso. Encerre o processo atual antes de rodar npm run start.');
    }
    process.exit(1);
  }

  console.log('Iniciando backend e frontend...');

  startProcess('server', './server', ['run', 'start']);
  startProcess('client', '.', ['run', 'dev']);
  await printAccessInfo();
}

void main();
