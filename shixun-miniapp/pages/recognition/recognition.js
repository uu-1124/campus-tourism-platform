const app = getApp()
const { payload } = require('../../utils/content')

Page({
  data: { photo: '', loading: false, choosing: false },
  onShow() { this._active = true },
  onHide() { this._active = false },
  onUnload() { this._active = false },
  takePhoto() { this.choose(['camera']) },
  chooseAlbum() { this.choose(['album']) },
  choose(sourceType) {
    if (this.data.loading || this.data.choosing) return
    this.setData({ choosing: true })
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType,
      success: res => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        if (file.size > 10 * 1024 * 1024) return wx.showToast({ title: '请选择小于10MB的照片', icon: 'none' })
        this.setData({ photo: file.tempFilePath })
        this.recognize(file.tempFilePath)
      },
      fail: error => {
        if (!/cancel/.test(error.errMsg || '')) wx.showToast({ title: '无法获取照片，请重试', icon: 'none' })
      },
      complete: () => this.setData({ choosing: false })
    })
  },
  async recognize(path) {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const compressed = await new Promise(resolve => wx.compressImage({ src: path, quality: 80, success: res => resolve(res.tempFilePath), fail: () => resolve(path) }))
      const response = await app.upload(compressed, { tag: '1', source: '微信小程序', sourceDetail: '建筑阅读' })
      if (!this._active) return
      const result = payload(response)
      if (Number(response.code) !== 200 || !result) throw new Error('service')
      if (Number(result.resultCode) === 1 && result.travelScenicSpot && result.travelScenicSpot.id) {
        app.globalData.recognitionSuccess = { photo: path, building: result.travelScenicSpot }
        wx.navigateTo({ url: '/pages/success/success?id=' + encodeURIComponent(result.travelScenicSpot.id), fail: () => wx.showToast({ title: '页面打开失败，请重试', icon: 'none' }) })
      } else {
        this.showFailure(path, 'unmatched', result.recommendTravelScenicSpots || [])
      }
    } catch (e) {
      if (this._active) this.showFailure(path, 'service', [])
    } finally {
      this.setData({ loading: false })
    }
  },
  showFailure(photo, reason, recommendations) {
    app.globalData.recognitionFailure = { photo, reason, recommendations }
    wx.navigateTo({ url: '/pages/failure/failure', fail: () => wx.showToast({ title: '页面打开失败，请重试', icon: 'none' }) })
  }
})
