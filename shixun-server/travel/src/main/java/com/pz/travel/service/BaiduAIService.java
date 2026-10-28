package com.pz.travel.service;

import com.alibaba.fastjson.JSON;
import com.baidu.aip.imagesearch.AipImageSearch;
import com.google.common.util.concurrent.RateLimiter;
import com.pz.travel.config.properties.BaiduProperties;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.HashMap;

@Service
@Slf4j
public class BaiduAIService {
    final RateLimiter rateLimiter = RateLimiter.create(0.7);

    @Autowired
    private BaiduProperties baiduProperties;

    private AipImageSearch client;

    @PostConstruct
    public void init(){
        client = new AipImageSearch(baiduProperties.getAppId(), baiduProperties.getApiKey(), baiduProperties.getSecretKey());
        //设置网络连接参数
        client.setConnectionTimeoutInMillis(2000);
        client.setSocketTimeoutInMillis(30000);
    }

    /**
     * 相似图片入库
     * @throws Exception
     */
    public String imageAdd(String[] tags, String name, String id, String url) throws Exception {
        // 传入可选参数调用接口
        HashMap<String, String> options = new HashMap<>();
        if(tags!=null && tags.length > 0){
            options.put("tags", StringUtils.join(tags, ','));
        }
        com.alibaba.fastjson.JSONObject jsonObject = new com.alibaba.fastjson.JSONObject();
        jsonObject.put("name", name);
        jsonObject.put("id", id);
        jsonObject.put("url", url);
        rateLimiter.acquire();
        JSONObject res = client.similarAddUrl(url, JSON.toJSONString(jsonObject), options);
        log.info("相似图片入库，响应内容:{}", res.toString(2));
        if(res.has("error_msg")) {
            String errorMsg = res.getString("error_msg");
            log.error("相似图片入库失败id:{},name:{},url:{},{}", id, name, url, errorMsg);
            if(StringUtils.isNotBlank(errorMsg)) {
                return "";
            }
        }
        return res.getString("cont_sign");
    }

    /**
     * 相似图片搜索
     */
    public JSONArray imageSearch(String[] tags, byte[] file){
        // 传入可选参数调用接口
        HashMap<String, String> options = new HashMap<>();
        if(tags!=null && tags.length > 0){
            options.put("tags", StringUtils.join(tags, ','));
            options.put("tag_logic", "0");
        }
        options.put("pn", "0");
        options.put("rn", "10");

        rateLimiter.acquire();
        JSONObject res = client.similarSearch(file, options);
        log.info("相似图片搜索，响应内容:{}", res.toString(2));
        if (res.has("error_code")) {
            log.warn("相似图片搜索失败，errorCode:{}, errorMsg:{}",
                    res.optInt("error_code"), res.optString("error_msg"));
            return null;
        }
        if(res.optInt("result_num", 0) > 0 && res.has("result")){
            return res.getJSONArray("result");
        }
        return null;
    }

    /**
     * 相似图片删除
     * @param contSign
     */
    public Boolean imageDelete(String contSign) {
        // 传入可选参数调用接口
        HashMap<String, String> options = new HashMap<>();
        // 删除相似图，传入参数为图片签名
        rateLimiter.acquire();
        JSONObject res = client.similarDeleteBySign(contSign, options);
        log.info("相似图片删除，contSign:{},响应内容:{}", contSign, res.toString(2));
        if(res.has("error_msg")) {
            String errorMsg = res.getString("error_msg");
            log.error("相似图片删除失败contSign:{},{}", contSign, errorMsg);
        }
        return !res.has("error_code");
    }
}
