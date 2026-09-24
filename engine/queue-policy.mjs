// Explicit research requests stay first. After four background priority jobs,
// let an ordinary discovery job progress without increasing request frequency.
export function selectAnalysisJob(database, now, priorityStreak) {
  return database
    .prepare(
      `SELECT * FROM analysis_queue
    WHERE queued_at<=? AND (attempts<3 OR queued_at<?)
    ORDER BY CASE WHEN priority>=10 THEN 0 WHEN ? AND priority=0 THEN 1 ELSE 2 END,
    priority DESC,queued_at LIMIT 1`,
    )
    .get(now, now - 1800000, priorityStreak >= 4 ? 1 : 0);
}
