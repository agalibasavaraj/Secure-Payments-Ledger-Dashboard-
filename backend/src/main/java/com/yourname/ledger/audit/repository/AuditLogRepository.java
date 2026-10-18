package com.yourname.ledger.audit.repository;

import com.yourname.ledger.audit.entity.AuditLog;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Append-Only Repository.
 * Deliberately does NOT extend CrudRepository or JpaRepository
 * to forbid any update, delete, or truncation operations on the audit log.
 */
public interface AuditLogRepository extends Repository<AuditLog, Long> {
    AuditLog save(AuditLog auditLog);
    Optional<AuditLog> findById(Long id);
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AuditLog> findAll();
}
