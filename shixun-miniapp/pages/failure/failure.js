const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()
Page({
  data: { photo: '', photoError: false, reason: 'unmatched', primary: null, similar: [], list: [], loading: false, error: false },
  onLoad() {
    const failure = app.globalData.recognitionFailure || {}
    this.setData({ photo: failure.photo || '', reason: failure.reason || 'unmatched' })
    this.setRecommendations((failure.recommendations || []).filter(content.published))
    app.globalData.recognitionFailure = null
    if (!this.data.list.length) this.loadRecommendations()
  },
  async loadRecommendations() {
    if (this.data.loading) return
    this.setData({ loading: true, error: false })
    try {
      const response = await app.request({ url: api.scenicList(1, 6) })
      this.setRecommendations(content.rows(response).filter(content.published))
    } catch (e) { this.setData({ error: true }) }
    finally { this.setData({ loading: false }) }
  },
  setRecommendations(items) {
    const list = items.map(content.normalizeBuilding)
    this.setData({ list, primary: list[0] || null, similar: list.slice(1, 3) })
  },
  imageError(e) {
    const index = e.currentTarget.dataset.index
    if (!this.data.list[index] || this.data.list[index].image === content.fallbackImage) return
    const update = { ['list[' + index + '].image']: content.fallbackImage }
    if (index === 0) update['primary.image'] = content.fallbackImage
    else if (index <= 2) update['similar[' + (index - 1) + '].image'] = content.fallbackImage
    this.setData(update)
  },
  submittedImageError() { this.setData({ photoError: true }) },
  retry() { wx.switchTab({ url: '/pages/recognition/recognition' }) },
  browse() { wx.switchTab({ url: '/pages/scenic/scenic' }) },
  openDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) }) }
})
