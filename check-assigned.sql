SELECT 
  COUNT(*) as total_conv,
  COUNT(DISTINCT assignedTo) as distinct_agents,
  COUNT(DISTINCT DATE(openedAt)) as distinct_days,
  SUM(CASE WHEN assignedTo IS NULL THEN 1 ELSE 0 END) as null_assigned
FROM conversations;
