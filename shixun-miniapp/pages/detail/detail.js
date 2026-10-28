const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: {
    id: '', item: null, hero: content.fallbackImage, loading: true, error: '',
    type: 'building', recognized: false, language: 'zh', playing: false, audioLoading: false
  },
  onLoad(options) {
    this.setData({ id: options.id || '', type: options.type || 'building', recognized: options.recognized === '1' })
    this.audio = wx.createInnerAudioContext()
    this.audio.onPlay(() => this.setData({ playing: true, audioLoading: false }))
    this.audio.onPause(() => this.setData({ playing: false, audioLoading: false }))
    this.audio.onStop(() => this.setData({ playing: false, audioLoading: false }))
    this.audio.onEnded(() => this.setData({ playing: false, audioLoading: false }))
    this.audio.onError(() => {
      this.setData({ playing: false, audioLoading: false })
      wx.showToast({ title: '语音加载失败，请重试', icon: 'none' })
    })
    this.load()
  },
  onHide() { if (this.audio) this.audio.stop() },
  onUnload() { if (this.audio) { this.audio.destroy(); this.audio = null } },
  async load() {
    this.setData({ loading: true, error: '' })
    try {
      if (!this.data.id) throw new Error('missing id')
      const response = await app.request({ url: api.scenicDetail(this.data.id) })
      const item = content.payload(response)
      if (!item) throw new Error('not found')
      const hero = content.firstImage(item.backgroundCover || item.pictureUrl) || content.fallbackImage
      this.setData({ item, hero })
      if (this.data.type !== 'activity') app.request({ url: api.insertScenicViews(item.id), method: 'POST' }).catch(() => {})
      wx.setNavigationBarTitle({ title: item.name || '建筑可阅读' })
    } catch (e) { this.setData({ error: '内容加载失败，请重试' }) }
    finally { this.setData({ loading: false }) }
  },
  switchLanguage(e) {
    const language = e.currentTarget.dataset.language
    if (language === this.data.language) return
    if (this.audio) this.audio.stop()
    this.setData({ language })
  },
  toggleAudio() {
    const item = this.data.item
    if (!item || !this.audio) return
    if (this.data.playing || this.data.audioLoading) {
      this.audio.stop()
      this.setData({ playing: false, audioLoading: false })
      return
    }
    const recorded = this.data.language === 'zh' && item.audioUrl
    this.setData({ audioLoading: true })
    this.audio.src = recorded || api.scenicNarration(item.id, this.data.language)
    this.audio.play()
  },
  openVrIntro() {
    if (this.data.item) wx.navigateTo({ url: '/pages/vr-intro/vr-intro?id=' + encodeURIComponent(this.data.item.id) })
  },
  openMap() {
    const item = this.data.item
    const point = content.coordinates(item)
    if (!point) return wx.showToast({ title: '该建筑暂未配置地图坐标', icon: 'none' })
    wx.openLocation({
      ...point,
      scale: 18,
      name: item.name || '校园建筑',
      address: item.remarks || item.address || '山西农业大学',
      fail: () => wx.showToast({ title: '地图打开失败，请检查定位权限', icon: 'none' })
    })
  },
  imageError() { if (this.data.hero !== content.fallbackImage) this.setData({ hero: content.fallbackImage }) },
  callPhone() {
    if (this.data.item && this.data.item.phoneNumber) wx.makePhoneCall({ phoneNumber: this.data.item.phoneNumber })
  }
})
