import request from '@/utils/request'

export function listVideos(params) {
  return request({ url: '/travelVideo/list', method: 'get', params })
}

export function addVideo(data) {
  return request({ url: '/travelVideo/add', method: 'post', data })
}

export function updateVideo(data) {
  return request({ url: '/travelVideo/update', method: 'post', data })
}

export function deleteVideo(id) {
  return request({ url: '/travelVideo/delete', method: 'delete', params: { id } })
}

export function uploadVideoFile(data) {
  return request({ url: '/travel/oss/upload', method: 'post', data, timeout: 120000 })
}
