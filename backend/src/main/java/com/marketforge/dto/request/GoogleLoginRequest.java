package com.marketforge.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleLoginRequest {

    /**
     * Google ID Token returned by Google Identity Services SDK (credential response)
     */
    private String idToken;

    /**
     * Optional user info provided directly (used when testing without Google Cloud console or in dev environment)
     */
    private String email;
    private String name;
    private String picture;
    private String googleId;
}
