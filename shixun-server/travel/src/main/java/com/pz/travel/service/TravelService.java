package com.pz.travel.service;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Date;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.github.pagehelper.PageInfo;
import com.ruoyi.common.utils.IdWorker;
import com.pz.travel.common.CommonConstant;
import com.pz.travel.constant.TravelStatsConstant;
import com.pz.travel.domain.TravelModuleDetail;
import com.pz.travel.domain.TravelRecognitionLibrary;
import com.pz.travel.domain.TravelSlideshow;
import com.pz.travel.domain.vo.ScanthingVo;
import com.pz.travel.framework.cloud.CloudStorageService;
import com.pz.travel.framework.cloud.OSSFactory;
import com.pz.travel.mapper.TravelRecognitionLibraryMapper;
import com.pz.travel.mapper.TravelScenicSpotMapper;
import com.pz.travel.mapper.TravelSlideshowMapper;
import com.ruoyi.common.constant.HttpStatus;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.ISysConfigService;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.geo.*;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tk.mybatis.mapper.entity.Example;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class TravelService {
    @Autowired
    private IdWorker idWorker;

    @Autowired
    private TravelSlideshowMapper travelSlideshowMapper;

    @Autowired
    private TravelScenicSpotMapper travelScenicSpotMapper;

    @Autowired
    private TravelRecognitionLibraryMapper travelRecognitionLibraryMapper;

    @Autowired
    private BaiduAIService baiduAIService;

    @Autowired
    private LocalImageRecognitionService localImageRecognitionService;

    @Autowired
    private ISysConfigService configService;

    @Autowired
    private RedisTemplate redisTemplate;

    @Autowired
    private TravelScenicViewsService travelScenicViewsService;

    /**
     * 添加或更新首页轮播图
     * @param slideshow
     * @return
     */
    public TravelSlideshow addOrUpdateTravelSlideshow(TravelSlideshow slideshow){
        if(slideshow.getId() != null) {
            travelSlideshowMapper.updateByPrimaryKeySelective(slideshow);
        }else {
            slideshow.setId(idWorker.nextId());
            slideshow.setCreateBy(SecurityUtils.getLoginUser().getUser().getUserId().toString());
            slideshow.setCreateTime(new Date());
            travelSlideshowMapper.insertSelective(slideshow);
        }
        return slideshow;
    }

    /**
     * 删除首页轮播图
     * @param id
     * @return
     */
    public int deleteSlideshow(Long id){
        return travelSlideshowMapper.deleteSlideshow(id);
    }
    /**
     * 获取轮播图列表数据
     * @param slideshow
     * @return
     */
    public List<TravelSlideshow> selectTravelSlideshowList(TravelSlideshow slideshow){
        Example example = new Example(TravelSlideshow.class);
        Example.Criteria criteria = example.createCriteria();
        if (slideshow != null) {
            if (slideshow.getId() != null) {
                criteria.andEqualTo("id", slideshow.getId());
            }
            if (StringUtils.isNotBlank(slideshow.getPictureUrl())) {
                criteria.andEqualTo("pictureUrl", slideshow.getPictureUrl());
            }
            if (slideshow.getStatus() != null) {
                criteria.andEqualTo("status", slideshow.getStatus());
            }
        }
        example.orderBy("createTime").asc().orderBy("id").asc();
        return travelSlideshowMapper.selectByExample(example);
    }

    /**
     * 随机获取一条轮播图记录
     * @return
     */
    public TravelSlideshow slideshowRandom(){
        return travelSlideshowMapper.slideshowRandom();
    }


    public TableDataInfo<TravelModuleDetail> getnear(String longitude, String  latitude,int num, int size){
        Point center = new Point(Double.valueOf(longitude), Double.valueOf(latitude));
        Distance radius = new Distance(Double.valueOf(20), Metrics.KILOMETERS);
        TableDataInfo<TravelModuleDetail> rspData = new TableDataInfo();
        RedisGeoCommands.GeoRadiusCommandArgs args = RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs().includeDistance().limit(50).sortAscending();
        try{
            GeoResults<RedisGeoCommands.GeoLocation<String>> results = redisTemplate.opsForGeo().radius(CommonConstant.TRAVEL_GEO_KEY, new Circle(center, radius), args);
            List<GeoResult<RedisGeoCommands.GeoLocation<String>>> resultList = results.getContent();

            if(resultList!=null && !resultList.isEmpty()) {
                String[] ids= new String[resultList.size()];
                int  i=0;
                for (GeoResult<RedisGeoCommands.GeoLocation<String>> geoLocationGeoResult: resultList
                ) {

                    ids[i] = geoLocationGeoResult.getContent().getName();
                    i++;
                }
                int start = (num-1)*size;
                int end = start + size ;
                if(start > ids.length-1){
                    start = ids.length-1;
                }
                if(end > ids.length-1) {
                    end = ids.length-1;
                }
                String[] idsnew    = new String[size];
                 int j = 0 ;
                for(i=start; i<end; i++){

                    idsnew[j]  = ids[i];
                    j++;
                }

                List<TravelModuleDetail> travelScenicSpot = travelScenicSpotMapper.travelScenicSpotInformations(idsnew);



                for (TravelModuleDetail travel:travelScenicSpot
                     ) {

                    String[] strarray  = travel.getLongitude().split(",");
                    travel.setDistance(getDistance(longitude,latitude, strarray[1], strarray[0], travel));
                }
                travelScenicSpot = travelScenicSpot.stream().sorted(Comparator.comparingInt(TravelModuleDetail::getDistanceWithSort)).collect(Collectors.toList());


                rspData.setCode(HttpStatus.SUCCESS);
                rspData.setMsg("查询成功");
                rspData.setRows(travelScenicSpot);
                rspData.setTotal( ids.length);
                return rspData;

            }

        }catch (Exception e){

        }
        return rspData;
    }


    private static double EARTH_RADIUS = 6378.137;

    private static double rad(double d) {
        return d * Math.PI / 180.0;
    }


    public static String getDistance(String lat1Str, String lng1Str, String lat2Str, String lng2Str, TravelModuleDetail travelModuleDetail) {
        Double lat1 = Double.parseDouble(lat1Str);
        Double lng1 = Double.parseDouble(lng1Str);
        Double lat2 = Double.parseDouble(lat2Str);
        Double lng2 = Double.parseDouble(lng2Str);

        double radLat1 = rad(lat1);
        double radLat2 = rad(lat2);
        double difference = radLat1 - radLat2;
        double mdifference = rad(lng1) - rad(lng2);
        double distance = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(difference / 2), 2)
                + Math.cos(radLat1) * Math.cos(radLat2)
                * Math.pow(Math.sin(mdifference / 2), 2)));
        distance = distance * EARTH_RADIUS;

        String distanceStr;
        if (distance>1){
            distance = new BigDecimal(String.valueOf(distance)).setScale(3, BigDecimal.ROUND_HALF_DOWN).doubleValue();
             distanceStr = distance+"km";
        }

        else{
            distance = new BigDecimal(String.valueOf(distance)).setScale(3, BigDecimal.ROUND_HALF_DOWN).doubleValue()*1000;
             distanceStr = distance+"m";
        }
        if(travelModuleDetail != null) {
            travelModuleDetail.setDistanceWithSort(new Double(distance).intValue());
        }
        return distanceStr;
    }

  /**
   * 拍照识别
   *
   * @param tag 标记，1:景点 2:文创
   * @param fileName 图片名称
   * @param data 图片内容
   * @param latitude 纬度
   * @param longitude 经度
   * @return
   */
  public ScanthingVo scanthing(
      String tag, String fileName, byte[] data, String longitude, String latitude, String source, String sourceDetail) {
        ScanthingVo scanthingVo = new ScanthingVo();
        String[] tags = null;
        if(StringUtils.isNotBlank(tag)) {
            tags = new String[] { tag };
        }
        byte[] compressImage = null;
        try {
            ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(data);
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            Thumbnails.of(byteArrayInputStream)
                    .scale(1f) //图片大小（长宽）压缩比例 从0-1，1表示原图
                    .outputQuality(0.8f) //图片质量压缩比例 从0-1，越接近1质量越好
                    .outputFormat("jpg")
                    .toOutputStream(byteArrayOutputStream);
            compressImage = byteArrayOutputStream.toByteArray();
        }catch (Exception e){
            log.error("", e);
        }
        if(compressImage == null) {
            compressImage = data;
        }
        log.info("图片大小:{}KB，压缩后大小:{}KB", data.length/1024, compressImage.length/1024);
        TravelModuleDetail localMatch = localImageRecognitionService.match(tag, compressImage);
        if (localMatch != null) {
            localMatch.setContent(null);
            scanthingVo.setResultCode(1);
            scanthingVo.setTravelScenicSpot(localMatch);
            recordRecognitionEvent(localMatch.getId(), source, sourceDetail);
            return scanthingVo;
        }
        JSONArray jsonArray = baiduAIService.imageSearch(tags, compressImage);
        if(jsonArray != null) {
            //todo 判断识别id是否存在
            BigDecimal threshold = new BigDecimal(configService.selectConfigByKey(CommonConstant.TRAVEL_IMAGE_SEARCH_SCROE_KEY));
            TravelModuleDetail travelScenicSpot = null;
            BigDecimal score = BigDecimal.ZERO;
            for (int i = 0; i < jsonArray.length(); i++) {
                org.json.JSONObject candidate = jsonArray.getJSONObject(i);
                BigDecimal candidateScore = candidate.getBigDecimal("score");
                if (candidateScore.compareTo(threshold) < 0) {
                    break;
                }
                com.alibaba.fastjson.JSONObject brief = JSON.parseObject(candidate.getString("brief"));
                travelScenicSpot = travelScenicSpotMapper.getTravelModuleDetailByRecognitionLibraryId(brief.getString("id"));
                if (travelScenicSpot != null) {
                    score = candidateScore;
                    break;
                }
                log.warn("忽略百度相似图片库中未关联本地建筑的记录，contSign:{}", candidate.optString("cont_sign"));
            }
            final TravelModuleDetail matchedScenicSpot = travelScenicSpot;
            if(matchedScenicSpot != null) {
                    //添加到识别库(用户库)
                    if (matchedScenicSpot.getIsUser() ==1 && score.compareTo(new BigDecimal("0.1")) >= 0) {
                        String userId = SecurityUtils.getLoginUser().getUser().getUserId().toString();
                        new Thread(()-> {
                            try {
                                String sTag = (847162 == matchedScenicSpot.getModuleId() ? "1" : "2");
                                //上传图片到阿里云oss
                                String suffix = fileName.substring(fileName.lastIndexOf("."));
                                CloudStorageService storage = OSSFactory.build();
                                String url = storage.uploadSuffix(data, suffix);
                                //添加到识别库
                                TravelRecognitionLibrary travelRecognitionLibrary = new TravelRecognitionLibrary();
                                travelRecognitionLibrary.setFilename(fileName);
                                travelRecognitionLibrary.setUrl(url);
                                travelRecognitionLibrary.setTag(Integer.valueOf(sTag));
                                travelRecognitionLibrary.setModuleDetailId(Long.valueOf(matchedScenicSpot.getId()));
                                travelRecognitionLibrary.setSource(1);
                                this.storageRecognitionLibrary(travelRecognitionLibrary, new String[]{sTag, sTag.concat("1")}, userId);
                            } catch (Exception e) {
                                log.error("", e);
                            }
                        }).start();
                    }
                    scanthingVo.setResultCode(1);
                    matchedScenicSpot.setContent(null);
                    recordRecognitionEvent(matchedScenicSpot.getId(), source, sourceDetail);
                    scanthingVo.setTravelScenicSpot(matchedScenicSpot);
            }else {
                if(StringUtils.isNotBlank(longitude) && StringUtils.isNotBlank(latitude)) {
                    log.info("建筑物识别---开始经纬度识别");
                    // order by 距离 limit 2, 同时返回距离中心点的距离
                    Point center = new Point(Double.valueOf(longitude), Double.valueOf(latitude));
                    Distance radius = new Distance(Double.valueOf(configService.selectConfigByKey(CommonConstant.TRAVEL_IMAGE_SEARCH_GEO_KEY)), Metrics.KILOMETERS);
                    RedisGeoCommands.GeoRadiusCommandArgs args = RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs().includeDistance().limit(2).sortAscending();
                    try{
                        GeoResults<RedisGeoCommands.GeoLocation<String>> results = redisTemplate.opsForGeo().radius(CommonConstant.TRAVEL_GEO_KEY, new Circle(center, radius), args);
                        List<GeoResult<RedisGeoCommands.GeoLocation<String>>> resultList = results.getContent();
                        log.info("建筑物识别---经纬度识别:{}", JSON.toJSONString(resultList));
                        if(resultList!=null && !resultList.isEmpty()) {
                            String id = resultList.get(0).getContent().getName();
                            log.info("建筑物识别，通过经纬度识别出建筑物，id:{}", id);
                            TravelModuleDetail geoScenicSpot = travelScenicSpotMapper.travelScenicSpotInformation(Long.valueOf(id));
                            geoScenicSpot.setContent(null);
                            scanthingVo.setResultCode(1);
                            recordRecognitionEvent(geoScenicSpot.getId(), source, sourceDetail);
                            scanthingVo.setTravelScenicSpot(geoScenicSpot);
                            return scanthingVo;
                        }
                    }catch (Exception e){
                        log.error("", e);
                    }
                }
                //未识别出建筑物、返回相似建筑物
                List<TravelModuleDetail> recommendTravelScenicSpots = getRecommendTravelScenicSpots(jsonArray);
                if(recommendTravelScenicSpots != null) {
                    scanthingVo.setResultCode(2);
                    scanthingVo.setRecommendTravelScenicSpots(recommendTravelScenicSpots);
                    recordRecognitionRecommendEvent(recommendTravelScenicSpots, source, sourceDetail);
                }
            }
        }
        //未找到建筑物，随机查询3条景点记录
        if(scanthingVo.getResultCode() == null){
            scanthingVo.setResultCode(2);
            List<TravelModuleDetail> recommendTravelScenicSpots = travelScenicSpotMapper.travelScenicSpotsRandom(null, 3);
            scanthingVo.setRecommendTravelScenicSpots(recommendTravelScenicSpots);
            recordRecognitionRecommendEvent(recommendTravelScenicSpots, source, sourceDetail);
        }
        return scanthingVo;
    }

    private void recordRecognitionEvent(Long scenicId, String source, String sourceDetail) {
        if (scenicId == null) {
            return;
        }
        try {
            travelScenicViewsService.insertScenicEvent(scenicId, TravelStatsConstant.RECOGNITION_EVENT, source, sourceDetail);
        } catch (Exception e) {
            log.warn("记录建筑识别埋点失败，scenicId:{}", scenicId, e);
        }
    }

    private void recordRecognitionRecommendEvent(List<TravelModuleDetail> recommendTravelScenicSpots, String source, String sourceDetail) {
        if(recommendTravelScenicSpots == null || recommendTravelScenicSpots.isEmpty()) {
            return;
        }
        TravelModuleDetail firstRecommend = recommendTravelScenicSpots.get(0);
        if(firstRecommend == null || firstRecommend.getId() == null) {
            return;
        }
        recordRecognitionEvent(firstRecommend.getId(), source, sourceDetail);
    }

    private List<TravelModuleDetail> getRecommendTravelScenicSpots(JSONArray resultJSONArray) {
        Set<String> ids = new LinkedHashSet<>();
        com.alibaba.fastjson.JSONObject briefObject;
        for(int i = 0; i < resultJSONArray.length(); i++) {
            briefObject = JSON.parseObject(resultJSONArray.getJSONObject(i).getString("brief"));
            ids.add(briefObject.getString("id"));
        }
        if(!ids.isEmpty()){
            List<String> idList = new ArrayList<>();
            int count = 0;
            for (String id:ids){
                if(count > 2){
                    break;
                }
                count++;
                idList.add(id);
            }
            List<TravelModuleDetail> travelScenicSpots = travelScenicSpotMapper.getTravelScenicSpotsByRecognitionLibraryIds(idList.toArray(new String[idList.size()]));
            List<String> addedIdList = travelScenicSpots.stream().map(travelModuleDetail -> String.valueOf(travelModuleDetail.getId())).collect(Collectors.toList());
            if(travelScenicSpots.size() < 3){
                travelScenicSpots.addAll(travelScenicSpotMapper.travelScenicSpotsRandom(addedIdList.toArray(new String[addedIdList.size()]), 3 - travelScenicSpots.size()));
            }
            travelScenicSpots.forEach(travelModuleDetail -> travelModuleDetail.setContent(null));
            return travelScenicSpots;
        }
        return null;
    }

    /**
     * 获取识别库图片列表
     * @param recognitionLibrary
     * @return
     */
    public List<TravelRecognitionLibrary> selectRecognitionLibraryList(TravelRecognitionLibrary recognitionLibrary) {
        return travelRecognitionLibraryMapper.select(recognitionLibrary);
    }

    /**
     * 识别库添加图片
     * @param travelRecognitionLibrary
     */
    @Transactional(rollbackFor = Throwable.class)
    public Boolean storageRecognitionLibrary(TravelRecognitionLibrary travelRecognitionLibrary, String[] tags, String userId) throws Exception {
        Long id = idWorker.nextId();
        //添加到百度识别库
        String contSign = baiduAIService.imageAdd(tags, "", String.valueOf(id), travelRecognitionLibrary.getUrl());
        try{
            if(StringUtils.isBlank(contSign)) {
                return false;
            }
            //删除已经存在的contSign
            TravelRecognitionLibrary recognitionLibraryForDelete = new TravelRecognitionLibrary();
            recognitionLibraryForDelete.setContSign(contSign);
            travelRecognitionLibraryMapper.delete(recognitionLibraryForDelete);

            travelRecognitionLibrary.setId(id);
            travelRecognitionLibrary.setIsStorage(1);
            travelRecognitionLibrary.setStorageTime(new Date());
            travelRecognitionLibrary.setContSign(contSign);
            travelRecognitionLibrary.setCreateBy(userId);
            travelRecognitionLibrary.setCreateTime(new Date());
            travelRecognitionLibraryMapper.insertSelective(travelRecognitionLibrary);
            return true;
        }catch (Exception e){
            new Thread(() -> {
                try {
                    //百度图片库，添加后立即调用删除接口，图片不会删除，需要延迟几秒后再调用删除接口
                    Thread.sleep(5000L);
                } catch (InterruptedException ex) {
                    log.error("", ex);
                }
                baiduAIService.imageDelete(contSign);
            }).start();
            throw e;
        }
    }

    /**
     * 删除识别库中图片
     * @param recognitionLibraryIds
     * @return
     */
    public int deleteRecognitionLibrary(Long[] recognitionLibraryIds) {
        TravelRecognitionLibrary recognitionLibrary;
        List<Long> recognitionLibraryIdsForDelete = new ArrayList<>();
        for (Long recognitionLibraryId: recognitionLibraryIds) {
            recognitionLibrary  = travelRecognitionLibraryMapper.selectByPrimaryKey(recognitionLibraryId);
            if(recognitionLibrary != null && StringUtils.isNotBlank(recognitionLibrary.getContSign())) {
                //删除百度识别库中图片
                try{
                    if(baiduAIService.imageDelete(recognitionLibrary.getContSign())) {
                        recognitionLibraryIdsForDelete.add(recognitionLibraryId);
                    }
                }catch (Exception e){
                    log.error("删除识别库中图片出错，contSign:" + recognitionLibrary.getContSign(), e);
                }
            }
        }
        //删除记录
        int result = 0;
        if(!recognitionLibraryIdsForDelete.isEmpty()){
            result = travelRecognitionLibraryMapper.deleteTravelRecognitionLibraryByIds(recognitionLibraryIdsForDelete.toArray(new Long[recognitionLibraryIdsForDelete.size()]));
        }
        return result;
    }


}
