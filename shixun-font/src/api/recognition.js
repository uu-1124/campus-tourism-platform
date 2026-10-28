import request from '@/utils/request'

export function listRecognitionImages(params) {
  return request({
    url: '/travel/backend/recognitionLibrary/list',
    method: 'get',
    params
  })
}

export function listBuildings(params) {
  return request({
    url: '/travel/backstage/search',
    method: 'get',
    params
  })
}

export function uploadRecognitionImage(data) {
  return request({
    url: '/travel/oss/upload',
    method: 'post',
    data,
    timeout: 30000
  })
}

export function storeRecognitionImage(tag, params) {
  return request({
    url: '/travel/backend/recognitionLibrary/storage/' + tag,
    method: 'get',
    params,
    timeout: 30000
  })
}

export function deleteRecognitionImages(ids) {
  return request({
    url: '/travel/backend/recognitionLibrary/delete',
    method: 'post',
    data: ids,
    timeout: 30000
  })
}
