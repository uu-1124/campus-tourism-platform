const api = require('../../utils/api')
const { fallbackImage, loadBanners } = require('../../utils/content')
const app = getApp()
Page({
  data: {
    hero: { id: 'mingxian', image: fallbackImage }
  },
  onLoad() { loadBanners(app, api).then(slides => { if (slides.length) this.setData({ hero: slides[0] }) }).catch(() => {}) },
  imageError() { if (this.data.hero.image !== fallbackImage) this.setData({ 'hero.image': fallbackImage }) },
  explore() { wx.switchTab({ url: '/pages/index/index' }) },
  browse() { wx.switchTab({ url: '/pages/scenic/scenic' }) }
})
