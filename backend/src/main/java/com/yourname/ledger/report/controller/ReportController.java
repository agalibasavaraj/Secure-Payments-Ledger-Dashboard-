package com.yourname.ledger.report.controller;

import com.yourname.ledger.report.dto.ReportDtos.*;
import com.yourname.ledger.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports (Admin)", description = "Surveillance analytics, daily volumes and fraud rule breakdowns")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/daily")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Daily transaction report", description = "Aggregates total volume, success/failure rate, and flagged/blocked counts")
    public ResponseEntity<DailyReportResponse> getDailyReport(@RequestParam(required = false) String date) {
        DailyReportResponse response = reportService.getDailyReport(date);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/fraud-summary")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Fraud summary by rule", description = "Returns aggregated counts of triggered fraud engine rules")
    public ResponseEntity<List<FraudSummaryItem>> getFraudSummary() {
        List<FraudSummaryItem> response = reportService.getFraudSummary();
        return ResponseEntity.ok(response);
    }
}
