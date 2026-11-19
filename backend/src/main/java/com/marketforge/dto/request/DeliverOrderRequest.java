package com.marketforge.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class DeliverOrderRequest {
    private String notes;
    private String sourceUrl;
    private List<String> attachments;
}
