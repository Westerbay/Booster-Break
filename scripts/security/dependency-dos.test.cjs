const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const { test } = require('node:test')
const { once } = require('node:events')
const http = require('node:http')
const vm = require('node:vm')

const expected = { minimatch: ['10.2.5'] }
// Follow reachable dependency links; obsolete virtual-store entries are not installed dependencies.
function installedPackages() {
  const pending = [path.resolve('node_modules')]
  for (const root of ['apps', 'packages', 'infra']) {
    if (fs.existsSync(root))
      for (const entry of fs.readdirSync(root))
        pending.push(path.resolve(root, entry, 'node_modules'))
  }
  const seen = new Set()
  const found = new Map()
  while (pending.length) {
    const directory = pending.pop()
    if (!fs.existsSync(directory)) continue
    const real = fs.realpathSync(directory)
    if (seen.has(real)) continue
    seen.add(real)
    for (const entry of fs.readdirSync(directory)) {
      const location = path.join(directory, entry)
      if (entry.startsWith('@')) {
        pending.push(location)
      } else if (!entry.startsWith('.')) {
        pending.push(path.join(location, 'node_modules'))
        if (fs.existsSync(location)) {
          let parent = path.dirname(fs.realpathSync(location))
          if (path.basename(parent).startsWith('@')) parent = path.dirname(parent)
          if (path.basename(parent) === 'node_modules') pending.push(parent)
        }
        if (Object.hasOwn(expected, entry) && fs.existsSync(path.join(location, 'package.json'))) {
          const manifest = JSON.parse(fs.readFileSync(path.join(location, 'package.json'), 'utf8'))
          found.set(fs.realpathSync(location), {
            location: fs.realpathSync(location),
            name: manifest.name,
            version: manifest.version,
          })
        }
      }
    }
  }
  return [...found.values()]
}
const packages = installedPackages()
test('every security-patched dependency version is installed', () => {
  for (const [name, versions] of Object.entries(expected))
    for (const version of versions) {
      assert.ok(
        packages.some((p) => p.name === name && p.version === version),
        `missing ${name}@${version}; run a full frozen install`,
      )
    }
})
for (const pkg of packages) {
  if (!expected[pkg.name].includes(pkg.version)) continue
  const label = `${pkg.name}@${pkg.version}`
  if (pkg.name === 'minimatch')
    for (const format of ['commonjs', 'esm'])
      test(`${label} ${format}: bounded preprocessing preserves ordinary matches`, () => {
        const entry = path.join(pkg.location, 'dist', format, 'index.js')
        const result = spawnSync(
          process.execPath,
          [
            '-e',
            `
      const assert = require('node:assert/strict');
      const { Minimatch } = require(${JSON.stringify(entry)});
      const options = { optimizationLevel: 2, braceExpandMax: 64 };
      const bounded = new Minimatch(Array(20).fill('**/../a/b').join('/'), options);
      assert.equal(bounded.set.length, 64);
      const ordinary = new Minimatch('**/../a/b/**/../c/d', options);
      assert.equal(ordinary.match('../a/b/../c/d'), true);
      assert.equal(ordinary.match('x/a/b/y/c/d'), true);
      const large = new Minimatch('{x,*}/{0..999}', { optimizationLevel: 2 });
      assert.equal(large.set.length, 2000);
      assert.equal(large.match('y/999'), true);
      assert.equal(large.match('.y/5'), false);
    `,
          ],
          { timeout: 5000 },
        )
        assert.ifError(result.error)
        assert.equal(result.status, 0, result.stderr.toString())
      })
  if (pkg.name === 'glob')
    for (const format of ['commonjs', 'esm'])
      test(`${label} ${format}: cancellation stops directory reads`, async (t) => {
        const manifest = JSON.parse(
          fs.readFileSync(path.join(pkg.location, 'package.json'), 'utf8'),
        )
        const api =
          format === 'commonjs'
            ? require(pkg.location)
            : await import(
                require('node:url').pathToFileURL(path.join(pkg.location, manifest.module)).href
              )
        const { glob, globSync, globStreamSync } = api
        const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'glob-security-'))
        t.after(() => fs.rmSync(cwd, { recursive: true, force: true }))
        for (let i = 0; i < 8; i++) {
          fs.mkdirSync(path.join(cwd, `a${i}`, 'b'), { recursive: true })
          fs.writeFileSync(path.join(cwd, `a${i}`, 'b', 'file.txt'), 'synthetic')
        }
        assert.equal(globSync('**/*.txt', { cwd }).length, 8)
        for (const mode of ['async', 'sync-stream']) {
          const controller = new AbortController()
          const reason = new Error('synthetic cancellation')
          let calls = 0
          const count = () => {
            if (++calls === 1) controller.abort(reason)
          }
          const counted = {
            ...fs,
            readdir(...args) {
              count()
              return fs.readdir(...args)
            },
            readdirSync(...args) {
              count()
              return fs.readdirSync(...args)
            },
          }
          if (mode === 'async')
            await assert.rejects(
              glob('**', { cwd, signal: controller.signal, fs: counted }),
              (error) => error === reason,
            )
          else
            await new Promise((resolve, reject) => {
              const stream = globStreamSync('**', { cwd, signal: controller.signal, fs: counted })
              stream.on('error', (error) => {
                try {
                  assert.equal(error, reason)
                  resolve()
                } catch (failure) {
                  reject(failure)
                }
              })
              stream.on('end', () => reject(new Error('expected cancellation')))
              stream.resume()
            })
          await new Promise((resolve) => setTimeout(resolve, 100))
          assert.equal(calls, 1, `${mode}: no traversal after abort`)
        }
      })
  if (pkg.name === 'follow-redirects')
    test(`${label}: cross-realm sensitive headers are removed on redirect`, async (t) => {
      const client = require(pkg.location).http
      let firstHeaders
      const destination = http.createServer((req, res) => {
        res.end(JSON.stringify(req.headers))
      })
      destination.listen(0, '127.0.0.1')
      await once(destination, 'listening')
      t.after(() => new Promise((resolve) => destination.close(resolve)))
      const source = http.createServer((req, res) => {
        firstHeaders = req.headers
        res.writeHead(302, { Location: `http://127.0.0.1:${destination.address().port}/target` })
        res.end()
      })
      source.listen(0, '127.0.0.1')
      await once(source, 'listening')
      t.after(() => new Promise((resolve) => source.close(resolve)))
      const headers = await new Promise((resolve, reject) => {
        const request = client.get(
          `http://127.0.0.1:${source.address().port}/`,
          {
            sensitiveHeaders: vm.runInNewContext('["X-Test-Credential"]'),
            headers: {
              'X-Test-Credential': 'synthetic-secret',
              Authorization: 'synthetic-auth',
              'X-Safe': 'keep',
            },
          },
          (response) => {
            let body = ''
            response.on('data', (chunk) => (body += chunk))
            response.on('end', () => resolve(JSON.parse(body)))
          },
        )
        request.on('error', reject)
        request.setTimeout(2000, () => request.destroy(new Error('local test timeout')))
      })
      assert.equal(firstHeaders['x-test-credential'], 'synthetic-secret')
      assert.equal(headers['x-test-credential'], undefined)
      assert.equal(headers.authorization, undefined)
      assert.equal(headers['x-safe'], 'keep')
    })
  if (pkg.name === 'joi')
    test(`${label}: multiple email validation handles long whitespace`, () => {
      const result = spawnSync(
        process.execPath,
        [
          '-e',
          `
      const assert = require('node:assert/strict');
      const Joi = require(${JSON.stringify(pkg.location)});
      const schema = Joi.string().email({ multiple: true, tlds: { allow: false } });
      assert.ok(schema.validate(' '.repeat(100000)).error);
      assert.equal(schema.validate('one@example.test, two@example.test').error, undefined);
      assert.ok(schema.validate('invalid').error);
    `,
        ],
        { timeout: 2000 },
      )
      assert.ifError(result.error)
      assert.equal(result.status, 0, result.stderr.toString())
    })
}
