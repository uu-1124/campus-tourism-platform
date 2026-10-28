import request from '@/utils/request'

export function listPeople(params) {
  return request({
    url: '/travel/human/list',
    method: 'get',
    params
  })
}

export function addPerson(data) {
  return request({
    url: '/travel/human/save',
    method: 'post',
    data
  })
}

export function updatePerson(data) {
  return request({
    url: '/travel/human/update',
    method: 'post',
    data
  })
}

export function deletePeople(ids) {
  return request({
    url: '/travel/human/delete',
    method: 'delete',
    data: ids
  })
}

export function uploadPersonPhoto(data) {
  return request({
    url: '/common/upload',
    method: 'post',
    data,
    timeout: 30000
  })
}
