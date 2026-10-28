const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()
Page({
  data: { all: [], list: [], mode: 'current', loading: true, error: false },
  onLoad() { this.load() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },
  async load() {
    if (this._loading) return
    this._loading = true
    this.setData({ loading: true, error: false })
    try {
      const response = await app.request({ url: api.activityList + '?pageNum=1&pageSize=100' })
      this.setData({ all: content.rows(response).filter(content.published).map(item => content.normalizeActivity(item)) })
      this.filter()
    } catch (e) { this.setData({ error: true }) }
    finally { this._loading = false; this.setData({ loading: false }) }
  },
  changeMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }); this.filter() },
  filter() { this.setData({ list: this.data.all.filter(item => this.data.mode === 'all' || item.state === 'ongoing' || item.state === 'published') }) },
  imageError(e) {
    const index = e.currentTarget.dataset.index
    if (this.data.list[index] && this.data.list[index].image !== content.fallbackImage) this.setData({ ['list[' + index + '].image']: content.fallbackImage })
  },
  openDetail(e) { wx.navigateTo({ url: '/pages/activity-detail/activity-detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) }) }
})
