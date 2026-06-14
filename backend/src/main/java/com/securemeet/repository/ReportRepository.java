package com.securemeet.repository;

import com.securemeet.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByStatus(Report.ReportStatus status);
    List<Report> findBySessionSessionId(String sessionId);
}
