# 山西农业大学智慧校园微信小程序

## 开发运行

1. 微信开发者工具选择“导入项目”，目录选择本目录。
2. 初次预览可使用测试号；正式发布时在 project.config.json 中换成真实小程序 AppID。
3. 本机调试可保持 utils/env.js 的 http://127.0.0.1:8020，并勾选“不校验合法域名”。
4. 真机预览及上线必须将后端地址改为可公网访问的 HTTPS 域名，并在微信公众平台添加 request/uploadFile 合法域名。

## 百度图像识别链路

小程序将照片作为 file 上传到 POST /travel/scanthing。Spring Boot 后端调用百度相似图片搜索 SDK，App ID、API Key 和 Secret Key 只存放在后端配置中，不得写入小程序。

百度智能云控制台用量仅统计实际发送至该账号应用的请求。打开 [图像搜索应用列表](https://console.bce.baidu.com/ai-engine/imagesearch/app/list)，登录持有后端密钥的百度账号，在该应用的用量/调用统计中选择上课日期查看“相似图片搜索”调用；用一张自己的校园建筑照片在小程序“拍照识建筑”中完成真实测试后再刷新统计。账号或应用不一致、服务端调用失败、统计延迟都会影响可见用量。不要为了增加数字而重复发送无意义请求。

## VR 全景

VR 校园页只列出后台已启用、且与建筑关联的 VR。建筑详情页可进入全景；小程序通过 web-view 打开真正的 HTTPS 全景站点，并在打开时记录 VR 浏览事件。当前数据库没有已启用的 VR 记录，后端开发配置仍为本机 `http://127.0.0.1:5501/tour.html`，所以会显示空列表，不能在手机上播放。

要上线 VR：先取得真实的 360 度全景素材并部署全景播放器至公网 HTTPS；将其 URL 配置到 `utils/env.js` 的 `vrBaseUrl`（例如 `https://已备案域名/tour.html`），在微信公众平台配置同一业务域名。然后在后台“VR 管理”创建并启用条目，设置标识和封面，在建筑管理中关联相应 VR。普通建筑照片不是 360 度全景素材。

后台“识别库管理”负责把官方建筑图片加入百度识别库。建议在“系统管理 -> 参数设置”中配置：

- travel.image.search.score：测试建议 0.8
- travel.image.search.geo：测试建议 1

## 目录

- pages/index：小程序首页
- pages/recognition：拍照/相册识别
- pages/scenic：校园建筑列表与搜索
- pages/detail：建筑详情
- utils/api.js：后端接口统一配置
