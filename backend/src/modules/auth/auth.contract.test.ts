import assert from 'node:assert/strict'
import test from 'node:test'
import { PERMISSIONS } from '../../config/permissions'

test('all foundation permissions use resource:action convention', () => {
  for (const code of Object.values(PERMISSIONS)) assert.match(code, /^[a-z]+:[a-z]+$/)
})

test('permission vocabulary does not contain legacy dot or plural codes', () => {
  assert.equal(Object.values(PERMISSIONS).some((code) => code.includes('.')), false)
  assert.equal(Object.values(PERMISSIONS).some((code) => /agencies|branches|users|roles/.test(code)), false)
})
