<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Scheduler not healthy

**Trigger:** No scheduler heartbeat for 2 minutes (AirflowSchedulerDown), or the UI banner.

**Impact:** Nothing new is scheduled. Running tasks finish; new runs and tasks wait.

[Open as a flowchart](../../index.html#/operations/runbooks/scheduler-not-healthy)

## Triage (2 minutes)

**Is any scheduler alive?.** 

```sh
airflow jobs check --job-type SchedulerJob --allow-multiple --limit 5
```

## Diagnose

**Read the last scheduler logs.** 

```sh
kubectl logs deploy/airflow-scheduler -n airflow --tail=200
```

| If you see | Then |
|---|---|
| too many clients already | [Database out of connections](../failures/db-connections-exhausted.md) |
| Loop duration in tens of seconds | [Metadata database bloat](../failures/metadata-db-bloat.md) |
| Crashed or OOMKilled | [Scheduler not running](../failures/scheduler-not-running.md) |

## Mitigate

**Restart the scheduler.** 

```sh
kubectl rollout restart deploy/airflow-scheduler -n airflow
```

## Resolve

Fix what stopped it, and run two schedulers so one can fail.

## Verify

Heartbeat steady and queued runs starting.

## Escalate

If the scheduler will not stay up, page the platform lead.
