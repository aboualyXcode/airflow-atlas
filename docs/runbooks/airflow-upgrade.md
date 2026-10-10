<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Upgrading Airflow

**Trigger:** Planned: a new Airflow or provider version.

**Impact:** Done well, a short pause in scheduling while components restart.

[Open as a flowchart](../../index.html#/operations/runbooks/airflow-upgrade)

## Before

**Lint DAGs for removed APIs.** 

```sh
ruff check dags/ --select AIR3 --preview
```

**Snapshot the metadata database.** Migrations are hard to reverse.

## During

**Migrate the schema.** 

```sh
airflow db migrate
```

**Deploy all components at the new version.** 

```sh
airflow version
```

## If something goes wrong

| If you see | Then |
|---|---|
| Import errors after the upgrade | [DAG import errors runbook](dag-import-errors.md) |
| Requirements fail to install | [Dependency conflict](../failures/dependency-conflict.md) |

## Verify

Critical DAGs run successfully once by hand before unpausing the rest.
