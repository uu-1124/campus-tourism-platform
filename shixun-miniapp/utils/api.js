const env = require('./env')
const baseUrl = env.baseUrl

module.exports = {
  baseUrl,
  appId: env.appId,
  slideshow: baseUrl + '/travel/slideshow/random',
  slideshowList: baseUrl + '/travel/backend/slideshow/list',
  scenicList: (pageNum, pageSize) => baseUrl + '/travel/backstage/search?moduleId=847162&pageNum=' + pageNum + '&pageSize=' + pageSize,
  scenicDetail: id => baseUrl + '/travel/scenicspot/' + id,
  scenicNarration: (id, lang) => baseUrl + '/travel/scenicspot/' + encodeURIComponent(id) + '/narration?lang=' + encodeURIComponent(lang),
  activityList: baseUrl + '/travel/getActivityList',
  videoList: baseUrl + '/travelVideo/list',
  videoDetail: id => baseUrl + '/travelVideo/detail?id=' + encodeURIComponent(id),
  vrList: baseUrl + '/travel/backstage/vr/list1?pageNum=1&pageSize=100',
  vrScenicList: baseUrl + '/travel/getVrList?pageNum=1&pageSize=100',
  vrView: id => baseUrl + '/views/insertVrViews?scenicId=' + encodeURIComponent(id) + '&source=' + encodeURIComponent('微信小程序'),
  coverPicture: type => baseUrl + '/travel/backstage/getCoverPicture/' + type,
  scanThing: baseUrl + '/travel/scanthing',
  insertViews: baseUrl + '/views/insertViews',
  insertScenicViews: id => baseUrl + '/views/insertScenicViews?scenicId=' + id,
  wxLogin: code => baseUrl + '/wx/user/' + env.appId + '/login?code=' + code
}
