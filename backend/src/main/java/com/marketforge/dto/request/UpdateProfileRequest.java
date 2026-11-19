package com.marketforge.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    private String phone;

    // Seller profile fields
    private String displayName;

    @Size(max = 2000, message = "Bio must not exceed 2000 characters")
    private String bio;

    private String avatarUrl;

    private Integer hourlyRate; // dollars (will be converted to cents)
}
