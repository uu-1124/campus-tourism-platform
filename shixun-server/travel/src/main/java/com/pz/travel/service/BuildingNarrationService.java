package com.pz.travel.service;

import cn.hutool.http.HtmlUtil;
import com.pz.travel.domain.TravelModuleDetail;
import com.pz.travel.mapper.TravelScenicSpotMapper;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.concurrent.TimeUnit;

@Service
public class BuildingNarrationService {
    @Autowired
    private TravelScenicSpotMapper scenicSpotMapper;

    public synchronized byte[] narrate(Long id, String language) throws Exception {
        TravelModuleDetail building = scenicSpotMapper.selectByPrimaryKey(id);
        if (building == null || building.getStatus() == null || building.getStatus() != 1) {
            throw new IllegalArgumentException("建筑不存在或未发布");
        }
        boolean english = "en".equals(language);
        String source = english ? building.getEnglishIntroduction() : building.getContent();
        if (StringUtils.isBlank(source)) source = english ? building.getEnglishName() : building.getIntroduction();
        String text = HtmlUtil.unescape(HtmlUtil.cleanHtmlTag(StringUtils.defaultString(source)))
                .replaceAll("\\s+", " ").trim();
        if (StringUtils.isBlank(text)) text = english ? "Shanxi Agricultural University" : building.getName();
        if (text.length() > 3000) text = text.substring(0, 3000);

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest((id + ":" + language + ":" + text).getBytes(StandardCharsets.UTF_8));
        StringBuilder key = new StringBuilder();
        for (byte value : hash) key.append(String.format("%02x", value & 0xff));
        Path directory = Paths.get(System.getProperty("java.io.tmpdir"), "shixun-narration");
        Files.createDirectories(directory);
        Path cached = directory.resolve(key + ".wav");
        if (Files.isRegularFile(cached) && Files.size(cached) > 44) return Files.readAllBytes(cached);

        Path input = Files.createTempFile(directory, "narration-", ".txt");
        Path output = Files.createTempFile(directory, "narration-", ".wav");
        try {
            Files.write(input, text.getBytes(StandardCharsets.UTF_8));
            // Only fixed script text is executed; building content is passed through a UTF-8 file.
            String script = "Add-Type -AssemblyName System.Speech; "
                    + "$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
                    + "$voice.SelectVoice($env:SHIXUN_TTS_VOICE); "
                    + "$voice.SetOutputToWaveFile($env:SHIXUN_TTS_OUTPUT); "
                    + "try { $voice.Speak([System.IO.File]::ReadAllText($env:SHIXUN_TTS_INPUT, [System.Text.Encoding]::UTF8)) } "
                    + "finally { $voice.Dispose() }";
            ProcessBuilder builder = new ProcessBuilder("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script);
            builder.environment().put("SHIXUN_TTS_VOICE", english ? "Microsoft Zira Desktop" : "Microsoft Huihui Desktop");
            builder.environment().put("SHIXUN_TTS_INPUT", input.toString());
            builder.environment().put("SHIXUN_TTS_OUTPUT", output.toString());
            builder.redirectErrorStream(true);
            builder.redirectOutput(ProcessBuilder.Redirect.INHERIT);
            Process process = builder.start();
            if (!process.waitFor(45, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IOException("语音合成超时");
            }
            if (process.exitValue() != 0 || Files.size(output) <= 44) throw new IOException("语音合成失败");
            Files.move(output, cached, StandardCopyOption.REPLACE_EXISTING);
            return Files.readAllBytes(cached);
        } finally {
            Files.deleteIfExists(input);
            Files.deleteIfExists(output);
        }
    }
}
