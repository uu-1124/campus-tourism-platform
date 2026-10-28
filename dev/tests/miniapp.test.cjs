const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const root = path.resolve(__dirname, '../../shixun-miniapp')
const content = require(path.join(root, 'utils/content'))

function page(name, app = {}, overrides = {}) {
  let definition
  const navigation = []
  const wx = {
    navigateTo: options => navigation.push(options.url),
    switchTab: options => navigation.push(options.url),
    showToast() {},
    stopPullDownRefresh() {},
    setNavigationBarTitle() {},
    compressImage: options => options.success({ tempFilePath: options.src }),
    ...overrides
  }
  const filename = path.join(root, 'pages', name, name + '.js')
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require: createRequire(filename), Page: value => { definition = value }, getApp: () => app, wx, console })
  definition.data = JSON.parse(JSON.stringify(definition.data))
  definition.setData = update => {
    for (const [key, value] of Object.entries(update)) {
      const segments = key.replace(/\[(\d+)\]/g, '.$1').split('.')
      let target = definition.data
      for (const segment of segments.slice(0, -1)) target = target[segment]
      target[segments.at(-1)] = value
    }
  }
  return { instance: definition, navigation, wx }
}

test('configured pages and their assets exist', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  assert.equal(config.pages[0], 'pages/welcome/welcome')
  for (const name of config.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.existsSync(path.join(root, name + '.' + extension)), name + '.' + extension)
  }
  for (const tab of config.tabBar.list) assert.ok(config.pages.includes(tab.pagePath))
})

test('activities distinguish published, ongoing, upcoming and ended', () => {
  const now = new Date('2026/09/17 12:00:00').getTime()
  assert.equal(content.normalizeActivity({}, now).state, 'published')
  assert.equal(content.normalizeActivity({ startDate: '2026-09-01', endDate: '2026-09-17' }, now).state, 'ongoing')
  assert.equal(content.normalizeActivity({ startDate: '2026-10-01' }, now).state, 'upcoming')
  assert.equal(content.normalizeActivity({ endDate: '2026-09-16' }, now).state, 'ended')
})

test('activity detail promotes the leading article image and cleans editor attributes', () => {
  const activity = content.normalizeActivityDetail({
    id: 'run',
    pictureUrl: 'card.jpg',
    content: '<p><img src="poster.jpg" contenteditable="false" data-editor-id="1"/></p><p>活动正文</p>'
  })
  assert.equal(activity.hero, 'poster.jpg')
  assert.equal(activity.image, 'card.jpg')
  assert.doesNotMatch(activity.body, /contenteditable|data-editor-id|poster\.jpg/)
  assert.match(activity.body, /活动正文/)
  const bodyImage = content.normalizeActivityDetail({ content: '<p>正文</p><img src="body.jpg" style="max-width:100%">' })
  assert.equal((bodyImage.body.match(/style=/g) || []).length, 1)
  assert.match(bodyImage.body, /width:100%;height:auto;display:block/)
})

test('activity list loads recommendations and opens the dedicated detail page', async () => {
  const app = { request: async () => ({ rows: [{ id: 'run', name: '酷跑活动', status: 1, pictureUrl: 'run.jpg' }] }) }
  const { instance, navigation } = page('activities', app)
  await instance.load()
  assert.equal(instance.data.list.length, 1)
  assert.equal(instance.data.list[0].image, 'run.jpg')
  instance.openDetail({ currentTarget: { dataset: { id: 'run' } } })
  assert.equal(navigation[0], '/pages/activity-detail/activity-detail?id=run')
})

test('activity detail loads published content and exposes retry on failure', async () => {
  const app = { request: async () => ({ data: { id: 'run', name: '酷跑活动', status: 1, pictureUrl: 'run.jpg', content: '<p>活动正文</p>' } }) }
  const { instance } = page('activity-detail', app)
  instance.setData({ id: 'run' })
  await instance.load()
  assert.equal(instance.data.item.name, '酷跑活动')
  assert.match(instance.data.item.body, /活动正文/)
  app.request = async () => { throw new Error('网络异常') }
  await instance.load()
  assert.equal(instance.data.loading, false)
  assert.match(instance.data.error, /网络异常/)
})

test('welcome loads enabled slideshow list and supports navigation', async () => {
  const { instance, navigation } = page('welcome', { request: async () => ({ rows: [{ id: '1', status: 1, pictureUrl: 'a.jpg' }, { id: '2', status: 0, pictureUrl: 'b.jpg' }, { id: '3', status: 1, pictureUrl: 'c.jpg' }] }) })
  instance.onLoad()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(instance.data.slides.length, 2)
  instance.onChange({ detail: { current: 1 } })
  assert.equal(instance.data.current, 1)
  instance.onHide()
  assert.equal(instance.data.autoplay, false)
  instance.explore()
  assert.equal(navigation[0], '/pages/index/index')
})

test('home aggregates actual buildings, published activities and playable video', async () => {
  const app = { request: async ({ url }) => {
    if (url.includes('slideshow')) return { rows: [{ id: 'slide', status: 1, pictureUrl: 'banner.jpg' }] }
    if (url.includes('scenicspot')) return { rows: [{ id: 'building', name: 'Building', pictureUrl: 'a.jpg,b.jpg' }] }
    if (url.includes('getActivityList')) return { rows: [{ id: 'activity', status: 1 }, { id: 'hidden', status: 0 }, { id: 'ended', endDate: '2020-01-01' }] }
    return { rows: [{ id: 'film', video: 'film.mp4', cover: 'film.jpg' }, { id: 'empty', video: '' }] }
  } }
  const { instance } = page('index', app)
  await instance.loadHome()
  assert.equal(instance.data.scenics[0].image, 'a.jpg')
  assert.equal(instance.data.activities.length, 1)
  assert.equal(instance.data.videos.length, 1)
  assert.equal(instance.data.videos[0].src, 'film.mp4')
  assert.equal(instance.data.loading, false)
})

test('home exposes section errors and can retry', async () => {
  const app = { request: async () => { throw new Error('offline') } }
  const { instance } = page('index', app)
  await instance.loadHome()
  assert.equal(instance.data.errors.scenic, true)
  assert.equal(instance.data.errors.activity, true)
  assert.equal(instance.data.errors.video, true)
  app.request = async () => ({ rows: [] })
  await instance.loadHome()
  assert.equal(Object.keys(instance.data.errors).length, 0)
  assert.equal(instance.data.videos.length, 0)
})

test('successful recognition automatically opens building detail', async () => {
  const app = { upload: async () => ({ code: 200, data: { resultCode: 1, travelScenicSpot: { id: '819723818527625216' } } }), globalData: {} }
  const { instance, navigation } = page('recognition', app)
  instance.onShow()
  await instance.recognize('photo.jpg')
  assert.equal(navigation[0], '/pages/detail/detail?id=819723818527625216&recognized=1')
  assert.equal(instance.data.loading, false)
})

test('unmatched recognition opens failure page with backend recommendations', async () => {
  const app = { upload: async () => ({ code: 200, result: { resultCode: 2, recommendTravelScenicSpots: [{ id: 'recommended' }] } }), globalData: {} }
  const { instance, navigation } = page('recognition', app)
  instance.onShow()
  await instance.recognize('photo.jpg')
  assert.equal(navigation[0], '/pages/failure/failure')
  assert.equal(app.globalData.recognitionFailure.reason, 'unmatched')
  assert.equal(app.globalData.recognitionFailure.recommendations[0].id, 'recommended')
})

test('upload error opens service failure; recommendation list can recover', async () => {
  const app = { upload: async () => { throw new Error('timeout') }, globalData: {}, request: async () => ({ rows: [{ id: 'alternative', pictureUrl: 'alternative.jpg' }] }) }
  const { instance } = page('recognition', app)
  instance.onShow()
  await instance.recognize('photo.jpg')
  assert.equal(app.globalData.recognitionFailure.reason, 'service')
  const failure = page('failure', app)
  failure.instance.onLoad()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(failure.instance.data.list[0].id, 'alternative')
  assert.equal(app.globalData.recognitionFailure, null)
  failure.instance.openDetail({ currentTarget: { dataset: { id: 'alternative' } } })
  assert.equal(failure.navigation[0], '/pages/detail/detail?id=alternative')
})

test('recognition prevents duplicate uploads and navigation while hidden', async () => {
  let finish
  let uploads = 0
  const app = { globalData: {}, upload: () => { uploads++; return new Promise(resolve => { finish = resolve }) } }
  const { instance, navigation } = page('recognition', app)
  instance.onShow()
  const pending = instance.recognize('photo.jpg')
  await new Promise(resolve => setImmediate(resolve))
  await instance.recognize('photo.jpg')
  assert.equal(uploads, 1)
  instance.onHide()
  finish({ code: 200, data: { resultCode: 1, travelScenicSpot: { id: '1' } } })
  await pending
  assert.equal(navigation.length, 0)
  assert.equal(instance.data.loading, false)
})

test('cancelling image selection does not upload or navigate', () => {
  let uploaded = false
  const { instance, navigation } = page('recognition', { upload: () => { uploaded = true } }, { chooseMedia: options => { options.fail({ errMsg: 'chooseMedia:fail cancel' }); options.complete() } })
  instance.chooseAlbum()
  assert.equal(instance.data.choosing, false)
  assert.equal(uploaded, false)
  assert.equal(navigation.length, 0)
})

test('detail load failure has a retry state instead of endless loading', async () => {
  const { instance } = page('detail', { request: async () => { throw new Error('offline') } })
  instance.setData({ id: 'missing' })
  await instance.load()
  assert.equal(instance.data.loading, false)
  assert.ok(instance.data.error)
})

test('failure screen presents top result and two similar buildings', () => {
  const app = { globalData: { recognitionFailure: { reason: 'unmatched', recommendations: [
    { id: 'han', name: '韩氏楼', pictureUrl: 'han.jpg' },
    { id: 'chong', name: '崇圣楼', pictureUrl: 'chong.jpg' },
    { id: 'library', name: '亭兰图书馆', pictureUrl: 'library.jpg' }
  ] } } }
  const { instance } = page('failure', app)
  instance.onLoad()
  assert.equal(instance.data.primary.name, '韩氏楼')
  assert.equal(instance.data.similar.length, 2)
  assert.equal(instance.data.similar[0].name, '崇圣楼')
  instance.imageError({ currentTarget: { dataset: { index: 0 } } })
  assert.equal(instance.data.primary.image, content.fallbackImage)
})

test('VR list shows only enabled records related to published buildings', async () => {
  const app = { request: async ({ url }) => url.includes('list1') ? { rows: [
    { id: 'vr1', status: 1, identify: 'campus', vrCover: 'vr.jpg' },
    { id: 'vr2', status: 0, identify: 'hidden' }
  ] } : { rows: [
    { id: 'building1', vrId: 'vr1', name: 'Building' },
    { id: 'building2', vrId: 'vr2', name: 'Hidden' }
  ] } }
  const { instance, navigation } = page('vr', app)
  await instance.load()
  assert.equal(instance.data.list.length, 1)
  assert.equal(instance.data.list[0].image, 'vr.jpg')
  instance.open({ currentTarget: { dataset: { id: 'building1' } } })
  assert.equal(navigation[0], '/pages/vr-viewer/vr-viewer?id=building1')
})

test('VR viewer refuses unpublished or local HTTP panorama URLs', async () => {
  const { resolveVrUrl } = require(path.join(root, 'utils/vr'))
  assert.equal(resolveVrUrl({ vrUrl: 'http://127.0.0.1:5501/tour.html?type=null' }), '')
  assert.equal(resolveVrUrl({ vrUrl: 'https://example.com/tour.html?type=campus' }), 'https://example.com/tour.html?type=campus')
  let views = 0
  const app = { request: async ({ url }) => {
    if (url.includes('scenicspot')) return { data: { id: '1', isVr: 1, vrId: 'vr1', vrUrl: 'http://127.0.0.1:5501/tour.html?type=campus' } }
    if (url.includes('list1')) return { rows: [{ id: 'vr1', status: 1, identify: 'campus' }] }
    views++
    return { code: 200 }
  } }
  const { instance } = page('vr-viewer', app)
  instance.setData({ id: '1' })
  await instance.load()
  assert.equal(instance.data.url, '')
  assert.match(instance.data.error, /HTTPS/)
  assert.equal(views, 0)
})

test('VR viewer opens valid HTTPS panorama and records one view', async () => {
  let views = 0
  const app = { request: async ({ url }) => {
    if (url.includes('scenicspot')) return { data: { id: '1', isVr: 1, vrId: 'vr1', name: 'Campus', vrUrl: 'https://example.com/tour.html?type=campus' } }
    if (url.includes('list1')) return { rows: [{ id: 'vr1', status: 1, identify: 'campus' }] }
    views++
    return { code: 200 }
  } }
  const { instance } = page('vr-viewer', app)
  instance.setData({ id: '1' })
  await instance.load()
  assert.equal(instance.data.url, 'https://example.com/tour.html?type=campus')
  assert.equal(views, 0)
  instance.onVrLoaded()
  instance.onVrLoaded()
  assert.equal(views, 1)
})
