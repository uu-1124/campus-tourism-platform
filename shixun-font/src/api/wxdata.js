import request from '@/utils/request'

// 获取小程序首页基础数据统计
export function getBaseData() {
  return request({
    url: '/wxdata/base',
    method: 'get'
  })
}

// 获取建筑识别次数排行
export function getRecognitionRank(params) {
  return request({
    url: '/wxdata/recognition',
    method: 'get',
    params
  })
}

// 获取建筑 VR 查看次数排行
export function getVrRank(params) {
  return request({
    url: '/wxdata/vrRank',
    method: 'get',
    params
  })
}

// 获取建筑热度排行（按浏览次数）
export function getHotRank(params) {
  return request({
    url: '/wxdata/hot',
    method: 'get',
    params
  })
}
