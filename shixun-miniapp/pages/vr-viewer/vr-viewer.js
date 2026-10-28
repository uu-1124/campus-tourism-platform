const api = require('../../utils/api')
const content = require('../../utils/content')
const { resolveVrUrl } = require('../../utils/vr')
const app = getApp()

Page({
  data: { id: '', url: '', loading: true, error: '' },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  async load() {
    if (!this.data.id) return this.setData({ loading: false, error: '未找到 VR 全景' })
    this.setData({ loading: true, error: '' })
    try {
      const [scenic, vr] = await Promise.all([
        app.request({ url: api.scenicDetail(this.data.id) }),
        app.request({ url: api.vrList })
      ])
      const item = content.payload(scenic)
      const match = content.rows(vr).find(entry => item && String(entry.id) === String(item.vrId) && Number(entry.status) === 1 && entry.identify)
      if (!item || Number(item.isVr) !== 1 || !match) throw new Error('该建筑尚未发布 VR 全景')
      const url = resolveVrUrl({ vrUrl: item.vrUrl, vrIdentify: match.identify })
      if (!url) throw new Error('请先配置可访问的 HTTPS VR 全景地址')
      this.setData({ url })
      wx.setNavigationBarTitle({ title: item.name || 'VR 全景' })
    } catch (e) { this.setData({ error: e.message || 'VR 加载失败' }) }
    finally { this.setData({ loading: false }) }
  },
  onVrLoaded() {
    if (this._recorded || !this.data.url) return
    this._recorded = true
    app.request({ url: api.vrView(this.data.id), method: 'POST' }).catch(() => {})
  },
  onVrError() { this.setData({ url: '', error: '全景页面加载失败，请检查业务域名配置' }) }
})
