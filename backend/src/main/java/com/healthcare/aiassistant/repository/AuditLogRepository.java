package com.healthcare.aiassistant.repository;

import com.healthcare.aiassistant.model.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findAllByOrderByTimestampDesc();

    /**
     * Most-recent logs with the admin user eagerly fetched (avoids N+1 and lazy-init issues
     * when mapping to a DTO with open-in-view disabled). {@code adminUser} is a to-one
     * association, so combining the fetch join with a limit is handled in SQL.
     * LEFT JOIN so rows whose acting admin was later deleted (admin_user_id SET NULL) still appear.
     */
    @Query("SELECT a FROM AuditLog a LEFT JOIN FETCH a.adminUser ORDER BY a.timestamp DESC")
    List<AuditLog> findRecentWithAdmin(Pageable pageable);
}
