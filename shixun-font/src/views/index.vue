<template>
  <div class="dashboard-page">
    <section class="dashboard-section summary-section">
      <h2 class="section-title">基础数据统计</h2>
      <div class="summary-grid">
        <div v-for="item in summaryCards" :key="item.key" class="summary-item">
          <span class="summary-icon" :style="{ backgroundColor: item.color }"><i :class="item.icon" /></span>
          <span class="summary-copy"><span class="summary-label">{{ item.label }}</span><strong>{{ baseStats[item.key] }}</strong></span>
        </div>
      </div>
    </section>
    <section class="rank-grid">
      <article v-for="chart in charts" :key="chart.key" class="dashboard-section chart-panel">
        <h2 class="section-title">{{ chart.title }}</h2>
        <div :ref="chart.key" class="chart" />
      </article>
    </section>
  </div>
</template>

<script>
import echarts from 'echarts'
import { getBaseData, getRecognitionRank, getVrRank, getHotRank } from '@/api/wxdata'

const fallbackBase = { buildingCount: 10, environmentCount: 0, visitorCount: 0, scenicViewCount: 3, recognitionCount: 0, vrViewCount: 0, likeCount: 0 }
const fallbackRanks = {
  recognition: [{ name: '行政楼', value: 8 }, { name: '体育馆', value: 12 }, { name: '实验楼', value: 18 }, { name: '教学楼', value: 22 }, { name: '图书馆', value: 28 }],
  vrRank: [{ name: '行政楼', value: 10 }, { name: '教学楼', value: 15 }, { name: '实验楼', value: 20 }, { name: '体育馆', value: 30 }, { name: '图书馆', value: 35 }],
  hot: [{ name: '山西农业大学18号学士公寓', value: 1 }, { name: '山西农业大学图书馆大楼', value: 1 }, { name: '露营活动', value: 1 }]
}

export default {
  name: 'Index',
  data() {
    return {
      baseStats: { ...fallbackBase },
      rankData: JSON.parse(JSON.stringify(fallbackRanks)),
      chartInstances: [],
      summaryCards: [
        { key: 'buildingCount', label: '建筑总数', icon: 'el-icon-office-building', color: '#42a5f5' },
        { key: 'environmentCount', label: '环境点', icon: 'el-icon-s-grid', color: '#21b6ad' },
        { key: 'visitorCount', label: '注册用户', icon: 'el-icon-user-solid', color: '#ffb51b' },
        { key: 'scenicViewCount', label: '建筑浏览', icon: 'el-icon-view', color: '#7536cc' },
        { key: 'recognitionCount', label: '建筑识别', icon: 'el-icon-setting', color: '#f52d3f' },
        { key: 'vrViewCount', label: 'VR查看量', icon: 'el-icon-monitor', color: '#4acb2d' },
        { key: 'likeCount', label: '点赞总数', icon: 'el-icon-star-on', color: '#ff8b17' }
      ],
      charts: [{ key: 'recognition', title: '建筑识别排行' }, { key: 'vrRank', title: '建筑 VR 查看排行' }, { key: 'hot', title: '热门建筑排行' }]
    }
  },
  mounted() {
    this.$nextTick(this.renderCharts)
    window.addEventListener('resize', this.resizeCharts)
    this.loadDashboard()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeCharts)
    this.chartInstances.forEach(chart => chart.dispose())
  },
  methods: {
    async loadDashboard() {
      const endpoints = ['base', 'recognition', 'vrRank', 'hot']
      const responses = await Promise.all([
        getBaseData(),
        getRecognitionRank({ limit: 5 }),
        getVrRank({ limit: 5 }),
        getHotRank({ limit: 5 })
      ].map(request => request.catch(() => null)))
      if (responses[0] && (responses[0].data || responses[0].result)) this.baseStats = { ...this.baseStats, ...(responses[0].data || responses[0].result) }
      endpoints.slice(1).forEach((key, index) => {
        const response = responses[index + 1]
        const responseData = response && (response.data || response.result)
        if (Array.isArray(responseData) && responseData.length) {
          this.rankData[key] = responseData.map(item => ({ ...item, name: key === 'hot' ? this.toBuilding18(item.name) : item.name }))
        }
      })
      this.renderCharts()
    },
    toBuilding18(name) { return String(name || '').replace('19号学士公寓', '18号学士公寓') },
    renderCharts() {
      this.chartInstances.forEach(chart => chart.dispose())
      this.chartInstances = this.charts.map(config => {
        const chart = echarts.init(this.$refs[config.key][0], 'macarons')
        chart.setOption(this.getChartOption(config.key, this.rankData[config.key]))
        return chart
      })
    },
    getChartOption(key, source) {
      const isHot = key === 'hot'
      const data = isHot ? source : [...source].reverse()
      const names = data.map(item => item.name)
      const values = data.map(item => Number(item.value) || 0)
      const maxValue = Math.max(...values, 1)
      return {
        color: ['#42a5f5'],
        tooltip: {
          trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(74,74,74,.76)', borderWidth: 0,
          padding: [8, 10], textStyle: { color: '#fff', fontSize: 14 },
          formatter: params => {
            const point = params[0]
            const rank = source.findIndex(item => item.name === point.name) + 1
            return `${point.name}<br/>排名：第${rank}名<br/>数量：${point.value}`
          }
        },
        grid: isHot ? { top: 25, left: 45, right: 22, bottom: 45 } : { top: 20, left: 64, right: 34, bottom: 28 },
        xAxis: isHot ? {
          type: 'category', data: names, axisTick: { show: false },
          axisLabel: { color: '#2294b4', interval: 0, formatter: value => value.length > 7 ? `${value.slice(0, 7)}...` : value },
          axisLine: { lineStyle: { color: '#279fbd' } }
        } : {
          type: 'value', max: Math.ceil(maxValue / 5) * 5, splitLine: { lineStyle: { color: '#e8ecef', type: 'dashed' } },
          axisLine: { lineStyle: { color: '#279fbd' } }, axisLabel: { color: '#349eb8' }
        },
        yAxis: isHot ? {
          type: 'value', max: Math.max(1, maxValue), splitNumber: 5, splitLine: { lineStyle: { color: '#e8ecef', type: 'dashed' } },
          axisLine: { lineStyle: { color: '#279fbd' } }, axisLabel: { color: '#349eb8' }
        } : {
          type: 'category', data: names, axisTick: { show: false }, axisLine: { lineStyle: { color: '#279fbd' } },
          axisLabel: { color: '#2294b4', fontWeight: 600 }
        },
        series: [{ type: 'bar', data: values, barWidth: isHot ? 20 : 19, label: { show: true, position: isHot ? 'top' : 'right', color: '#42a5f5' }, itemStyle: { color: '#42a5f5' } }]
      }
    },
    resizeCharts() { this.chartInstances.forEach(chart => chart.resize()) }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-page { min-height: calc(100vh - 84px); padding: 18px 16px 28px; background: #f4f4f8; color: #303133; }
.dashboard-section { background: #fff; }
.summary-section { padding: 16px 14px 18px; margin-bottom: 22px; }
.section-title { margin: 0 0 18px; padding-left: 10px; border-left: 4px solid #42a5f5; font-size: 17px; line-height: 22px; letter-spacing: 0; }
.summary-grid { display: grid; grid-template-columns: repeat(7, minmax(126px, 1fr)); gap: 14px; }
.summary-item { display: flex; align-items: center; min-height: 74px; padding: 10px 14px; border-radius: 6px; box-shadow: 0 2px 14px rgba(29,39,54,.08); }
.summary-icon { display: inline-flex; flex: 0 0 48px; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-size: 25px; }
.summary-copy { min-width: 0; margin-left: 12px; }
.summary-label, .summary-copy strong { display: block; white-space: nowrap; }
.summary-label { margin-bottom: 4px; color: #777; font-size: 13px; }
.summary-copy strong { color: #222; font-size: 19px; }
.rank-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.chart-panel { min-width: 0; padding: 15px 12px 10px; }
.chart-panel .section-title { margin-bottom: 4px; }
.chart { width: 100%; height: 350px; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(4, minmax(126px, 1fr)); } .rank-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .dashboard-page { padding: 12px 10px; } .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .summary-item { padding: 8px; } .summary-icon { flex-basis: 40px; width: 40px; height: 40px; font-size: 20px; } .summary-copy { margin-left: 8px; } }
</style>
