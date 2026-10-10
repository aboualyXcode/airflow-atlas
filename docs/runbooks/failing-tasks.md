<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Many tasks failing

**Trigger:** Task failures well above normal (AirflowTaskFailuresHigh), or zombies (AirflowZombies).

**Impact:** Runs fail or retry; downstream data is late or missing.

[Open as a flowchart](../../index.html#/operations/runbooks/failing-tasks)

## Triage (5 minutes)

**One DAG or many? One worker or all?.** Failures across unrelated DAGs point at the platform; one DAG points at its code or its target.

## Diagnose

| If you see | Then |
|---|---|
| Log stops, Detected zombie job | [Zombie tasks](../failures/zombie-tasks.md) |
| Negsignal.SIGKILL or OOMKilled | [Killed for memory](../failures/task-oom.md) |
| Received SIGTERM | [Task received SIGTERM](../failures/task-sigterm.md) |
| conn_id isn't defined | [Connection not defined](../failures/connection-not-found.md) |
| AccessDenied or Connect timeout to AWS | [AccessDenied](../failures/aws-access-denied.md) or [network path](../failures/aws-endpoint-timeout.md) |

## Mitigate

**Roll back the last change.** A DAG deploy, a requirements change, or a network or IAM change.

## Resolve

**Clear the failed tasks once fixed.** 

```sh
airflow tasks clear orders_daily --only-failed --start-date <date> --yes
```

## Verify

Failure rate back to normal for an hour.

## Escalate

Data that may be wrong, not just late, is SEV1: tell its consumers.
