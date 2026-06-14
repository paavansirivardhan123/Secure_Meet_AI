package com.securemeet.config;

import io.openvidu.java.client.OpenVidu;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenViduConfig {

    @Value("${openvidu.url}")
    private String openViduUrl;

    @Value("${openvidu.secret}")
    private String openViduSecret;

    @Bean
    public OpenVidu openVidu() {
        try {
            org.apache.hc.core5.ssl.TrustStrategy acceptingTrustStrategy = (java.security.cert.X509Certificate[] chain, String authType) -> true;

            javax.net.ssl.SSLContext sslContext = org.apache.hc.core5.ssl.SSLContexts.custom()
                    .loadTrustMaterial(null, acceptingTrustStrategy)
                    .build();

            org.apache.hc.client5.http.io.HttpClientConnectionManager cm = org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder.create()
                    .setSSLSocketFactory(org.apache.hc.client5.http.ssl.SSLConnectionSocketFactoryBuilder.create()
                            .setSslContext(sslContext)
                            .setHostnameVerifier(org.apache.hc.client5.http.ssl.NoopHostnameVerifier.INSTANCE)
                            .build())
                    .build();

            org.apache.hc.client5.http.impl.classic.HttpClientBuilder builder = org.apache.hc.client5.http.impl.classic.HttpClients.custom()
                    .setConnectionManager(cm);

            return new OpenVidu(openViduUrl, openViduSecret, builder);
        } catch (Exception e) {
            throw new RuntimeException("Could not initialize OpenVidu client", e);
        }
    }
}
