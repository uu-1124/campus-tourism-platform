const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: { keyword: '', activeFilter: 'all', all: [], list: [], left: [], right: [], loading: true },
  onShow() { this.load() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },
  async load() {
    this.setData({ loading: true })
    try {
      const response = await app.request({ url: api.scenicList(1, 100) })
      const all = content.rows(response).filter(content.published).map(content.normalizeBuilding)
      this.setData({ all }); this.applyFilter()
    } catch (e) { wx.showToast({ title: '建筑加载失败', icon: 'none' }) }
    finally { this.setData({ loading: false }) }
  },
  onInput(e) { this.setData({ keyword: e.detail.value }) },
  search() { this.applyFilter() },
  setFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ activeFilter: filter })
    if (filter !== 'near') return this.applyFilter()
    wx.getLocation({ type: 'gcj02', success: location => { this._location = location; this.applyFilter() }, fail: () => { this.setData({ activeFilter: 'all' }); this.applyFilter(); wx.showToast({ title: '未获得定位权限', icon: 'none' }) } })
  },
  applyFilter() {
    const keyword = this.data.keyword.trim().toLowerCase()
    let list = this.data.all.filter(item => !keyword || [item.name, item.englishName, item.remarks, item.address].filter(Boolean).join(' ').toLowerCase().indexOf(keyword) !== -1)
    if (this.data.activeFilter === 'vr') list = list.filter(item => Number(item.isVr) === 1 || item.vrId)
    if (this.data.activeFilter === 'red') list = list.filter(item => /铭贤|红色|旧址|革命/.test([item.name, item.remarks, item.introduction].filter(Boolean).join('')))
    if (this.data.activeFilter === 'near' && this._location) list = list.map(item => ({ ...item, distance: this.distanceTo(item) })).sort((a, b) => a.distance - b.distance)
    const decorated = list.map((item, index) => ({ ...item, imageClass: index % 4 === 0 || index % 4 === 3 ? 'tall' : 'short' }))
    this.setData({ list: decorated, left: decorated.filter((_, index) => index % 2 === 0), right: decorated.filter((_, index) => index % 2 === 1) })
  },
  distanceTo(item) {
    const point = content.coordinates(item)
    if (!point) return Number.MAX_SAFE_INTEGER
    const lat1 = Number(this._location.latitude); const lon1 = Number(this._location.longitude); const lat2 = point.latitude; const lon2 = point.longitude
    const rad = value => value * Math.PI / 180
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  },
  imageError(e) {
    const column = e.currentTarget.dataset.column; const index = Number(e.currentTarget.dataset.index)
    if (this.data[column] && this.data[column][index]) this.setData({ [column + '[' + index + '].image']: content.fallbackImage })
  },
  openDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) }) }
})
