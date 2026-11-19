package com.marketforge.controller;

import com.marketforge.dto.response.ApiResponse;
import com.marketforge.dto.response.IpCertificateResponse;
import com.marketforge.entity.User;
import com.marketforge.service.DeliverableVaultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/vault")
@RequiredArgsConstructor
public class DeliverableVaultController {

    private final DeliverableVaultService vaultService;

    @GetMapping("/certificate/{orderId}")
    public ResponseEntity<ApiResponse<IpCertificateResponse>> getIpCertificate(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(
                vaultService.generateIpCertificate(currentUser, orderId)));
    }

    @PostMapping("/token")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateVaultToken(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Object> req) {
        Long orderId = Long.valueOf(req.get("orderId").toString());
        String assetUrl = req.get("assetUrl") != null ? req.get("assetUrl").toString() : null;
        return ResponseEntity.ok(ApiResponse.success(
                "Secure vault token generated",
                vaultService.generateSecureVaultToken(currentUser, orderId, assetUrl)));
    }
}
