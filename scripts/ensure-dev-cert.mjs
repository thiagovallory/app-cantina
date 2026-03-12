import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const certDir = path.join(process.cwd(), 'certs');
const keyPath = path.join(certDir, 'dev.key');
const certPath = path.join(certDir, 'dev.crt');

function getLocalIpAddresses() {
  const interfaces = networkInterfaces();
  const addresses = new Set(['127.0.0.1']);

  for (const network of Object.values(interfaces)) {
    for (const config of network || []) {
      if (config.family === 'IPv4' && !config.internal) {
        addresses.add(config.address);
      }
    }
  }

  return Array.from(addresses);
}

function ensureCertificate() {
  if (existsSync(keyPath) && existsSync(certPath)) {
    return;
  }

  mkdirSync(certDir, { recursive: true });

  const ipAddresses = getLocalIpAddresses();
  const altNames = [
    'DNS.1 = localhost',
    ...ipAddresses.map((ip, index) => `IP.${index + 1} = ${ip}`)
  ].join('\n');

  const configPath = path.join(certDir, 'openssl.dev.cnf');
  writeFileSync(configPath, `
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
${altNames}
`.trim() + '\n');

  const result = spawnSync('openssl', [
    'req',
    '-x509',
    '-nodes',
    '-days',
    '365',
    '-newkey',
    'rsa:2048',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-config',
    configPath
  ], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Falha ao gerar certificado HTTPS local.');
  }
}

ensureCertificate();
