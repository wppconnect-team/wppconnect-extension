const fs = require('fs');
const https = require('https');
const path = require('path');

const repo = 'wppconnect-team/wa-js';
const assetName = 'wppconnect-wa.js';
const requestedVersion = process.env.WA_JS_VERSION || 'latest';
const skipDownload = /^(1|true|yes)$/i.test(process.env.WA_JS_SKIP_DOWNLOAD || '');
const writeMetadata = /^(1|true|yes)$/i.test(process.env.WA_JS_WRITE_METADATA || '');
const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@wppconnect',
  'wa-js',
  'dist',
  assetName
);
const metadataTarget = path.join(__dirname, '..', 'wa-js-release.json');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'wppconnect-extension-wa-js-updater',
        Accept: 'application/vnd.github+json',
        ...options.headers,
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        resolve(request(res.headers.location, options));
        return;
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => body += chunk);
        res.on('end', () => reject(new Error(`Request failed ${res.statusCode}: ${url}\n${body}`)));
        return;
      }

      resolve(res);
    });

    req.on('error', reject);
  });
}

async function getLatestTag() {
  if (requestedVersion !== 'latest') {
    return requestedVersion.startsWith('v') ? requestedVersion : `v${requestedVersion}`;
  }

  const res = await request(`https://api.github.com/repos/${repo}/releases/latest`);
  let body = '';
  res.setEncoding('utf8');
  for await (const chunk of res) body += chunk;
  const release = JSON.parse(body);
  if (!release.tag_name) throw new Error('Could not resolve latest WA-JS release tag');
  return release.tag_name;
}

async function download(url, destination) {
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  const res = await request(url, { headers: { Accept: 'application/octet-stream' } });
  const temp = `${destination}.tmp`;
  const file = fs.createWriteStream(temp);

  await new Promise((resolve, reject) => {
    res.pipe(file);
    file.on('finish', resolve);
    file.on('error', reject);
    res.on('error', reject);
  });

  await fs.promises.rename(temp, destination);
}

async function main() {
  if (skipDownload) {
    console.log('Skipping WA-JS release download because WA_JS_SKIP_DOWNLOAD is set');
    return;
  }

  const tag = await getLatestTag();
  const url = `https://github.com/${repo}/releases/download/${tag}/${assetName}`;
  await download(url, target);
  if (writeMetadata) {
    await fs.promises.writeFile(metadataTarget, `${JSON.stringify({
      repo,
      tag,
      assetName,
      assetUrl: url
    }, null, 2)}\n`);
  }
  console.log(`Downloaded ${repo} ${tag} ${assetName}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
