<!-- Generated from data/failures/ by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Failure catalog

25 failures across 10 layers. Each has a symptom, the affected component, the root cause, an investigation, a resolution and prevention, and a diagram of how it propagates. The [interactive atlas](../../index.html#/failures) animates each one on the map.

A **symptom** tells you where to look (tasks stuck in queued, a DAG missing from the UI, a task failed with no error). A **cause** names the mechanism (`0 open slots in pool`, `Negsignal.SIGKILL`, `DagBag import timeout`).

## DAG parsing

From files to DAGs.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Broken DAG](dag-import-error.md) | cause | any | DAG files, Python environment |
| [DAG import timeout](dag-processing-timeout.md) | cause | any | DAG files |
| [DAG not in the UI](dag-not-appearing.md) | symptom | any | DAG files |

## Scheduling

Runs, limits and the scheduler loop.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Scheduler not running](scheduler-not-running.md) | cause | any | Scheduler |
| [Tasks wait for slots](pool-slots-exhausted.md) | cause | any | DAG files, Task instance |
| [Catchup flood](catchup-flood.md) | cause | any | DAG files |
| [DAG did not run when expected](dag-run-not-triggered.md) | symptom | any | DAG files, Users |

## Task execution

What happens inside a running task.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Zombie tasks](zombie-tasks.md) | symptom | any | Worker |
| [Task killed for memory](task-oom.md) | cause | any | Task instance |
| [Task timed out](execution-timeout.md) | cause | any | External systems |
| [Task received SIGTERM](task-sigterm.md) | symptom | any | Worker, Users |
| [Large XComs](xcom-too-large.md) | cause | any | Task instance |
| [Sensors hold every slot](sensor-slot-exhaustion.md) | cause | any | Task instance |

## Executors and workers

From queued to running.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Tasks stuck in queued](tasks-stuck-queued.md) | symptom | any | Worker |
| [Celery broker unreachable](broker-unavailable.md) | cause | any | Task queue |
| [Task pod failed or never started](kubernetes-pod-failed.md) | cause | any | Kubernetes |

## Deferral

Triggers and the triggerer.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Deferred tasks never resume](triggerer-not-running.md) | cause | any | Triggerer |

## Metadata database

The hub every component depends on.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Metadata database out of connections](db-connections-exhausted.md) | cause | any | API server, Scheduler |
| [Metadata database bloat](metadata-db-bloat.md) | cause | any | Metadata database |

## Connections

How tasks find credentials.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Connection not defined](connection-not-found.md) | cause | any | Secrets backend |

## Dependencies

Python packages and providers.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Dependency conflict](dependency-conflict.md) | cause | any | Python environment |

## Logs

Getting task logs back to the UI.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Task logs missing in the UI](task-logs-missing.md) | cause | any | Task logs |

## AWS

IAM, networks and managed services.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [AccessDenied from AWS](aws-access-denied.md) | cause | AWS | Execution role |
| [Tasks time out calling AWS](aws-endpoint-timeout.md) | cause | AWS | NAT or VPC, Security groups |
| [Cannot read connections from Secrets Manager](secrets-access-denied.md) | cause | AWS | Execution role |
