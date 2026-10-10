// Generated from reference/observability/alerts.yaml by `node scripts/atlas.mjs alerts`.
// Do not edit by hand: change the YAML and regenerate (npm test fails when this is stale).
KA.define("alerts", [
  {"alert":"AirflowSchedulerDown","group":"scheduling","severity":"page","summary":"No scheduler heartbeat for 2 minutes","for":"2m","leadsTo":"runbook:scheduler-not-healthy"},
  {"alert":"AirflowTasksStarving","group":"scheduling","severity":"ticket","summary":"Tasks are waiting for pool or concurrency slots","for":"15m","leadsTo":"runbook:tasks-not-running"},
  {"alert":"AirflowNoOpenSlots","group":"scheduling","severity":"ticket","summary":"The executor has had no open slots for 15 minutes","for":"15m","leadsTo":"failure:pool-slots-exhausted"},
  {"alert":"AirflowDagImportErrors","group":"parsing","severity":"ticket","summary":"DAG files fail to import","for":"5m","leadsTo":"runbook:dag-import-errors"},
  {"alert":"AirflowDagParsingSlow","group":"parsing","severity":"ticket","summary":"Parsing every DAG file takes more than a minute","for":"15m","leadsTo":"failure:dag-processing-timeout"},
  {"alert":"AirflowQueuedBacklog","group":"execution","severity":"ticket","summary":"More than 50 tasks have been queued for 15 minutes","for":"15m","leadsTo":"failure:tasks-stuck-queued"},
  {"alert":"AirflowTaskFailuresHigh","group":"execution","severity":"ticket","summary":"More than 20 task failures in 30 minutes","for":"0m","leadsTo":"runbook:failing-tasks"},
  {"alert":"AirflowZombies","group":"execution","severity":"ticket","summary":"Tasks lost their heartbeats","for":"0m","leadsTo":"failure:zombie-tasks"},
  {"alert":"AirflowTriggererDown","group":"execution","severity":"ticket","summary":"No triggerer heartbeat: deferred tasks will not resume","for":"5m","leadsTo":"failure:triggerer-not-running"},
  {"alert":"AirflowDbConnectionsHigh","group":"database","severity":"page","summary":"The metadata database is above 80% of its connections","for":"5m","leadsTo":"failure:db-connections-exhausted"},
  {"alert":"AirflowDbLarge","group":"database","severity":"ticket","summary":"The metadata database is larger than 100 GB","for":"1h","leadsTo":"failure:metadata-db-bloat"}
]);
