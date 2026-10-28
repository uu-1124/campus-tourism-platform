const env = require('./env')

function isUsableVrUrl(value) {
  if (typeof value !== 'string') return false
  return /^https:\/\/[a-z0-9.-]+(?::443)?(?:[/?#]|$)/i.test(value) && !/^https:\/\/(?:localhost|0\.0\.0\.0|127(?:\.\d+){3}|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2})(?::|[/?#]|$)/i.test(value)
}

function resolveVrUrl(item) {
  const original = item && item.vrUrl
  if (isUsableVrUrl(original) && !/[?&]type=(?:null|undefined)(?:&|$)/i.test(original)) return original
  const base = (env.vrBaseUrl || '').trim()
  const identify = item && item.vrIdentify
  if (!isUsableVrUrl(base) || !identify) return ''
  return base + (base.includes('?') ? '&' : '?') + 'type=' + encodeURIComponent(identify)
}

module.exports = { isUsableVrUrl, resolveVrUrl }
