# Reference

Configuration and code for Larder's Airflow platform, to read and adapt. Account IDs, ARNs, names and versions are examples.

| Path | What it is | Where the atlas explains it |
|---|---|---|
| `dags/orders_daily.py` | A production DAG that follows the contract | Operations: DAG contract |
| `ci/test_dag_integrity.py` | pytest checks for import errors, import time, retries, timeouts and catchup | Failures: DAG parsing |
| `airflow/production.env` | Production settings for a self-managed deployment, each tied to a failure | Architecture |
| `helm/values.yaml` | Values for the official Helm chart on EKS | Airflow on AWS: deployment lens |
| `mwaa/requirements.txt` | Requirements pinned with Airflow's constraints | Airflow on AWS: code lens |
| `mwaa/execution-role-policy.json` | An MWAA execution role with least privilege | Airflow on AWS: security lens |
| `observability/alerts.yaml` | Prometheus alert rules, each linking to a failure page or runbook | Operations: observe |
