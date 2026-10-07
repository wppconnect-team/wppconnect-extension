const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const { Readable } = require('node:stream');
const { test } = require('node:test');
const { getLatestTag } = require('../download-wa-js-release');
const validatedRelease = require('../../wa-js-release.json');
const packageJson = require('../../package.json');

test('WA-JS npm types and the runtime asset use the same validated version', () => {
  assert.equal(packageJson.dependencies['@wppconnect/wa-js'], validatedRelease.tag.replace(/^v/, ''));
});

function mockRelease(t, body, statusCode = 200) {
  t.mock.method(https, 'get', (url, options, callback) => {
    assert.equal(url, 'https://api.github.com/repos/wppconnect-team/wa-js/releases/latest');
    assert.equal(options.headers.Accept, 'application/vnd.github+json');
    const response = Readable.from([JSON.stringify(body)]);
    response.statusCode = statusCode;
    const request = new EventEmitter();
    queueMicrotask(() => callback(response));
    return request;
  });
}

test('normal builds use the validated release without querying latest', async (t) => {
  const previous = process.env.WA_JS_VERSION;
  delete process.env.WA_JS_VERSION;
  t.after(() => {
    if (previous === undefined) delete process.env.WA_JS_VERSION;
    else process.env.WA_JS_VERSION = previous;
  });
  t.mock.method(https, 'get', () => {
    throw new Error('Pinned builds must not resolve the latest release');
  });
  assert.equal(await getLatestTag(), validatedRelease.tag);
});

test('explicit versions accept both tag and numeric forms', async () => {
  assert.equal(await getLatestTag('v4.6.0'), 'v4.6.0');
  assert.equal(await getLatestTag('4.6.0'), 'v4.6.0');
});

test('WA_JS_VERSION overrides the validated release', async (t) => {
  const previous = process.env.WA_JS_VERSION;
  process.env.WA_JS_VERSION = '4.6.0';
  t.after(() => {
    if (previous === undefined) delete process.env.WA_JS_VERSION;
    else process.env.WA_JS_VERSION = previous;
  });
  assert.equal(await getLatestTag(), 'v4.6.0');
});

test('maintenance can explicitly resolve the latest release', async (t) => {
  mockRelease(t, { tag_name: 'v4.7.0' });
  assert.equal(await getLatestTag('latest'), 'v4.7.0');
});

test('a latest response without a release tag fails validation', async (t) => {
  mockRelease(t, {});
  await assert.rejects(getLatestTag('latest'), /Could not resolve latest WA-JS release tag/);
});

test('GitHub API errors fail instead of silently changing the release', async (t) => {
  mockRelease(t, { message: 'API rate limit exceeded' }, 403);
  await assert.rejects(getLatestTag('latest'), /Request failed 403/);
});
