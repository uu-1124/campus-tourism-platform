const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: { list: [], loading: true, error: false },
  onLoad() { this.load() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },
  async load() {
    if (this._loading) return
    this._loading = true
    this.setData({ loading: true, error: false })
    try {
      const [vr, scenic] = await Promise.all([
        app.request({ url: api.vrList }),
        app.request({ url: api.vrScenicList })
      ])
      const enabled = content.rows(vr).filter(item => Number(item.status) === 1 && item.identify)
      // getVrList 已在后端限定 is_vr=1，响应只含建筑 ID、名称、图片和 vrId。
      const entries = content.rows(scenic).filter(item => item.vrId && content.published(item))
      this.setData({ list: entries.map(item => {
        const record = enabled.find(v => String(v.id) === String(item.vrId))
        return record ? { ...content.normalizeBuilding(item), image: content.firstImage(record.vrCover) || content.normalizeBuilding(item).image } : null
      }).filter(Boolean) })
    } catch (e) { this.setData({ error: true }) }
    finally { this._loading = false; this.setData({ loading: false }) }
  },
  open(e) { wx.navigateTo({ url: '/pages/vr-viewer/vr-viewer?id=' + encodeURIComponent(e.currentTarget.dataset.id) }) },
  imageError(e) {
    const index = e.currentTarget.dataset.index
    if (this.data.list[index].image !== content.fallbackImage) this.setData({ ['list[' + index + '].image']: content.fallbackImage })
  }
})
