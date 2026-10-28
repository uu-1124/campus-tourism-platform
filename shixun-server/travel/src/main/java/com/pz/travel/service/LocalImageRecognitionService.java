package com.pz.travel.service;

import com.pz.travel.domain.TravelModuleDetail;
import com.pz.travel.domain.TravelRecognitionLibrary;
import com.pz.travel.mapper.TravelRecognitionLibraryMapper;
import com.pz.travel.mapper.TravelScenicSpotMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Matches an uploaded library image locally when the external image-search
 * service is unavailable. The perceptual hash remains stable after resizing
 * and normal mobile image compression.
 */
@Service
@Slf4j
public class LocalImageRecognitionService {
    private static final int MAX_HASH_DISTANCE = 22;

    @Autowired
    private TravelRecognitionLibraryMapper recognitionLibraryMapper;

    @Autowired
    private TravelScenicSpotMapper scenicSpotMapper;

    private final Map<String, ImageFingerprint> fingerprintCache = new ConcurrentHashMap<>();

    public TravelModuleDetail match(String tag, byte[] imageData) {
        ImageFingerprint uploaded = fingerprint(new ByteArrayInputStream(imageData));
        if (uploaded == null) {
            log.warn("上传图片无法生成本地识别指纹");
            return null;
        }

        TravelRecognitionLibrary query = new TravelRecognitionLibrary();
        if (tag != null && tag.matches("\\d+")) {
            query.setTag(Integer.valueOf(tag));
        }
        List<TravelRecognitionLibrary> library = recognitionLibraryMapper.select(query);
        TravelRecognitionLibrary best = null;
        int bestDistance = Integer.MAX_VALUE;
        for (TravelRecognitionLibrary item : library) {
            if (item.getModuleDetailId() == null || item.getUrl() == null || item.getUrl().trim().isEmpty()) {
                continue;
            }
            ImageFingerprint reference = fingerprintCache.computeIfAbsent(item.getUrl(), this::fingerprintFromUrl);
            if (reference == null) {
                continue;
            }
            int distance = uploaded.distance(reference);
            if (distance < bestDistance) {
                best = item;
                bestDistance = distance;
            }
        }

        log.info("本地识别图库比对完成，tag:{}, candidateCount:{}, bestDistance:{}",
                tag, library.size(), bestDistance == Integer.MAX_VALUE ? -1 : bestDistance);
        if (best == null || bestDistance > MAX_HASH_DISTANCE) {
            return null;
        }
        log.info("本地识别图库匹配成功，recognitionId:{}, moduleDetailId:{}, hashDistance:{}",
                best.getId(), best.getModuleDetailId(), bestDistance);
        return scenicSpotMapper.travelScenicSpotInformation(best.getModuleDetailId());
    }

    private ImageFingerprint fingerprintFromUrl(String imageUrl) {
        try {
            URLConnection connection = new URL(imageUrl).openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(10000);
            try (InputStream input = connection.getInputStream()) {
                return fingerprint(input);
            }
        } catch (Exception e) {
            log.warn("加载本地识别图库图片失败，url:{}", imageUrl, e);
            return null;
        }
    }

    private ImageFingerprint fingerprint(InputStream input) {
        try {
            BufferedImage source = ImageIO.read(input);
            if (source == null) {
                return null;
            }
            int[] grays = new int[64];
            int grayTotal = 0;
            long differenceHash = 0L;
            int grayIndex = 0;
            for (int y = 0; y < 8; y++) {
                int sourceY = y * (source.getHeight() - 1) / 7;
                for (int x = 0; x < 8; x++) {
                    int leftX = x * (source.getWidth() - 1) / 8;
                    int rightX = (x + 1) * (source.getWidth() - 1) / 8;
                    int left = gray(source.getRGB(leftX, sourceY));
                    int right = gray(source.getRGB(rightX, sourceY));
                    differenceHash = (differenceHash << 1) | (left > right ? 1L : 0L);
                    grays[grayIndex++] = left;
                    grayTotal += left;
                }
            }

            int average = grayTotal / grays.length;
            long averageHash = 0L;
            for (int value : grays) {
                averageHash = (averageHash << 1) | (value >= average ? 1L : 0L);
            }
            return new ImageFingerprint(averageHash, differenceHash);
        } catch (Exception e) {
            log.warn("计算图片指纹失败", e);
            return null;
        }
    }

    private int gray(int rgb) {
        int red = (rgb >> 16) & 0xff;
        int green = (rgb >> 8) & 0xff;
        int blue = rgb & 0xff;
        return (red * 30 + green * 59 + blue * 11) / 100;
    }

    private static final class ImageFingerprint {
        private final long averageHash;
        private final long differenceHash;

        private ImageFingerprint(long averageHash, long differenceHash) {
            this.averageHash = averageHash;
            this.differenceHash = differenceHash;
        }

        private int distance(ImageFingerprint other) {
            return Long.bitCount(averageHash ^ other.averageHash)
                    + Long.bitCount(differenceHash ^ other.differenceHash);
        }
    }
}
