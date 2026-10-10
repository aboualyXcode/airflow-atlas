<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: DAG import errors

**Trigger:** `dag_processing.import_errors` above zero (AirflowDagImportErrors), or a Broken DAG banner.

**Impact:** The affected DAGs do not update; new DAGs never appear.

[Open as a flowchart](../../index.html#/operations/runbooks/dag-import-errors)

## Triage (5 minutes)

**Which files, which errors?.** 

```sh
airflow dags list-import-errors
```

## Diagnose

| If you see | Then |
|---|---|
| ModuleNotFoundError or ImportError | [Broken DAG](../failures/dag-import-error.md) |
| DagBag import timeout | [DAG import timeout](../failures/dag-processing-timeout.md) |
| The last requirements update failed | [Dependency conflict](../failures/dependency-conflict.md) |
| No error, but the DAG is absent | [DAG not in the UI](../failures/dag-not-appearing.md) |

## Mitigate

**Revert the last DAG deploy.** Most import errors arrive with a deploy; the previous version restores the DAG.

## Resolve

**Fix and redeploy.** 

```sh
airflow dags reserialize
```

## Verify

list-import-errors is empty and the DAG shows its new version.

## Escalate

If a critical DAG cannot be restored within its deadline, page its owner.
