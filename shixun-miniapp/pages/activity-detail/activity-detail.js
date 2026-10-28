const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: { id: '', item: null, loading: true, error: '' },
  onLoad(options) {
    this.setData({ id: options.id || '' })
    this.load()
  },
  async load() {
    this.setData({ loading: true, error: '' })
    try {
      if (!this.data.id) throw new Error('未找到活动')
      const response = await app.request({ url: api.scenicDetail(this.data.id) })
      const raw = content.payload(response)
      if (!raw || !content.published(raw)) throw new Error('活动不存在或未发布')
      const item = content.normalizeActivityDetail(raw)
      this.setData({ item })
      wx.setNavigationBarTitle({ title: item.name || '活动详情' })
    } catch (e) {
      this.setData({ error: e.message || '活动加载失败，请重试' })
    } finally {
      this.setData({ loading: false })
    }
  },
  imageError() {
    if (this.data.item && this.data.item.hero !== content.fallbackImage) this.setData({ 'item.hero': content.fallbackImage })
  }
})

