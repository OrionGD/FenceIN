# User Roles, Pages, Actions, and Charts

## Overview
This document maps the main user roles in the FenceIN frontend to their available pages, primary actions, and **data-driven analytics charts**. Every chart is generated from actual event tables filtered by tenant, role, and user permissions.

---

## Chart Architecture
**Every chart must be generated from:**
```
analyticsQuery({
  tenantId,        // organizational boundary
  role,            // permission-filtered dataset view
  userId,          // personal or assigned scope
  timeRange,       // real-time / daily / weekly / monthly aggregation
  filters,         // custom filters
  aggregationType  // sum, avg, count, distribution
})
```

**Event-driven data sources:**
- `attendance_events` - clock-in/out, geofence crossing
- `biometric_logs` - face auth, spoof attempts, confidence scores
- `kiosk_events` - access attempts, failures, blocklists
- `incident_logs` - security events, violations, resolutions
- `shift_assignments` - worker shifts, task assignments
- `task_events` - task creation, completion, handoff
- `geofence_events` - boundary entry/exit, violations
- `user_roles` - role distribution, access levels
- `subscriptions` - tenant lifecycle, churn, retention

---

# 🧠 SUPER_ADMIN (Platform Intelligence Layer)
Base route: `/super-admin`

Pages: Dashboard | Organizations | Global Analytics | System Monitoring | User Management | Role Management | Permissions | Audit Logs | AI Analytics | Platform Settings | Security Center | API Management | Storage Management | Database Monitoring | Kiosk Management | Notification Center | Incident Center | Subscription Billing | Backup Recovery

---

## Charts

### 1. Platform Activity Heatmap
**Source:** `attendance_events`, `kiosk_events` (ALL tenants)
**Filters:** `time_window=last_24h|week|month`
**Shows:**
- system usage intensity per organization (heatmap grid)
- peak load time distribution (hourly/daily pattern)
- active tenants vs idle tenants
👉 **detects platform-wide stress & usage trends**

**SQL:**
```sql
SELECT tenant_id, DATE_TRUNC('hour', event_time) AS hour,
       COUNT(*) as event_count, COUNT(DISTINCT user_id) as active_users
FROM attendance_events
GROUP BY tenant_id, hour
ORDER BY hour DESC;
```

---

### 2. Multi-Tenant Growth Curve
**Source:** `subscriptions`, `user_roles`
**Filters:** `date_range=inception|last_year|last_quarter`
**Shows:**
- tenant onboarding trend (cumulative)
- churn vs retention (monthly cohort)
- active vs inactive organizations (status)
👉 **business health of platform**

**SQL:**
```sql
SELECT DATE_TRUNC('month', created_at) AS month,
       COUNT(*) as new_tenants,
       COUNT(*) FILTER (WHERE status='ACTIVE') as active_tenants,
       COUNT(*) FILTER (WHERE status='CHURNED') as churned_tenants
FROM subscriptions
GROUP BY month
ORDER BY month DESC;
```

---

### 3. Biometric Transaction Throughput
**Source:** `biometric_logs` (ALL tenants)
**Filters:** `time_window=last_hour|day|week`
**Shows:**
- authentication requests/sec (real-time rate)
- success vs failure ratio (bar chart)
- spoof attempts aggregated globally (line trend)
- confidence score distribution (histogram)
👉 **system-wide biometric load + fraud detection**

**SQL:**
```sql
SELECT DATE_TRUNC('minute', event_time) AS minute,
       COUNT(*) as total_attempts,
       COUNT(*) FILTER (WHERE success=TRUE) as successes,
       COUNT(*) FILTER (WHERE success=FALSE) as failures,
       COUNT(*) FILTER (WHERE spoof_confidence > 0.7) as spoof_attempts,
       AVG(confidence_score) as avg_confidence
FROM biometric_logs
GROUP BY minute
ORDER BY minute DESC;
```

---

### 4. Security Incident Global Index
**Source:** `incident_logs` (ALL tenants)
**Filters:** `severity|type|time_window`
**Shows:**
- incident severity distribution (pie chart)
- top violating organizations (leaderboard)
- incident frequency trend (line chart)
- mean time to resolution (MTTR)
👉 **global risk dashboard**

**SQL:**
```sql
SELECT severity, COUNT(*) as incident_count,
       ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 2) as avg_hours_to_resolve,
       tenant_id
FROM incident_logs
GROUP BY severity, tenant_id
ORDER BY incident_count DESC;
```

---

### 5. Role Distribution Matrix
**Source:** `user_roles` (ALL users)
**Filters:** `tenant_id` (per-organization view)
**Shows:**
- SUPER_ADMIN / ORG_ADMIN / HR_ADMIN / SUPERVISOR / SECURITY_OFFICER / VENDOR_MANAGER / WORKER ratio (pie)
- tenant-wise role density (bar chart)
- role count per tenant (matrix heatmap)
👉 **platform structure visibility**

**SQL:**
```sql
SELECT tenant_id, role, COUNT(*) as user_count
FROM user_roles
GROUP BY tenant_id, role
ORDER BY tenant_id, user_count DESC;
```

---

### 6. System Resource Utilization
**Source:** Infrastructure metrics (DB, storage, API latency)
**Filters:** `time_window=last_hour|day|week`
**Shows:**
- CPU, DB load, storage growth (line chart)
- request latency trends (percentile: p50, p95, p99)
- API error rate trend
- database connection pool usage
👉 **platform health monitoring**

---

# 🏢 ORG_ADMIN (Organization Intelligence Layer)
Base route: `/org-admin`

Pages: Dashboard | Sites | Vendors | Workers | Attendance | Geofence | Shifts | Reports | Analytics | Incidents | Notifications | Kiosk Monitoring | AI Assistant | Settings

---

## Charts

### 1. Workforce Utilization Index
**Source:** `shift_assignments`, `attendance_events`
**Filters:** `tenantId, time_window=today|week|month`
**Shows:**
- active workers vs assigned workers (bar chart)
- idle workforce percentage (gauge)
- workers on-site vs off-site (real-time)
- shift overlap analysis
👉 **efficiency tracking**

**SQL:**
```sql
SELECT DATE(assignment_date) as date,
       COUNT(DISTINCT worker_id) as assigned_workers,
       COUNT(DISTINCT CASE WHEN attendance_events.status='CHECKED_IN' THEN ae.worker_id END) as active_workers,
       ROUND(100.0 * COUNT(DISTINCT ae.worker_id) / COUNT(DISTINCT worker_id), 2) as utilization_pct
FROM shift_assignments sa
LEFT JOIN attendance_events ae ON sa.worker_id = ae.user_id AND DATE(ae.event_time) = DATE(sa.assignment_date)
WHERE sa.tenant_id = ? AND sa.assignment_date BETWEEN ? AND ?
GROUP BY date;
```

---

### 2. Attendance Authenticity Score
**Source:** `attendance_events`, `biometric_logs`
**Filters:** `tenantId, time_window=week|month`
**Shows:**
- real (biometric) vs manual attendance ratio (pie)
- anomaly detection: fake check-ins (flagged list)
- confidence scores for biometric check-ins (distribution)
- override frequency per supervisor
👉 **trust metric for attendance system**

**SQL:**
```sql
SELECT DATE(ae.event_time) as date,
       COUNT(*) FILTER (WHERE ae.biometric_verified=TRUE) as biometric_checkins,
       COUNT(*) FILTER (WHERE ae.biometric_verified=FALSE) as manual_checkins,
       COUNT(*) FILTER (WHERE ae.anomaly_flag=TRUE) as flagged_anomalies,
       ROUND(AVG(bl.confidence_score) FILTER (WHERE bl.confidence_score IS NOT NULL)::numeric, 2) as avg_biometric_confidence
FROM attendance_events ae
LEFT JOIN biometric_logs bl ON ae.biometric_event_id = bl.id
WHERE ae.tenant_id = ? AND ae.event_time BETWEEN ? AND ?
GROUP BY date;
```

---

### 3. Geofence Violation Heatmap
**Source:** `geofence_events`
**Filters:** `tenantId, site_id, time_window`
**Shows:**
- violation hotspots (map heatmap)
- frequent boundary breaches (sorted by location)
- violation trend per site (line chart)
- worker violation frequency (leaderboard)
👉 **site security weak points**

**SQL:**
```sql
SELECT site_id, COUNT(*) as violation_count,
       AVG(EXTRACT(EPOCH FROM (violation_duration))/60) as avg_minutes_outside,
       user_id, COUNT(*) as user_violation_count
FROM geofence_events
WHERE tenant_id = ? AND violation_type='BOUNDARY_BREACH' AND event_time BETWEEN ? AND ?
GROUP BY site_id, user_id
ORDER BY violation_count DESC;
```

---

### 4. Site Performance Dashboard
**Source:** `attendance_events`, `incident_logs`, `shift_assignments`
**Filters:** `tenantId, time_window`
**Shows:**
- productivity per site (attendance rate %)
- attendance compliance per site (on-time %, punctuality)
- incident rate per site (incidents per 100 checkins)
- site comparison scorecard (ranking)
👉 **site comparison analytics**

**SQL:**
```sql
SELECT s.id as site_id, s.name,
       COUNT(DISTINCT ae.user_id) as checkins,
       ROUND(100.0 * COUNT(*) FILTER (WHERE ae.event_type='CHECK_IN') / COUNT(*), 2) as checkin_rate,
       COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ae.event_time - sa.shift_start_time))/60 <= 5) as ontime_checkins,
       COUNT(DISTINCT il.id) as incidents
FROM sites s
LEFT JOIN attendance_events ae ON ae.site_id = s.id AND ae.tenant_id = ?
LEFT JOIN shift_assignments sa ON sa.worker_id = ae.user_id
LEFT JOIN incident_logs il ON il.site_id = s.id AND il.tenant_id = ?
GROUP BY s.id, s.name
ORDER BY checkin_rate DESC;
```

---

### 5. Vendor Dependency Matrix
**Source:** `shift_assignments`, `workers`
**Filters:** `tenantId, time_window`
**Shows:**
- % workforce per vendor (stacked bar chart)
- vendor risk concentration (pie)
- critical dependency alert (red flags)
- worker count per vendor
👉 **dependency risk**

**SQL:**
```sql
SELECT v.id as vendor_id, v.name,
       COUNT(DISTINCT w.id) as total_workers,
       ROUND(100.0 * COUNT(DISTINCT w.id) / (SELECT COUNT(*) FROM workers WHERE tenant_id = ?), 2) as pct_total,
       COUNT(DISTINCT CASE WHEN w.status='ACTIVE' THEN w.id END) as active_workers
FROM vendors v
LEFT JOIN workers w ON w.vendor_id = v.id
WHERE v.tenant_id = ? AND w.tenant_id = ?
GROUP BY v.id, v.name
ORDER BY total_workers DESC;
```

---

### 6. Incident Trend Analyzer
**Source:** `incident_logs`
**Filters:** `tenantId, incident_type, time_window`
**Shows:**
- incident frequency by type (bar chart)
- resolution time trend (line chart)
- incident severity over time (area chart)
- average MTTR per incident type
👉 **operational safety tracking**

**SQL:**
```sql
SELECT DATE_TRUNC('day', created_at) as day, incident_type, severity,
       COUNT(*) as count,
       ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 1) as avg_hours_to_resolve
FROM incident_logs
WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
GROUP BY day, incident_type, severity
ORDER BY day DESC;
```

---

# 👨‍💼 HR_ADMIN (Human Capital Intelligence)
Base route: `/hr`

Pages: Dashboard | Workers | Attendance Logs | Payroll | Overtime Reports | Shift Reports | Leave Management | Compliance Reports | Export Center | Documents | Notifications | AI Assistant

---

## Charts

### 1. Workforce Lifecycle Funnel
**Source:** `workers`, `user_status_history`
**Filters:** `tenantId, orgId`
**Shows:**
- employee lifecycle flow: onboarded → active → on_leave → inactive → exited (funnel)
- time-in-stage analysis
- attrition rate per stage
👉 **HR pipeline health**

**SQL:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status='ACTIVE') as active,
  COUNT(*) FILTER (WHERE status='ONBOARDED' AND created_at > now() - interval '30 days') as recent_onboarded,
  COUNT(*) FILTER (WHERE status='ON_LEAVE') as on_leave,
  COUNT(*) FILTER (WHERE status='INACTIVE') as inactive,
  COUNT(*) FILTER (WHERE status='EXITED') as exited
FROM workers
WHERE tenant_id = ?;
```

---

### 2. Payroll Distribution Curve
**Source:** `payroll_records`, `shift_assignments`
**Filters:** `tenantId, payroll_period`
**Shows:**
- salary distribution histogram (bins: <20k, 20-40k, 40-60k, etc.)
- overtime cost trend (line chart)
- total payroll trend (monthly)
- cost per worker average
👉 **cost control**

**SQL:**
```sql
SELECT DATE_TRUNC('month', period_end) as month,
       COUNT(*) as workers_paid,
       ROUND(AVG(base_salary)::numeric, 2) as avg_salary,
       ROUND(SUM(overtime_hours * overtime_rate)::numeric, 2) as total_overtime_cost,
       ROUND(SUM(base_salary + overtime_hours * overtime_rate)::numeric, 2) as total_payroll
FROM payroll_records
WHERE tenant_id = ? AND period_end BETWEEN ? AND ?
GROUP BY month
ORDER BY month DESC;
```

---

### 3. Attendance Compliance Score
**Source:** `attendance_events`, `shift_assignments`
**Filters:** `tenantId, time_window=month`
**Shows:**
- punctuality rate (% on-time check-ins)
- absence patterns (recurring absences, absenteeism rate)
- compliance scorecard per worker
- monthly trend
👉 **discipline analytics**

**SQL:**
```sql
SELECT 
  DATE(ae.event_time) as date,
  ROUND(100.0 * COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ae.event_time - sa.shift_start_time))/60 <= 5) 
                / COUNT(*), 2) as ontime_pct,
  COUNT(*) FILTER (WHERE ae.event_type IS NULL) as no_show_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE ae.event_type IS NULL) / COUNT(DISTINCT sa.worker_id), 2) as absence_rate
FROM shift_assignments sa
LEFT JOIN attendance_events ae ON ae.user_id = sa.worker_id AND DATE(ae.event_time) = DATE(sa.assignment_date)
WHERE sa.tenant_id = ? AND sa.assignment_date BETWEEN ? AND ?
GROUP BY date
ORDER BY date DESC;
```

---

### 4. Leave Impact Analyzer
**Source:** `leave_requests`, `attendance_events`
**Filters:** `tenantId, time_window`
**Shows:**
- productivity drop during leave clustering (before/after analysis)
- leave request approval rate
- leave type distribution (pie)
- projected attendance impact of pending leaves
👉 **workforce planning**

**SQL:**
```sql
SELECT lr.leave_type, COUNT(*) as requests,
       COUNT(*) FILTER (WHERE status='APPROVED') as approved,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status='APPROVED') / COUNT(*), 2) as approval_rate,
       ROUND(AVG(EXTRACT(DAY FROM (end_date - start_date)))::numeric, 1) as avg_duration_days
FROM leave_requests lr
WHERE lr.tenant_id = ? AND lr.created_at BETWEEN ? AND ?
GROUP BY lr.leave_type
ORDER BY requests DESC;
```

---

### 5. Compliance Risk Heatmap
**Source:** `worker_documents`, `certifications`
**Filters:** `tenantId, compliance_status`
**Shows:**
- expired documents (red alerts)
- non-compliant workers (flagged list)
- document type expiry trend (timeline)
- risk score per worker
👉 **legal risk tracking**

**SQL:**
```sql
SELECT doc_type, COUNT(*) as total,
       COUNT(*) FILTER (WHERE expiry_date < now()) as expired,
       COUNT(*) FILTER (WHERE expiry_date BETWEEN now() AND now() + interval '30 days') as expiring_soon,
       ROUND(100.0 * COUNT(*) FILTER (WHERE expiry_date >= now()) / COUNT(*), 2) as compliance_pct
FROM worker_documents
WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
GROUP BY doc_type
ORDER BY expired DESC;
```

---

# 🧑‍🏭 SUPERVISOR (Operational Control Layer)
Base route: `/supervisor`

Pages: Dashboard | Assigned Sites | Live Workforce | Attendance Stream | Manual Attendance | Incident Reports | Task Assignment | Worker Monitoring | Notifications | AI Assistant

---

## Charts

### 1. Live Workforce Activity Stream
**Source:** `attendance_events` (real-time)
**Filters:** `tenantId, userId (supervisor's assigned workers), time_window=last_1h`
**Shows:**
- who is active right now (live list)
- who entered/exited in last 10 minutes (activity log)
- active worker count (gauge)
- on-site vs off-site breakdown (pie)
👉 **live control panel**

**SQL:**
```sql
SELECT user_id, worker_name, event_type, event_time, site_id,
       CASE WHEN event_type='CHECK_IN' THEN 'ACTIVE'
            WHEN event_type='CHECK_OUT' THEN 'INACTIVE' 
            ELSE 'UNKNOWN' END as status
FROM attendance_events
WHERE tenant_id = ? AND supervisor_id = ? AND event_time > now() - interval '1 hour'
ORDER BY event_time DESC;
```

---

### 2. Task Completion Velocity
**Source:** `task_events`
**Filters:** `tenantId, supervisor_id, time_window`
**Shows:**
- tasks completed per hour/day (bar chart)
- average task completion time (gauge)
- on-time vs delayed tasks (pie)
- task velocity trend (line)
👉 **productivity speed**

**SQL:**
```sql
SELECT DATE_TRUNC('hour', completed_at) as hour,
       COUNT(*) as tasks_completed,
       ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::numeric, 1) as avg_hours_to_complete,
       COUNT(*) FILTER (WHERE completed_at <= due_at) as ontime_tasks
FROM task_events
WHERE tenant_id = ? AND supervisor_id = ? AND completed_at BETWEEN ? AND ?
GROUP BY hour
ORDER BY hour DESC;
```

---

### 3. Attendance Drift Detector
**Source:** `shift_assignments`, `attendance_events`
**Filters:** `tenantId, supervisor_id, time_window`
**Shows:**
- late entry pattern (histogram of minutes late)
- early exit trend (histogram of minutes early)
- worker punctuality scorecard
- drift trend over time
👉 **discipline monitoring**

**SQL:**
```sql
SELECT DATE(ae.event_time) as date,
       user_id, worker_name,
       ROUND(AVG(EXTRACT(EPOCH FROM (ae.event_time - sa.shift_start_time))/60)::numeric, 1) as avg_minutes_late,
       COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ae.event_time - sa.shift_start_time))/60 > 5) as late_days
FROM shift_assignments sa
LEFT JOIN attendance_events ae ON ae.user_id = sa.worker_id AND DATE(ae.event_time) = DATE(sa.assignment_date)
WHERE sa.tenant_id = ? AND sa.supervisor_id = ? AND sa.assignment_date BETWEEN ? AND ?
GROUP BY date, user_id, worker_name
ORDER BY date DESC, avg_minutes_late DESC;
```

---

### 4. Incident Response Timeline
**Source:** `incident_logs`
**Filters:** `tenantId, supervisor_id, time_window`
**Shows:**
- time to respond vs resolve (bar chart)
- incident type distribution (pie)
- average MTTR (gauge)
- supervisor efficiency score
👉 **supervisor efficiency**

**SQL:**
```sql
SELECT incident_type, COUNT(*) as count,
       ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/60)::numeric, 0) as avg_response_time_min,
       ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 1) as avg_resolution_time_hours,
       ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 1) as avg_mttr
FROM incident_logs
WHERE tenant_id = ? AND assigned_supervisor_id = ? AND created_at BETWEEN ? AND ?
GROUP BY incident_type
ORDER BY count DESC;
```

---

### 5. Worker Load Distribution
**Source:** `task_events`, `shift_assignments`
**Filters:** `tenantId, supervisor_id, time_window`
**Shows:**
- overworked vs underutilized workers (scatter/bubble chart)
- task count per worker (bar)
- workload balance score
- worker fatigue risk (based on hours + tasks)
👉 **balancing workload**

**SQL:**
```sql
SELECT user_id, worker_name,
       COUNT(DISTINCT DATE(ta.created_at)) as active_days,
       COUNT(*) as total_tasks_assigned,
       ROUND(AVG(EXTRACT(EPOCH FROM (sa.shift_end_time - sa.shift_start_time))/3600)::numeric, 1) as avg_shift_hours,
       ROUND(100.0 * COUNT(*) / MAX(COUNT(*)) OVER ()::numeric, 2) as relative_load_pct
FROM task_events ta
JOIN shift_assignments sa ON ta.assigned_to = sa.worker_id
WHERE ta.tenant_id = ? AND ta.supervisor_id = ? AND ta.created_at BETWEEN ? AND ?
GROUP BY user_id, worker_name
ORDER BY total_tasks_assigned DESC;
```

---

# 🛡 SECURITY_OFFICER (Threat Intelligence Layer)
Base route: `/security`

Pages: Dashboard | Kiosk Control | Live Biometric Feed | Spoof Detection | Geofence Violations | Incidents | Blocked Workers | Realtime Alerts | Surveillance Logs | AI Assistant | Registration | Face Enrollment

---

## Charts

### 1. Spoof Detection Confidence Trend
**Source:** `biometric_logs`
**Filters:** `tenantId, time_window=last_24h|week`
**Shows:**
- spoof attempts over time (line chart)
- confidence scores distribution (histogram)
- spoof detection rate (%)
- confidence score threshold effectiveness
👉 **fraud detection strength**

**SQL:**
```sql
SELECT DATE_TRUNC('hour', event_time) as hour,
       COUNT(*) as total_attempts,
       COUNT(*) FILTER (WHERE spoof_confidence > 0.7) as suspected_spoof,
       ROUND(100.0 * COUNT(*) FILTER (WHERE spoof_confidence > 0.7) / COUNT(*)::numeric, 2) as spoof_rate_pct,
       ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence,
       ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY confidence_score)::numeric, 2) as p95_confidence
FROM biometric_logs
WHERE tenant_id = ? AND event_time BETWEEN ? AND ?
GROUP BY hour
ORDER BY hour DESC;
```

---

### 2. Access Anomaly Detector
**Source:** `kiosk_events`
**Filters:** `tenantId, time_window`
**Shows:**
- unusual access times (flagged events)
- repeated failed attempts (alerting)
- anomaly score per worker/time combo
- intrusion risk heatmap
👉 **intrusion detection**

**SQL:**
```sql
SELECT user_id, worker_name, kiosk_id,
       COUNT(*) as access_attempts,
       COUNT(*) FILTER (WHERE status='FAILED') as failures,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status='FAILED') / COUNT(*)::numeric, 2) as failure_rate,
       COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM event_time) NOT BETWEEN 6 AND 18) as offhours_attempts,
       MAX(CASE WHEN status='BLOCKED' THEN 1 ELSE 0 END) as blocked_flag
FROM kiosk_events
WHERE tenant_id = ? AND event_time BETWEEN ? AND ?
GROUP BY user_id, worker_name, kiosk_id
HAVING COUNT(*) FILTER (WHERE status='FAILED') > 3 OR COUNT(*) FILTER (WHERE status='BLOCKED') > 0
ORDER BY failure_rate DESC;
```

---

### 3. Geofence Breach Map (Real-time)
**Source:** `geofence_events`
**Filters:** `tenantId, site_id, time_window=last_1h`
**Shows:**
- live breach locations (map with pins)
- breach hotspots (heatmap overlay)
- violation frequency per site
- active breaches (real-time alerts)
👉 **perimeter security**

**SQL:**
```sql
SELECT site_id, site_name, geo_lat, geo_lon,
       COUNT(*) as breaches_last_hour,
       MAX(event_time) as last_breach_time,
       COUNT(DISTINCT user_id) as unique_violators,
       CASE WHEN COUNT(*) > 5 THEN 'CRITICAL' 
            WHEN COUNT(*) > 2 THEN 'WARNING' 
            ELSE 'OK' END as alert_level
FROM geofence_events
WHERE tenant_id = ? AND event_time > now() - interval '1 hour'
GROUP BY site_id, site_name, geo_lat, geo_lon
ORDER BY breaches_last_hour DESC;
```

---

### 4. Worker Blacklist Impact Chart
**Source:** `kiosk_events`, `worker_blocklist`
**Filters:** `tenantId, time_window`
**Shows:**
- blocked worker activity attempts (count)
- blocked vs allowed access ratio (pie)
- enforcement effectiveness (%)
- blocked worker list with attempt counts
👉 **enforcement tracking**

**SQL:**
```sql
SELECT wb.user_id, w.name,
       COUNT(*) as access_attempts_since_block,
       COUNT(*) FILTER (WHERE ke.status='BLOCKED') as denied_entries,
       ROUND(100.0 * COUNT(*) FILTER (WHERE ke.status='BLOCKED') / COUNT(*)::numeric, 2) as block_enforcement_pct,
       MAX(wb.block_reason) as block_reason,
       MAX(wb.created_at) as block_date
FROM worker_blocklist wb
LEFT JOIN kiosk_events ke ON wb.user_id = ke.user_id AND ke.event_time > wb.created_at
LEFT JOIN workers w ON w.id = wb.user_id
WHERE wb.tenant_id = ? AND wb.created_at BETWEEN ? AND ?
GROUP BY wb.user_id, w.name
ORDER BY access_attempts_since_block DESC;
```

---

### 5. Surveillance Event Index
**Source:** `surveillance_events`, `kiosk_logs`
**Filters:** `tenantId, camera_id|site_id, time_window`
**Shows:**
- alert density per camera/site (heatmap)
- alert type distribution (pie)
- peak alert times (line chart)
- monitoring efficiency (events per camera per hour)
👉 **monitoring efficiency**

**SQL:**
```sql
SELECT camera_id, site_id, site_name,
       COUNT(*) as total_alerts,
       COUNT(*) FILTER (WHERE alert_level='HIGH') as high_priority,
       ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - event_time))/60)::numeric, 1) as avg_processing_time_min,
       DATE_TRUNC('hour', event_time) as hour
FROM surveillance_events
WHERE tenant_id = ? AND event_time BETWEEN ? AND ?
GROUP BY camera_id, site_id, site_name, hour
ORDER BY hour DESC, total_alerts DESC;
```

---

# 🏭 VENDOR_MANAGER (External Workforce Intelligence)
Base route: `/vendor`

Pages: Dashboard | My Workers | Attendance Reports | Billing Reports | Worker Assignment | Compliance Status | Notifications | AI Assistant

---

## Charts

### 1. Vendor Productivity Index
**Source:** `shift_assignments`, `attendance_events`, `task_events`
**Filters:** `tenantId=vendor, time_window`
**Shows:**
- output per vendor workforce (tasks completed per worker)
- productivity trend (line)
- comparison vs peer vendors
- efficiency score gauge
👉 **vendor comparison**

**SQL:**
```sql
SELECT DATE_TRUNC('day', te.completed_at) as day,
       COUNT(*) as tasks_completed,
       COUNT(DISTINCT te.assigned_to) as workers_active,
       ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT te.assigned_to), 0), 2) as tasks_per_worker,
       ROUND(AVG(EXTRACT(EPOCH FROM (te.completed_at - te.created_at))/3600)::numeric, 1) as avg_completion_hours
FROM task_events te
WHERE te.tenant_id = ? AND te.assigned_by_vendor = TRUE AND te.completed_at BETWEEN ? AND ?
GROUP BY day
ORDER BY day DESC;
```

---

### 2. Cost vs Output Curve
**Source:** `payroll_records`, `task_events`, `attendance_events`
**Filters:** `tenantId=vendor, billing_period`
**Shows:**
- cost per active worker (scatter plot)
- cost vs output correlation
- ROI per worker
- billing efficiency trend
👉 **financial efficiency**

**SQL:**
```sql
SELECT pr.period_end,
       COUNT(DISTINCT pr.worker_id) as workers_paid,
       ROUND(SUM(pr.base_salary + pr.overtime_hours * pr.overtime_rate)::numeric, 2) as total_cost,
       COUNT(*) FILTER (WHERE te.status='COMPLETED') as output_units,
       ROUND((COUNT(*) FILTER (WHERE te.status='COMPLETED'))::numeric / NULLIF(COUNT(DISTINCT pr.worker_id), 0), 2) as output_per_worker,
       ROUND((SUM(pr.base_salary + pr.overtime_hours * pr.overtime_rate) / NULLIF(COUNT(*) FILTER (WHERE te.status='COMPLETED'), 0))::numeric, 2) as cost_per_output_unit
FROM payroll_records pr
LEFT JOIN task_events te ON pr.worker_id = te.assigned_to AND DATE(te.completed_at) BETWEEN DATE(pr.period_start) AND DATE(pr.period_end)
WHERE pr.tenant_id = ?
GROUP BY pr.period_end
ORDER BY pr.period_end DESC;
```

---

### 3. Compliance Adherence Score
**Source:** `worker_documents`, `attendance_events`
**Filters:** `tenantId=vendor, time_window`
**Shows:**
- vendor compliance percentage (gauge)
- document compliance breakdown (stacked bar)
- attendance compliance trend
- risk score
👉 **regulatory risk**

**SQL:**
```sql
SELECT 
  ROUND(100.0 * COUNT(*) FILTER (WHERE wd.expiry_date >= now() AND ae.biometric_verified=TRUE) / COUNT(DISTINCT w.id)::numeric, 2) as compliance_pct,
  COUNT(*) FILTER (WHERE wd.expiry_date < now()) as expired_docs,
  COUNT(DISTINCT w.id) as total_workers,
  ROUND(100.0 * COUNT(DISTINCT ae.user_id) / COUNT(DISTINCT w.id)::numeric, 2) as attendance_coverage_pct
FROM workers w
LEFT JOIN worker_documents wd ON w.id = wd.worker_id AND wd.tenant_id = ?
LEFT JOIN attendance_events ae ON ae.user_id = w.id AND ae.event_time BETWEEN ? AND ?
WHERE w.vendor_id = (SELECT id FROM vendors WHERE tenant_id = ? LIMIT 1)
  AND w.tenant_id = ?;
```

---

### 4. Worker Allocation Distribution
**Source:** `shift_assignments`
**Filters:** `tenantId=vendor, time_window`
**Shows:**
- where vendor workers are deployed (pie chart by site/client)
- allocation trend per site
- worker density per location
- re-deployment flexibility
👉 **resource mapping**

**SQL:**
```sql
SELECT s.id as site_id, s.name as site_name,
       COUNT(DISTINCT sa.worker_id) as workers_allocated,
       COUNT(*) as total_shifts,
       ROUND(100.0 * COUNT(DISTINCT sa.worker_id) / (SELECT COUNT(*) FROM workers WHERE vendor_id = ? AND tenant_id = ?)::numeric, 2) as pct_of_vendor_workforce,
       ROUND(AVG(EXTRACT(EPOCH FROM (sa.shift_end_time - sa.shift_start_time))/3600)::numeric, 1) as avg_shift_hours
FROM shift_assignments sa
JOIN sites s ON sa.site_id = s.id
WHERE sa.vendor_id = ? AND sa.tenant_id = ? AND sa.assignment_date BETWEEN ? AND ?
GROUP BY s.id, s.name
ORDER BY workers_allocated DESC;
```

---

# 👷 WORKER (Personal Intelligence Layer)
Base route: `/worker`

Pages: Dashboard | Attendance History | Check In/Out | Profile | Shift Schedule | Notifications | Documents | Support

---

## Charts

### 1. Attendance Consistency Score
**Source:** `attendance_events`, `shift_assignments`
**Filters:** `userId=self, time_window=month|quarter`
**Shows:**
- punctuality trend (% on-time %)
- attendance consistency gauge (0-100)
- absence pattern (highlighted days)
- personal discipline score
👉 **self discipline metric**

**SQL:**
```sql
SELECT 
  ROUND(100.0 * COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ae.event_time - sa.shift_start_time))/60 <= 5) / COUNT(*)::numeric, 2) as ontime_pct,
  COUNT(*) FILTER (WHERE ae.event_type IS NULL) as absences,
  COUNT(*) as total_shifts,
  ROUND(100.0 * (COUNT(*) - COUNT(*) FILTER (WHERE ae.event_type IS NULL)) / COUNT(*)::numeric, 2) as attendance_rate
FROM shift_assignments sa
LEFT JOIN attendance_events ae ON ae.user_id = sa.worker_id AND DATE(ae.event_time) = DATE(sa.assignment_date)
WHERE sa.worker_id = ? AND sa.tenant_id = ? AND sa.assignment_date BETWEEN ? AND ?;
```

---

### 2. Shift Completion Timeline
**Source:** `shift_assignments`, `attendance_events`
**Filters:** `userId=self, time_window=week|month`
**Shows:**
- daily shift adherence (calendar heatmap)
- shift duration compliance (gauge)
- early/late exit patterns
- work tracking log
👉 **work tracking**

**SQL:**
```sql
SELECT DATE(sa.assignment_date) as date,
       sa.shift_start_time, sa.shift_end_time,
       ae.event_time as actual_checkin,
       CASE WHEN ae.event_type='CHECK_IN' THEN 'PRESENT'
            WHEN ae.event_type='CHECK_OUT' THEN 'COMPLETED'
            ELSE 'ABSENT' END as status,
       EXTRACT(EPOCH FROM (ae.event_time - sa.shift_start_time))/60 as minutes_late
FROM shift_assignments sa
LEFT JOIN attendance_events ae ON ae.user_id = sa.worker_id AND DATE(ae.event_time) = DATE(sa.assignment_date)
WHERE sa.worker_id = ? AND sa.tenant_id = ? AND sa.assignment_date BETWEEN ? AND ?
ORDER BY sa.assignment_date DESC;
```

---

### 3. Earnings / Overtime Tracker
**Source:** `payroll_records`, `shift_assignments`
**Filters:** `userId=self, time_window=month|quarter`
**Shows:**
- estimated earnings trend (line chart)
- base vs overtime breakdown (pie)
- monthly earnings forecast
- financial awareness dashboard
👉 **financial awareness**

**SQL:**
```sql
SELECT DATE_TRUNC('month', pr.period_end) as month,
       pr.base_salary,
       pr.overtime_hours,
       pr.overtime_rate,
       ROUND((pr.overtime_hours * pr.overtime_rate)::numeric, 2) as overtime_pay,
       ROUND((pr.base_salary + pr.overtime_hours * pr.overtime_rate)::numeric, 2) as total_pay
FROM payroll_records pr
WHERE pr.worker_id = ? AND pr.tenant_id = ? AND pr.period_end BETWEEN ? AND ?
ORDER BY pr.period_end DESC;
```

---

### 4. Activity Summary Timeline
**Source:** `attendance_events`
**Filters:** `userId=self, time_window=week`
**Shows:**
- daily work pattern (timeline view)
- check-in/out times (daily log)
- total hours worked per day
- self visibility dashboard
👉 **self visibility**

**SQL:**
```sql
SELECT DATE(ae.event_time) as date,
       MIN(CASE WHEN ae.event_type='CHECK_IN' THEN ae.event_time END) as first_checkin,
       MAX(CASE WHEN ae.event_type='CHECK_OUT' THEN ae.event_time END) as last_checkout,
       ROUND(EXTRACT(EPOCH FROM (MAX(CASE WHEN ae.event_type='CHECK_OUT' THEN ae.event_time END) - 
                                 MIN(CASE WHEN ae.event_type='CHECK_IN' THEN ae.event_time END)))/3600::numeric, 2) as hours_worked,
       COUNT(*) as event_count
FROM attendance_events ae
WHERE ae.user_id = ? AND ae.tenant_id = ? AND ae.event_time BETWEEN ? AND ?
GROUP BY date
ORDER BY date DESC;
```

---

## Summary

All charts are now **data-driven** from real event tables, not UI mocks:
- Filtered by `tenantId` for organizational boundary
- Scoped by `role` for permission-based data views
- Personalized via `userId` where applicable
- Time-windowed for real-time, daily, weekly, monthly aggregation
- Built from raw `attendance_events`, `biometric_logs`, `kiosk_events`, `incident_logs`, etc.

**Next Step:** Implement `analyticsQuery()` service in backend to execute these queries and return chart-ready data to the frontend.
