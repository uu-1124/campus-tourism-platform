const api = require('../../utils/api')
const content = require('../../utils/content')
const app = getApp()

Page({
  data: { requestedId: '', videos: [], selected: null, loading: true, error: false },
  onLoad(options) { this.setData({ requestedId: options.id || '' }); this.load() },
  async load() {
    this.setData({ loading: true, error: false })
    try {
      const response = await app.request({ url: api.videoList + '?type=1&pageNum=1&pageSize=50' })
      const videos = content.rows(response).map(item => ({ ...item, title: item.name || item.tittle || '校园宣传片', subtitle: item.content || item.tittle || '山西农业大学校园影像', image: content.firstImage(item.cover) || content.fallbackImage, src: item.video || item.videoUrl || '' })).filter(item => item.src)
      const selected = videos.find(item => String(item.id) === String(this.data.requestedId)) || videos[0] || null
      this.setData({ videos, selected })
    } catch (e) { this.setData({ error: true }) }
    finally { this.setData({ loading: false }) }
  },
  selectVideo(e) {
    const selected = this.data.videos.find(item => String(item.id) === String(e.currentTarget.dataset.id))
    if (selected) this.setData({ selected })
  },
  videoError() { wx.showToast({ title: '视频暂时无法播放', icon: 'none' }) }
})
