const api = require('./utils/api')

App({
  globalData: { apiBase: api.baseUrl, userInfo: null, recognitionFailure: null, recognitionSuccess: null },
  onLaunch() {
    this.recordVisit()
  },
  request(options) {
    const token = wx.getStorageSync('token')
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        timeout: options.timeout || 15000,
        header: Object.assign({}, options.header, token ? { Authorization: 'Bearer ' + token } : {}),
        success: ({ data, statusCode }) => {
          if (statusCode < 200 || statusCode >= 300) return reject(new Error('服务暂时不可用'))
          if (data && data.code != null && Number(data.code) !== 200) return reject(new Error(data.msg || '请求失败'))
          resolve(data)
        },
        fail: reject
      })
    })
  },
  upload(filePath, formData = {}) {
    const token = wx.getStorageSync('token')
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: api.scanThing,
        filePath,
        name: 'file',
        timeout: 60000,
        formData,
        header: token ? { Authorization: 'Bearer ' + token } : {},
        success: res => {
          if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('识别服务暂时不可用'))
          try { resolve(JSON.parse(res.data)) } catch (e) { reject(e) }
        },
        fail: reject
      })
    })
  },
  recordVisit() {
    this.request({ url: api.insertViews, method: 'POST', data: { eventType: 1, source: '微信小程序', pageName: '首页' } }).catch(() => {})
  }
})
