const fallbackImage = 'https://ar-travel-file.1jiaohu.com/resource/20260610/d18d6024be6749f18fa5208b5cff939c.jpg'

function firstImage(value) {
  return typeof value === 'string' ? value.split(',').map(x => x.trim()).find(Boolean) || '' : ''
}

function normalizeBuilding(item) {
  return { ...item, image: firstImage(item.backgroundCover || item.pictureUrl) || fallbackImage }
}

function coordinates(item) {
  if (!item) return null
  const latitude = Number(item.latitude)
  const longitude = Number(item.longitude)
  if (latitude && longitude) return { latitude, longitude }
  const pair = String(item.longitude || item.latitude || '').split(',').map(Number)
  return pair.length === 2 && pair[0] && pair[1] ? { latitude: pair[0], longitude: pair[1] } : null
}

function payload(response) { return response.data !== undefined ? response.data : response.result }
function rows(response) {
  const data = payload(response)
  return Array.isArray(response.rows) ? response.rows : Array.isArray(data) ? data : []
}
function published(item) { return item.status == null || Number(item.status) === 1 }
function timestamp(value, endOfDay) {
  if (!value) return null
  const text = String(value).replace(/-/g, '/')
  const time = new Date(text + (text.length === 10 ? endOfDay ? ' 23:59:59' : ' 00:00:00' : '')).getTime()
  return Number.isFinite(time) ? time : null
}
function normalizeActivity(item, now = Date.now()) {
  const start = timestamp(item.startDate, false)
  const end = timestamp(item.endDate, true)
  const state = end !== null && now > end ? 'ended' : start !== null && now < start ? 'upcoming' : start !== null || end !== null ? 'ongoing' : 'published'
  const labels = { ended: '已结束', upcoming: '即将开始', ongoing: '进行中', published: '已发布' }
  return { ...normalizeBuilding(item), image: firstImage(item.pictureUrl || item.backgroundCover) || fallbackImage, state, stateLabel: labels[state], dateLabel: [item.startDate, item.endDate].filter(Boolean).join(' 至 ') }
}
function normalizeActivityDetail(item) {
  const content = typeof item.content === 'string' ? item.content : ''
  const leadingImage = content.match(/^\s*<p[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*\/?>(?:\s*<br\s*\/?>)?\s*<\/p>/i)
  const hero = leadingImage ? leadingImage[1] : firstImage(item.pictureUrl || item.backgroundCover) || fallbackImage
  const body = (leadingImage ? content.slice(leadingImage[0].length) : content)
    .replace(/\scontenteditable=["'][^"']*["']/gi, '')
    .replace(/\sdata-[\w-]+=["'][^"']*["']/gi, '')
    .replace(/<img\b([^>]*)>/gi, (tag, attributes) => '<img' + attributes.replace(/\sstyle=["'][^"']*["']/i, '') + ' style="width:100%;height:auto;display:block">')
    .trim()
  return { ...normalizeActivity(item), hero, body: body || item.introduction || '暂无活动详情' }
}
async function loadBanners(app, api) {
  const response = await app.request({ url: api.slideshowList })
  return rows(response).filter(published).map(item => ({ id: item.id, image: firstImage(item.pictureUrl || item.background) })).filter(item => item.image)
}
module.exports = { fallbackImage, firstImage, normalizeBuilding, coordinates, normalizeActivity, normalizeActivityDetail, payload, rows, published, loadBanners }
