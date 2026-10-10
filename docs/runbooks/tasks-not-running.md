<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Tasks not starting

**Trigger:** Tasks in scheduled or queued for more than 15 minutes (AirflowTasksStarving, AirflowQueuedBacklog).

**Impact:** Runs start late; deadlines are missed.

[Open as a flowchart](../../index.html#/operations/runbooks/tasks-not-running)

## Triage (5 minutes)

**Scheduled or queued?.** Scheduled means a limit holds them; queued means no worker took them.

**Pools and slots.** 

```sh
airflow pools list
```

## Diagnose

| If you see | Then |
|---|---|
| 0 open slots in pool, or max_active_tasks | [Pools and limits](../failures/pool-slots-exhausted.md) |
| Running tasks are mostly sensors | [Sensors hold every slot](../failures/sensor-slot-exhaustion.md) |
| Queued while workers are idle | [No worker picks them up](../failures/tasks-stuck-queued.md) |
| Workers cannot connect to the broker | [Broker unreachable](../failures/broker-unavailable.md) |
| Deferred tasks never come back | [Triggerer not running](../failures/triggerer-not-running.md) |
| Hundreds of old runs | [Catchup flood](../failures/catchup-flood.md) |

## Mitigate

**Pause non-critical DAGs.** 

```sh
airflow dags pause marketing_daily
```

**Add workers or slots.** Scale workers, or raise the pool for the critical DAGs.

## Resolve

Fix the limit, queue or component that held the tasks.

## Verify

Queued tasks fall and critical runs are progressing.

## Escalate

If critical deadlines will be missed, tell their consumers now.
