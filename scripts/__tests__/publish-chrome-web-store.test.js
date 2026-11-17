const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { test } = require('node:test')
const { compareVersions, publishPackage, resolveReleaseAsset } = require('../publish-chrome-web-store')

const itemId = 'ejamgmkhipipigkanaefjklolfddmlel'
const resource = `publishers/publisher-123/items/${itemId}`
const packageBytes = Buffer.from('verified release archive')
const version = '1.0.97'
const revision = (value, state) => ({ state, distributionChannels: [{ crxVersion: value, deployPercentage: 100 }] })
const pending = () => ({ submittedItemRevisionStatus: revision(version, 'PENDING_REVIEW') })

function harness (responses, overrides = {}) {
  const calls = []
  return {
    calls,
    run: () => publishPackage({
      publisherId: 'publisher-123', itemId, version, packageBytes,
      sha256: createHash('sha256').update(packageBytes).digest('hex'),
      accessToken: 'private-access-token', sleep: async () => {}, maxPolls: 2,
      fetchImpl: async (url, options) => {
        calls.push({ url, ...options })
        const next = responses.shift()
        assert.ok(next, 'Unexpected extra HTTP request')
        if (next instanceof Error) throw next
        return {
          ok: !next.httpStatus,
          status: next.httpStatus || 200,
          json: async () => ({ itemId, name: resource, ...next })
        }
      },
      ...overrides
    })
  }
}

test('uploads the verified ZIP and submits for normal automatic publication after review', async () => {
  const mock = harness([{}, { uploadState: 'SUCCEEDED', crxVersion: version }, { state: 'PENDING_REVIEW' }, pending()])
  assert.deepEqual(await mock.run(), { action: 'submitted', state: 'PENDING_REVIEW', version })
  assert.deepEqual(mock.calls.map(call => call.method), ['GET', 'POST', 'POST', 'GET'])
  assert.equal(mock.calls[1].url, `https://chromewebstore.googleapis.com/upload/v2/${resource}:upload`)
  assert.equal(mock.calls[1].body, packageBytes)
  assert.equal(mock.calls[1].headers['Content-Type'], 'application/zip')
  assert.deepEqual(JSON.parse(mock.calls[2].body), { publishType: 'DEFAULT_PUBLISH', skipReview: false })
  for (const call of mock.calls) {
    assert.equal(call.headers.Authorization, 'Bearer private-access-token')
    assert.equal(call.redirect, 'error')
  }
})

test('polls an asynchronous upload and confirms the submitted version', async () => {
  const mock = harness([{}, { uploadState: 'IN_PROGRESS' }, { lastAsyncUploadState: 'IN_PROGRESS' }, { lastAsyncUploadState: 'SUCCEEDED' }, { state: 'PENDING_REVIEW' }, {}, pending()])
  assert.equal((await mock.run()).state, 'PENDING_REVIEW')
  assert.equal(mock.calls.filter(call => call.method === 'POST').length, 2)
})

test('reports actual publication when Google has already approved the revision', async () => {
  const mock = harness([{}, { uploadState: 'SUCCEEDED', crxVersion: version }, { state: 'PUBLISHED' }, { publishedItemRevisionStatus: revision(version, 'PUBLISHED') }])
  assert.equal((await mock.run()).state, 'PUBLISHED')
})

for (const [name, status, action] of [
  ['already in review', pending(), 'already-submitted'],
  ['already published', { publishedItemRevisionStatus: revision(version, 'PUBLISHED') }, 'already-published']
]) {
  test(`rerunning a release ${name} sends no mutation`, async () => {
    const mock = harness([status])
    assert.equal((await mock.run()).action, action)
    assert.equal(mock.calls.length, 1)
  })
}

for (const [name, status, message] of [
  ['newer published revision', { publishedItemRevisionStatus: revision('1.0.98', 'PUBLISHED') }, /newer version/],
  ['newer pending revision', { submittedItemRevisionStatus: revision('1.0.98', 'PENDING_REVIEW') }, /newer version/],
  ['older pending revision', { submittedItemRevisionStatus: revision('1.0.96', 'PENDING_REVIEW') }, /Another version is pending/],
  ['staged revision', { submittedItemRevisionStatus: revision(version, 'STAGED') }, /staged revision/],
  ['same rejected revision', { submittedItemRevisionStatus: revision(version, 'REJECTED') }, /previous submission/],
  ['same cancelled revision', { submittedItemRevisionStatus: revision(version, 'CANCELLED') }, /previous submission/],
  ['unknown submission state', { submittedItemRevisionStatus: revision('1.0.96', 'UNKNOWN') }, /Unexpected store/],
  ['unknown published state', { publishedItemRevisionStatus: revision('1.0.96', 'UNKNOWN') }, /Unexpected published/],
  ['revision without versions', { publishedItemRevisionStatus: { state: 'PUBLISHED' } }, /no version/],
  ['taken down item', { takenDown: true }, /taken down/],
  ['another upload', { lastAsyncUploadState: 'IN_PROGRESS' }, /Another upload/]
]) {
  test(`preserves the store when it has a ${name}`, async () => {
    const mock = harness([status])
    await assert.rejects(mock.run(), message)
    assert.equal(mock.calls.length, 1)
  })
}

for (const status of [
  { uploadState: 'FAILED' },
  { uploadState: 'SUCCEEDED', crxVersion: '1.0.96' },
  { uploadState: 'SUCCEEDED' },
  { uploadState: 'UNKNOWN' }
]) {
  test(`never publishes an invalid upload response ${JSON.stringify(status)}`, async () => {
    const mock = harness([{}, status])
    await assert.rejects(mock.run(), /upload|Upload|version/i)
    assert.equal(mock.calls.length, 2)
  })
}

test('does not publish an asynchronous upload that failed or timed out', async () => {
  for (const state of ['FAILED', 'IN_PROGRESS', 'NOT_FOUND']) {
    const mock = harness([{}, { uploadState: 'IN_PROGRESS' }, { lastAsyncUploadState: state }, { lastAsyncUploadState: state }])
    await assert.rejects(mock.run(), /did not succeed/)
    assert.equal(mock.calls.filter(call => call.method === 'POST').length, 1)
  }
})

test('does not blindly retry a publish request whose response was lost', async () => {
  const mock = harness([{}, { uploadState: 'SUCCEEDED', crxVersion: version }, new Error('Connection reset')])
  await assert.rejects(mock.run(), /Connection reset/)
  assert.equal(mock.calls.length, 3)
})

test('API failures do not log tokens or raw response bodies', async () => {
  const mock = harness([{ httpStatus: 403, error: { message: 'private-access-token' } }])
  await assert.rejects(mock.run(), error => /HTTP 403/.test(error.message) && !error.message.includes('private-access-token'))
})

test('refuses responses for a different item', async () => {
  const mock = harness([{ itemId: 'a'.repeat(32) }])
  await assert.rejects(mock.run(), /different item/)
})

test('fails when the submitted revision cannot be confirmed without re-publishing', async () => {
  const mock = harness([{}, { uploadState: 'SUCCEEDED', crxVersion: version }, { state: 'PENDING_REVIEW' }, {}, {}])
  await assert.rejects(mock.run(), /could not be confirmed/)
  assert.equal(mock.calls.filter(call => call.url.endsWith(':publish')).length, 1)
})

test('rejects an unsuccessful publish result', async () => {
  const mock = harness([{}, { uploadState: 'SUCCEEDED', crxVersion: version }, { state: 'REJECTED' }])
  await assert.rejects(mock.run(), /unexpected state/)
})

for (const overrides of [
  { sha256: '0'.repeat(64) }, { accessToken: '' }, { publisherId: '../wrong' },
  { itemId: 'invalid' }, { version: '1.0.65536' }, { version: '1.0.0-beta' }
]) {
  test(`rejects invalid publication input ${JSON.stringify(overrides)} before HTTP calls`, async () => {
    const mock = harness([], overrides)
    await assert.rejects(mock.run())
    assert.equal(mock.calls.length, 0)
  })
}

test('compares Chrome versions numerically and accounts for omitted zero components', () => {
  assert.equal(compareVersions('1.0.10', '1.0.9'), 1)
  assert.equal(compareVersions('1.0.9', '1.0.10'), -1)
  assert.equal(compareVersions('1.0', '1.0.0.0'), 0)
  assert.throws(() => compareVersions('0.0.0', '1.0.0'))
})

const assetDigest = 'a'.repeat(64)
function releaseMetadata () {
  return {
    tagName: 'v1.0.97', isDraft: false, isPrerelease: false,
    assets: [{ name: 'wppconnect-extension-v1.0.97.zip', state: 'uploaded', digest: `sha256:${assetDigest}` }]
  }
}

test('selects the published stable ZIP and verifies the release job digest', () => {
  assert.deepEqual(resolveReleaseAsset(releaseMetadata(), 'v1.0.97', assetDigest), {
    version, fileName: 'wppconnect-extension-v1.0.97.zip', sha256: assetDigest
  })
  assert.equal(resolveReleaseAsset(releaseMetadata(), 'v1.0.97').sha256, assetDigest)
})

for (const [name, change] of [
  ['draft', release => { release.isDraft = true }],
  ['prerelease', release => { release.isPrerelease = true }],
  ['different tag', release => { release.tagName = 'v1.0.98' }],
  ['missing ZIP', release => { release.assets = [] }],
  ['wrong filename', release => { release.assets[0].name = 'other.zip' }],
  ['missing digest', release => { delete release.assets[0].digest }],
  ['incomplete asset', release => { release.assets[0].state = 'pending' }],
  ['duplicate ZIP', release => { release.assets.push({ ...release.assets[0] }) }]
]) {
  test(`rejects release metadata with a ${name}`, () => {
    const release = releaseMetadata()
    change(release)
    assert.throws(() => resolveReleaseAsset(release, 'v1.0.97'))
  })
}

test('rejects an artifact replaced after the release job created it', () => {
  assert.throws(() => resolveReleaseAsset(releaseMetadata(), 'v1.0.97', 'b'.repeat(64)), /differs from the artifact/)
})

test('rejects invalid release input before interpolating a tag into git or download commands', () => {
  for (const tag of ['--help', '../main', 'v1.0.97-beta', 'v01.0.97']) {
    assert.throws(() => resolveReleaseAsset({ ...releaseMetadata(), tagName: tag }, tag))
  }
})
