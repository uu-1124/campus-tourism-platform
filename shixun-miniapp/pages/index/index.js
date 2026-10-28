const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: {
    slides: [{ id: 'campus', image: content.fallbackImage }],
    recommendedActivity: null,
    hotVideos: [],
    featuredBuilding: null,
    loading: true,
    errors: {}
  },
  onShow() { this.loadHome() },
  onPullDownRefresh() { this.loadHome().finally(() => wx.stopPullDownRefresh()) },
  async loadHome() {
    if (this._loading) return
    this._loading = true
    this.setData({ loading: true, errors: {} })
    const results = await Promise.allSettled([
      content.loadBanners(app, api),
      app.request({ url: api.scenicList(1, 8) }),
      app.request({ url: api.activityList + '?pageNum=1&pageSize=30' }),
      app.request({ url: api.videoList + '?type=1&pageNum=1&pageSize=20' })
    ])
    const [banners, buildings, activities, videos] = results
    const update = { loading: false, errors: {} }
    if (banners.status === 'fulfilled' && banners.value.length) update.slides = banners.value
    else update.errors.banner = true
    if (buildings.status === 'fulfilled') {
      const rows = content.rows(buildings.value).filter(content.published).map(content.normalizeBuilding)
      update.featuredBuilding = rows[0] || null
    } else update.errors.building = true
    if (activities.status === 'fulfilled') {
      update.recommendedActivity = content.rows(activities.value).filter(content.published).map(item => content.normalizeActivity(item)).find(item => item.state === 'ongoing' || item.state === 'published') || null
    } else update.errors.activity = true
    if (videos.status === 'fulfilled') {
      update.hotVideos = content.rows(videos.value).filter(content.published).map(item => ({
        ...item,
        title: item.name || item.tittle || '校园宣传片',
        subtitle: item.content || item.tittle || '山西农业大学校园影像',
        image: content.firstImage(item.cover) || content.fallbackImage,
        src: item.video || item.videoUrl || ''
      })).filter(item => item.src).sort((a, b) => Number(a.inx || 999) - Number(b.inx || 999)).slice(0, 2)
    } else update.errors.video = true
    this.setData(update)
    this._loading = false
  },
  imageError(e) {
    const field = e.currentTarget.dataset.field
    const index = Number(e.currentTarget.dataset.index)
    if (field === 'slides' && this.data.slides[index]) this.setData({ ['slides[' + index + '].image']: content.fallbackImage })
    if (field === 'hotVideos' && this.data.hotVideos[index]) this.setData({ ['hotVideos[' + index + '].image']: content.fallbackImage })
    if (field === 'featuredBuilding' && this.data.featuredBuilding) this.setData({ 'featuredBuilding.image': content.fallbackImage })
  },
  openActivity() {
    const item = this.data.recommendedActivity
    if (item) wx.navigateTo({ url: '/pages/activity-detail/activity-detail?id=' + encodeURIComponent(item.id) })
  },
  openVideo(e) { wx.navigateTo({ url: '/pages/videos/videos?id=' + encodeURIComponent(e.currentTarget.dataset.id) }) },
  goVideos() { wx.navigateTo({ url: '/pages/videos/videos' }) },
  openBuilding() {
    const item = this.data.featuredBuilding
    if (item) wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(item.id) })
  },
  goRecognition() { wx.switchTab({ url: '/pages/recognition/recognition' }) },
  goScenic() { wx.switchTab({ url: '/pages/scenic/scenic' }) },
  goActivities() { wx.navigateTo({ url: '/pages/activities/activities' }) },
  goVr() { wx.navigateTo({ url: '/pages/vr/vr' }) }
})
