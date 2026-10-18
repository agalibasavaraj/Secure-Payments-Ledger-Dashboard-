package com.yourname.ledger.report.service;

import com.yourname.ledger.fraud.repository.FraudFlagRepository;
import com.yourname.ledger.report.dto.ReportDtos.*;
import com.yourname.ledger.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final FraudFlagRepository fraudFlagRepository;

    @Transactional(readOnly = true)
    public DailyReportResponse getDailyReport(String dateString) {
        LocalDate date = (dateString != null && !dateString.isBlank())
                ? LocalDate.parse(dateString, DateTimeFormatter.ISO_LOCAL_DATE)
                : LocalDate.now(ZoneOffset.UTC);

        var start = date.atStartOfDay().toInstant(ZoneOffset.UTC);
        var end = date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        long total = transactionRepository.countBetween(start, end);
        long successCount = transactionRepository.countByStatusBetween("SUCCESS", start, end);
        long failedCount = transactionRepository.countByStatusBetween("FAILED", start, end);
        long flaggedCount = transactionRepository.countByStatusBetween("FLAGGED", start, end);
        long blockedCount = transactionRepository.countByStatusBetween("BLOCKED", start, end);
        long totalVolumeMinor = transactionRepository.sumVolumeBetween(start, end);

        double successRate = total > 0 ? Math.round(((double) successCount / total) * 1000.0) / 10.0 : 100.0;
        double failureRate = total > 0 ? Math.round(((double) (failedCount + blockedCount) / total) * 1000.0) / 10.0 : 0.0;

        return DailyReportResponse.builder()
                .date(date.toString())
                .totalTransactions(total)
                .successRate(successRate)
                .failureRate(failureRate)
                .flaggedCount(flaggedCount)
                .blockedCount(blockedCount)
                .totalVolumeMinor(totalVolumeMinor)
                .build();
    }

    @Transactional(readOnly = true)
    public List<FraudSummaryItem> getFraudSummary() {
        List<Object[]> rows = fraudFlagRepository.countByRuleNameGrouped();
        return rows.stream()
                .map(row -> FraudSummaryItem.builder()
                        .ruleName((String) row[0])
                        .count(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());
    }
}
