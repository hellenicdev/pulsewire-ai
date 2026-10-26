import assert from 'node:assert/strict'
import test from 'node:test'
import { safeHttpUrl } from './links.js'

test('allows http and https links', () => {
  assert.equal(safeHttpUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1')
  assert.equal(safeHttpUrl('  http://example.com/a  '), 'http://example.com/a')
})

test('rejects non-http links and non-strings', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), null)
  assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null)
  assert.equal(safeHttpUrl('//example.com'), null)
  assert.equal(safeHttpUrl('/relative'), null)
  assert.equal(safeHttpUrl(''), null)
  assert.equal(safeHttpUrl(null), null)
  assert.equal(safeHttpUrl(undefined), null)
})
