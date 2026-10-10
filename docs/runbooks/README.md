<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbooks

What to do when an alert fires. The atlas draws each one as a flowchart.

- [DAG import errors](dag-import-errors.md): `dag_processing.import_errors` above zero (AirflowDagImportErrors), or a Broken DAG banner.
- [Scheduler not healthy](scheduler-not-healthy.md): No scheduler heartbeat for 2 minutes (AirflowSchedulerDown), or the UI banner.
- [Tasks not starting](tasks-not-running.md): Tasks in scheduled or queued for more than 15 minutes (AirflowTasksStarving, AirflowQueuedBacklog).
- [Many tasks failing](failing-tasks.md): Task failures well above normal (AirflowTaskFailuresHigh), or zombies (AirflowZombies).
- [Metadata database under pressure](metadata-db-pressure.md): Connections above 80% of max_connections, or database CPU and size climbing (AirflowDbConnectionsHigh, AirflowDbLarge).
- [Upgrading Airflow](airflow-upgrade.md): Planned: a new Airflow or provider version.
