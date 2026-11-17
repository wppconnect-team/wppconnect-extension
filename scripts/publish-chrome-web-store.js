const { createHash } = require('node:crypto')
const { appendFile, readFile } = require('node:fs/promises')
const { setTimeout: delay } = require('node:timers/promises')

function compareVersions (left, right) {
  const parse = value => {
    if (!/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/.test(value || '')) {
      throw new Error('Invalid Chrome extension version')
    }
    const parts = value.split('.').map(Number)
    if (parts.some(part => part > 65535) || parts.every(part => part === 0)) {
      throw new Error('Invalid Chrome extension version')
    }
    return [...parts, 0, 0, 0].slice(0, 4)
  }
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 4; index++) {
    if (a[index] !== b[index]) return Math.sign(a[index] - b[index])
  }
  return 0
}

function revisionVersions (revision) {
  const versions = revision?.distributionChannels?.map(channel => channel.crxVersion) || []
  if (revision && versions.length === 0) throw new Error('Store revision has no version information')
  for (const version of versions) compareVersions(version, version)
  return versions
}

function resolveReleaseAsset (release, tag, expectedSha256 = '') {
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '') || release.tagName !== tag) throw new Error('Invalid release tag')
  const version = tag.slice(1)
  compareVersions(version, version)
  if (release.isDraft !== false || release.isPrerelease !== false) throw new Error('Only published stable releases can be submitted')
  const fileName = `wppconnect-extension-${tag}.zip`
  const assets = release.assets?.filter(asset => asset.name === fileName) || []
  if (assets.length !== 1 || assets[0].state !== 'uploaded' || !/^sha256:[a-f0-9]{64}$/.test(assets[0].digest || '')) {
    throw new Error('Release must contain one uploaded extension ZIP with a published SHA-256 digest')
  }
  const sha256 = assets[0].digest.slice(7)
  if (expectedSha256 && expectedSha256 !== sha256) throw new Error('Published ZIP differs from the artifact produced by the release job')
  return { version, fileName, sha256 }
}

async function publishPackage ({
  publisherId, itemId, version, packageBytes, sha256, accessToken,
  fetchImpl = fetch, sleep = delay, maxPolls = 36, pollInterval = 5000
}) {
  if (!/^[a-zA-Z0-9_-]+$/.test(publisherId || '') || !/^[a-p]{32}$/.test(itemId || '')) {
    throw new Error('A valid publisher ID and extension ID are required')
  }
  compareVersions(version, version)
  if (!accessToken) throw new Error('Chrome Web Store access token is required')
  if (!/^[a-f0-9]{64}$/.test(sha256 || '') || createHash('sha256').update(packageBytes).digest('hex') !== sha256) {
    throw new Error('Release ZIP SHA-256 mismatch')
  }
  const resource = `publishers/${publisherId}/items/${itemId}`
  const base = 'https://chromewebstore.googleapis.com'
  const request = async (suffix, { method = 'GET', body, upload = false } = {}) => {
    // Mutations are never retried: a lost response can still mean the request succeeded.
    const response = await fetchImpl(`${base}${upload ? '/upload' : ''}/v2/${resource}:${suffix}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': upload ? 'application/zip' : 'application/json' } : {})
      },
      ...(body ? { body: upload ? body : JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(30000)
    })
    if (!response.ok) throw new Error(`Chrome Web Store ${suffix} failed (HTTP ${response.status}); check the Developer Dashboard before retrying`)
    const data = await response.json()
    if (data.itemId !== itemId || data.name !== resource) throw new Error('Chrome Web Store response identifies a different item')
    return data
  }
  const status = await request('fetchStatus')
  if (status.takenDown) throw new Error('The store item is taken down; check the Developer Dashboard')
  const published = revisionVersions(status.publishedItemRevisionStatus)
  const submitted = revisionVersions(status.submittedItemRevisionStatus)
  if (status.publishedItemRevisionStatus && !['PUBLISHED', 'PUBLISHED_TO_TESTERS'].includes(status.publishedItemRevisionStatus.state)) {
    throw new Error('Unexpected published revision state; check the Developer Dashboard')
  }
  if ([...published, ...submitted].some(current => compareVersions(current, version) > 0)) {
    throw new Error('The store already has a newer version; refusing to downgrade')
  }
  const pendingState = status.submittedItemRevisionStatus?.state
  if (pendingState === 'PENDING_REVIEW') {
    if (submitted.every(current => compareVersions(current, version) === 0)) {
      return { action: 'already-submitted', state: pendingState, version }
    }
    throw new Error('Another version is pending review; leave it unchanged and retry after review completes')
  }
  if (pendingState === 'STAGED') throw new Error('A staged revision exists; resolve it in the Developer Dashboard')
  if (submitted.some(current => compareVersions(current, version) === 0)) {
    throw new Error('This version has a previous submission; check the Developer Dashboard before retrying')
  }
  if (published.some(current => compareVersions(current, version) === 0)) {
    return { action: 'already-published', state: status.publishedItemRevisionStatus.state, version }
  }
  if (pendingState && !['REJECTED', 'CANCELLED'].includes(pendingState)) {
    throw new Error('Unexpected store submission state; check the Developer Dashboard')
  }
  if (status.lastAsyncUploadState === 'IN_PROGRESS') throw new Error('Another upload is in progress; retry after it finishes')

  const upload = await request('upload', { method: 'POST', upload: true, body: packageBytes })
  let uploadState = upload.uploadState
  if (upload.crxVersion && compareVersions(upload.crxVersion, version) !== 0) {
    throw new Error('Uploaded extension version does not match the release')
  }
  for (let poll = 0; uploadState === 'IN_PROGRESS' && poll < maxPolls; poll++) {
    await sleep(pollInterval)
    const current = await request('fetchStatus')
    uploadState = current.lastAsyncUploadState
  }
  if (uploadState !== 'SUCCEEDED') throw new Error('Store upload did not succeed; no publish request was sent')
  if (upload.uploadState === 'SUCCEEDED' && !upload.crxVersion) throw new Error('Upload response has no version information')

  const result = await request('publish', {
    method: 'POST',
    body: { publishType: 'DEFAULT_PUBLISH', skipReview: false }
  })
  const acceptedStates = ['PENDING_REVIEW', 'PUBLISHED', 'PUBLISHED_TO_TESTERS']
  if (!acceptedStates.includes(result.state)) throw new Error('Publish request returned an unexpected state; check the Developer Dashboard')
  // Review can take days; only confirm that this specific revision was accepted.
  for (let poll = 0; poll < maxPolls; poll++) {
    const current = await request('fetchStatus')
    for (const revision of [current.submittedItemRevisionStatus, current.publishedItemRevisionStatus]) {
      if (revision && acceptedStates.includes(revision.state) && revisionVersions(revision).some(value => compareVersions(value, version) === 0)) {
        return { action: 'submitted', state: revision.state, version }
      }
    }
    if (poll + 1 < maxPolls) await sleep(pollInterval)
  }
  throw new Error('Publish was accepted but its revision could not be confirmed; check the Developer Dashboard before retrying')
}

async function main () {
  const result = await publishPackage({
    publisherId: process.env.CWS_PUBLISHER_ID,
    itemId: process.env.CWS_EXTENSION_ID,
    version: process.env.CWS_VERSION,
    packageBytes: await readFile(process.env.CWS_PACKAGE_PATH),
    sha256: process.env.CWS_SHA256,
    accessToken: process.env.CWS_ACCESS_TOKEN
  })
  const message = `Chrome Web Store ${result.version}: ${result.action} (${result.state}).`
  console.log(message)
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n\nGoogle review is required before a pending revision becomes available.\n`)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = { compareVersions, publishPackage, resolveReleaseAsset }
