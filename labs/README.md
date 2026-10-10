# Labs

Small DAGs that each reproduce one failure on a local Airflow, so you can read what Airflow tells you before you read the fix. Every lab is also shown on its entry's page in the atlas.

```sh
python -m venv .venv && . .venv/bin/activate
pip install "apache-airflow==3.0.6" --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-3.0.6/constraints-3.12.txt"
export AIRFLOW_HOME=$PWD/.airflow
airflow standalone          # in another terminal; it prints the admin password
```

| Lab | Copy, then run | What you will see | Entry |
|---|---|---|---|
| `lab_broken_import.py` | `airflow dags list-import-errors` | ModuleNotFoundError for a provider that is not installed | [Broken DAG](../docs/failures/dag-import-error.md) |
| `lab_slow_parse.py` | `airflow dags report` | DagBag import timeout after 30 seconds | [DAG import timeout](../docs/failures/dag-processing-timeout.md) |
| `lab_pool.py` | `airflow pools set lab_pool 1 "one slot"`, then trigger it | Two of three mapped tasks wait in scheduled | [Pools and limits](../docs/failures/pool-slots-exhausted.md) |
| `lab_timeout.py` | `airflow dags test lab_timeout` | AirflowTaskTimeout after 10 seconds | [Task timed out](../docs/failures/execution-timeout.md) |
| `lab_missing_connection.py` | `airflow dags test lab_missing_connection` | The conn_id `lab_warehouse` isn't defined | [Connection not defined](../docs/failures/connection-not-found.md) |
| `lab_memory_hog.py` | inside a container with `-m 1g` (see the entry) | The process is killed with SIGKILL (exit 137) | [Killed for memory](../docs/failures/task-oom.md) |

Copy a lab with `cp labs/dags/<lab>.py $AIRFLOW_HOME/dags/` and remove it afterwards. Never run `lab_memory_hog.py` outside a memory-limited container. Failures that need AWS (IAM, VPC endpoints, MWAA) cannot be reproduced locally; their entries carry real messages instead.
