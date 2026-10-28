import request from '@/utils/request'

export function listBanners(params) {
  return request({ url: '/travel/backend/slideshow/list', method: 'get', params })
}

export function saveBanner(data) {
  return request({ url: '/travel/backend/slideshow/addOrUpdate', method: 'post', data })
}

export function deleteBanner(id) {
  return request({ url: '/travel/backend/slideshow/deleteSlideshow/' + id, method: 'delete' })
}

export function uploadBanner(data) {
  return request({ url: '/travel/oss/upload', method: 'post', data, timeout: 60000 })
}
