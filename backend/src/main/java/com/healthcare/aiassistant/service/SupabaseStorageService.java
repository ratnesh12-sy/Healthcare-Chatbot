package com.healthcare.aiassistant.service;

import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.secret-key}")
    private String secretKey;

    @Value("${supabase.bucket}")
    private String bucket;

    private final OkHttpClient httpClient = new OkHttpClient();

    /**
     * Uploads a file to Supabase Storage.
     * Returns the file path (key) stored in DB.
     * Format: doctor-verifications/{doctorId}/{uuid}.{ext}
     */
    public String uploadFile(MultipartFile file, Long doctorId) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // Unique path so files never overwrite each other
        String filePath = "doctor-verifications/" + doctorId + "/"
                + UUID.randomUUID() + extension;

        // Supabase Storage upload URL
        String uploadUrl = supabaseUrl
                + "/storage/v1/object/"
                + bucket + "/"
                + filePath;

        RequestBody body = RequestBody.create(
                file.getBytes(),
                MediaType.parse(file.getContentType())
        );

        Request request = new Request.Builder()
                .url(uploadUrl)
                .addHeader("Authorization", "Bearer " + secretKey)
                .addHeader("x-upsert", "false") // don't overwrite existing files
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "unknown";
                throw new IOException("Supabase upload failed: " + response.code() + " — " + errorBody);
            }
            log.info("Uploaded file to Supabase: {}", filePath);
            return filePath;
        }
    }

    /**
     * Generates a signed URL valid for 1 hour.
     * Use this when serving the file to admin for review.
     */
    public String generateSignedUrl(String filePath) throws IOException {
        String signedUrlEndpoint = supabaseUrl
                + "/storage/v1/object/sign/"
                + bucket + "/"
                + filePath;

        // Request body with expiry in seconds (3600 = 1 hour)
        String jsonBody = "{\"expiresIn\": 3600}";

        RequestBody body = RequestBody.create(
                jsonBody,
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url(signedUrlEndpoint)
                .addHeader("Authorization", "Bearer " + secretKey)
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to generate signed URL: " + response.code());
            }
            String responseBody = response.body().string();
            // Extract signedURL from response JSON
            // Response: {"signedURL": "/storage/v1/..."}
            String signedPath = responseBody
                    .replace("{", "")
                    .replace("}", "")
                    .replace("\"", "")
                    .split("signedURL:")[1]
                    .trim();

            return supabaseUrl + signedPath;
        }
    }

    /**
     * Deletes a file from Supabase Storage.
     */
    public void deleteFile(String filePath) throws IOException {
        String deleteUrl = supabaseUrl
                + "/storage/v1/object/"
                + bucket + "/"
                + filePath;

        Request request = new Request.Builder()
                .url(deleteUrl)
                .addHeader("Authorization", "Bearer " + secretKey)
                .delete()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                log.warn("Failed to delete file from Supabase: {}", filePath);
            } else {
                log.info("Deleted file from Supabase: {}", filePath);
            }
        }
    }
}
