-- Computes the dashboard KPI stats in a single table scan (conditional aggregates),
-- instead of the three separate round-trips + in-app reduce this replaces.
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_tickets bigint,
  open_tickets bigint,
  resolved_by_ai_count bigint,
  resolved_by_ai_percent double precision,
  avg_resolution_time_ms double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*) AS total_tickets,
    count(*) FILTER (WHERE status IN ('new', 'processing', 'open')) AS open_tickets,
    count(*) FILTER (WHERE status IN ('resolved', 'closed') AND "resolvedByAi") AS resolved_by_ai_count,
    CASE WHEN count(*) FILTER (WHERE status IN ('resolved', 'closed')) = 0 THEN 0
      ELSE (count(*) FILTER (WHERE status IN ('resolved', 'closed') AND "resolvedByAi"))::double precision
           / count(*) FILTER (WHERE status IN ('resolved', 'closed')) * 100
    END AS resolved_by_ai_percent,
    avg(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)
      FILTER (WHERE status IN ('resolved', 'closed')) AS avg_resolution_time_ms
  FROM ticket;
$$;
