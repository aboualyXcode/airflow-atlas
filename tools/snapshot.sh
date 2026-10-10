#!/usr/bin/env bash
# A read-only snapshot of an Airflow deployment for an incident channel. It changes nothing.
# Usage: tools/snapshot.sh [dag_id ...]   (run where the airflow CLI reaches the deployment)
set -uo pipefail
section() { printf '\n===== %s (%s)\n' "$1" "$(date -u +%H:%M:%SZ)"; }

section "version";        airflow version
section "database";       airflow db check
section "schedulers";     airflow jobs check --job-type SchedulerJob --allow-multiple --limit 5
section "triggerers";     airflow jobs check --job-type TriggererJob --allow-multiple --limit 5
section "import errors";  airflow dags list-import-errors
section "pools";          airflow pools list
section "limits";         for k in parallelism max_active_tasks_per_dag max_active_runs_per_dag; do printf '%s=' "$k"; airflow config get-value core "$k"; done
for d in "$@"; do
  section "runs of $d";   airflow dags list-runs "$d" | head -15
done
