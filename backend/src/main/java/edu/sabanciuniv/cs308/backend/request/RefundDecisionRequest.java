package edu.sabanciuniv.cs308.backend.request;

import lombok.Data;

@Data
public class RefundDecisionRequest {
    private boolean approve;
    private String managerNote;
}
