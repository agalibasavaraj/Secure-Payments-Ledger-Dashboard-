package com.yourname.ledger.fraud.repository;

import com.yourname.ledger.fraud.entity.FraudFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FraudFlagRepository extends JpaRepository<FraudFlag, Long> {

    List<FraudFlag> findByTransactionId(Long transactionId);

    @Query("SELECT f.ruleName, COUNT(f) FROM FraudFlag f GROUP BY f.ruleName")
    List<Object[]> countByRuleNameGrouped();
}
