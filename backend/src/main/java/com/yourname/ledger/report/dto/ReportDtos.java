package com.yourname.ledger.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class ReportDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyReportResponse {
        private String date;
        private long totalTransactions;
        private double successRate;
        private double failureRate;
        private long flaggedCount;
        private long blockedCount;
        private long totalVolumeMinor;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FraudSummaryItem {
        private String ruleName;
        private long count;
    }
}
