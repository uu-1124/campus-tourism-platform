const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: { id: '', photo: '', building: null, image: content.fallbackImage, loading: true, error: '' },
  onLoad(options) {
    const success = app.globalData.recognitionSuccess || {}
    const building = success.building || null
    this.setData({ id: options.id || (building && building.id) || '', photo: success.photo || '', building })
    app.globalData.recognitionSuccess = null
    this.load()
  },
  async load() {
    this.setData({ loading: true, error: '' })
    try {
      let building = this.data.building
      if (!building || !building.name) {
        const response = await app.request({ url: api.scenicDetail(this.data.id) })
        building = content.payload(response)
      }
      if (!building) throw new Error('not found')
      const normalized = content.normalizeBuilding(building)
      this.setData({ building: normalized, image: this.data.photo || normalized.image })
      wx.setNavigationBarTitle({ title: '识别成功' })
    } catch (e) {
      this.setData({ error: '识别结果加载失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
  openDetail() {
    if (!this.data.id) return
    wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(this.data.id) + '&recognized=1' })
  },
  retry() { wx.switchTab({ url: '/pages/recognition/recognition' }) },
  openMap() {
    const item = this.data.building || {}
    const location = content.coordinates(item)
    if (!location) return wx.showToast({ title: '该建筑暂未配置位置', icon: 'none' })
    wx.openLocation({ ...location, name: item.name || '校园建筑', address: item.address || item.remarks || '山西农业大学' })
  },
  imageError() {
    if (this.data.image !== content.fallbackImage) this.setData({ image: (this.data.building && this.data.building.image) || content.fallbackImage })
  }
})
