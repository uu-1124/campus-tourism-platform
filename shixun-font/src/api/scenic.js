import request from '@/utils/request'

export function listScenicItems(params) {
  return request({ url: '/travel/backstage/search', method: 'get', params })
}

export function addScenicItem(data) {
  return request({ url: '/travel/backstage/add', method: 'post', data })
}

export function updateScenicItem(data) {
  return request({ url: '/travel/backstage/update', method: 'put', data })
}

export function deleteScenicItem(id) {
  return request({ url: '/travel/backstage/scenicspot/' + id, method: 'delete' })
}

export function listScenicCategories(params) {
  return request({ url: '/travel/backstage/selectTravelSubClassification', method: 'get', params })
}

export function addScenicCategory(params) {
  return request({ url: '/travel/backstage/insertTravelSubClassification', method: 'post', params })
}

export function updateScenicCategory(params) {
  return request({ url: '/travel/backstage/updateTravelSubClassfication', method: 'put', params })
}

export function deleteScenicCategory(id) {
  return request({ url: '/travel/backstage/deleteTravelsubclassfication/' + id, method: 'delete' })
}

export function uploadScenicImage(data) {
  return request({ url: '/travel/oss/upload', method: 'post', data, timeout: 60000 })
}
