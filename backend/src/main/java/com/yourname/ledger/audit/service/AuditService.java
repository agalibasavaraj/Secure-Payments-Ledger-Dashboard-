package com.yourname.ledger.audit.service;

import com.yourname.ledger.audit.entity.AuditLog;
import com.yourname.ledger.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(Long userId, String action, String entity, String entityId, String ipAddress) {
        saveAction(userId, action, entity, entityId, ipAddress);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void logActionWithinTransaction(
            Long userId, String action, String entity, String entityId, String ipAddress) {
        saveAction(userId, action, entity, entityId, ipAddress);
    }

    private void saveAction(Long userId, String action, String entity, String entityId, String ipAddress) {
        AuditLog log = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(log);
    }
}
