const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: { id: '', item: null, image: content.fallbackImage, loading: true, error: '' },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  async load() {
    this.setData({ loading: true, error: '' })
    try {
      if (!this.data.id) throw new Error('missing id')
      const response = await app.request({ url: api.scenicDetail(this.data.id) })
      const item = content.payload(response)
      if (!item) throw new Error('not found')
      this.setData({ item, image: content.firstImage(item.backgroundCover || item.pictureUrl) || content.fallbackImage })
      wx.setNavigationBarTitle({ title: (item.name || '建筑') + ' VR漫游' })
    } catch (e) { this.setData({ error: 'VR介绍加载失败' }) }
    finally { this.setData({ loading: false }) }
  },
  enterVr() {
    if (this.data.item && Number(this.data.item.isVr) === 1 && this.data.item.vrId) {
      wx.navigateTo({ url: '/pages/vr-viewer/vr-viewer?id=' + encodeURIComponent(this.data.item.id) })
    }
  },
  backToDetail() { wx.navigateBack() },
  imageError() { if (this.data.image !== content.fallbackImage) this.setData({ image: content.fallbackImage }) }
})
