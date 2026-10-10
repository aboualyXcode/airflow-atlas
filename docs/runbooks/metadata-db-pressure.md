<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Metadata database under pressure

**Trigger:** Connections above 80% of max_connections, or database CPU and size climbing (AirflowDbConnectionsHigh, AirflowDbLarge).

**Impact:** Every component slows down, then fails.

[Open as a flowchart](../../index.html#/operations/runbooks/metadata-db-pressure)

## Triage (5 minutes)

**Connections or size?.** 

```sh
psql "$AIRFLOW_DB" -c "SELECT count(*) FROM pg_stat_activity;"
psql "$AIRFLOW_DB" -c 'SHOW max_connections;'
```

## Diagnose

| If you see | Then |
|---|---|
| Close to max_connections | [Out of connections](../failures/db-connections-exhausted.md) |
| Huge task_instance, log or xcom tables | [Database bloat](../failures/metadata-db-bloat.md) |
| xcom is the largest table | [Large XComs](../failures/xcom-too-large.md) |

## Mitigate

**Scale down extra connections.** Reduce API server workers or DAG processor parallelism until PgBouncer is in place.

## Resolve

**Clean history.** 

```sh
airflow db clean --clean-before-timestamp $(date -d '-90 days' +%F) --dry-run
```

## Verify

Connections below 60%, scheduler loop duration back to normal.

## Escalate

If the database refuses connections, page the platform lead immediately.
