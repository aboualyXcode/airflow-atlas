// "What are you seeing?" Each symptom fans out to the failures that produce it. `tell` is the
// message or check that tells the causes apart; `label` overrides the failure title when one
// entry covers several distinct causes. Every failure must appear in at least one fan.
KA.define("triage", [
  {
    id: "not-in-ui", group: "DAGs", label: "DAG broken or missing in the UI",
    see: "A Broken DAG banner, or a DAG that never appears.",
    check: "airflow dags list-import-errors",
    causes: [
      { id: "dag-import-error", tell: "Broken DAG: ... ModuleNotFoundError" },
      { id: "dag-processing-timeout", tell: "DagBag import timeout ... after 30.0s" },
      { id: "dag-not-appearing", tell: "no import error, the DAG is simply absent" },
      { id: "dependency-conflict", tell: "ResolutionImpossible when installing requirements" },
    ],
  },
  {
    id: "not-running", group: "DAGs", label: "The DAG did not run when expected",
    see: "No run appeared at the time you expected.",
    check: "airflow dags details orders_daily | grep -E 'is_paused|next_dagrun'",
    causes: [
      { id: "dag-run-not-triggered", tell: "paused, or the next run is later than you think" },
      { id: "scheduler-not-running", tell: "The scheduler does not appear to be running" },
      { id: "catchup-flood", tell: "hundreds of old runs ahead of today's" },
      { id: "dag-import-error", tell: "the DAG has an import error" },
    ],
  },
  {
    id: "queued", group: "Tasks", label: "Tasks stuck in scheduled or queued",
    see: "Tasks are ready but do not start.",
    check: "airflow pools list",
    causes: [
      { id: "pool-slots-exhausted", tell: "0 open slots in pool / max_active_tasks limit" },
      { id: "tasks-stuck-queued", label: "No worker takes them", tell: "queued for minutes while workers are idle" },
      { id: "broker-unavailable", tell: "consumer: Cannot connect to redis://" },
      { id: "kubernetes-pod-failed", tell: "task pods Pending or ImagePullBackOff" },
      { id: "sensor-slot-exhaustion", tell: "most running tasks are poking sensors" },
      { id: "catchup-flood", tell: "old runs at max_active_runs" },
    ],
  },
  {
    id: "deferred", group: "Tasks", label: "Deferred tasks never resume",
    see: "Tasks stay in deferred long after the event they wait for.",
    check: "airflow jobs check --job-type TriggererJob",
    causes: [
      { id: "triggerer-not-running", tell: "The triggerer does not appear to be running" },
      { id: "triggerer-not-running", label: "A trigger blocks the triggerer", tell: "Triggerer's async thread was blocked" },
    ],
  },
  {
    id: "failed-no-log", group: "Tasks", label: "Task failed with no error in its log",
    see: "The log just stops, or cannot be read.",
    check: "grep -iE 'zombie|SIGKILL|SIGTERM' scheduler.log task.log | tail",
    causes: [
      { id: "zombie-tasks", tell: "Detected zombie job" },
      { id: "task-oom", tell: "Task exited with return code Negsignal.SIGKILL" },
      { id: "task-sigterm", tell: "Received SIGTERM. Terminating subprocesses." },
      { id: "task-logs-missing", tell: "*** Could not read served logs" },
    ],
  },
  {
    id: "failed-error", group: "Tasks", label: "Task failed with an exception",
    see: "The task log ends in a traceback.",
    check: "airflow tasks states-for-dag-run orders_daily <run_id>",
    causes: [
      { id: "connection-not-found", tell: "The conn_id `...` isn't defined" },
      { id: "execution-timeout", tell: "AirflowTaskTimeout: Timeout, PID" },
      { id: "xcom-too-large", tell: "Data too long for column 'value' (xcom)" },
      { id: "aws-access-denied", tell: "is not authorized to perform" },
      { id: "aws-endpoint-timeout", tell: "Connect timeout on endpoint URL" },
      { id: "secrets-access-denied", tell: "not authorized: secretsmanager:GetSecretValue" },
      { id: "kubernetes-pod-failed", tell: "Pod ... returned a failure" },
    ],
  },
  {
    id: "slow", group: "The platform", label: "Everything is slow",
    see: "Tasks start late, the UI is sluggish, DAG changes take minutes to appear.",
    check: "# metrics: scheduler.scheduler_loop_duration, dag_processing.total_parse_time",
    causes: [
      { id: "metadata-db-bloat", tell: "scheduler loop slow, huge task_instance table" },
      { id: "db-connections-exhausted", tell: "too many clients already" },
      { id: "dag-processing-timeout", tell: "total parse time high" },
      { id: "sensor-slot-exhaustion", tell: "slots full of waiting sensors" },
    ],
  },
  {
    id: "logs", group: "The platform", label: "Task logs missing",
    see: "The UI cannot show a task's log.",
    check: "airflow config get-value logging remote_base_log_folder",
    causes: [
      { id: "task-logs-missing", tell: "Could not read served logs / No logs found" },
      { id: "zombie-tasks", tell: "the worker died before uploading" },
      { id: "aws-endpoint-timeout", tell: "no CloudWatch Logs endpoint from the subnets" },
    ],
  },
  {
    id: "scheduler-banner", group: "The platform", label: "Scheduler or database errors",
    see: "A scheduler warning in the UI, or OperationalError in component logs.",
    check: "airflow jobs check --job-type SchedulerJob --allow-multiple",
    causes: [
      { id: "scheduler-not-running", tell: "no alive SchedulerJob" },
      { id: "db-connections-exhausted", tell: "FATAL: sorry, too many clients already" },
      { id: "metadata-db-bloat", tell: "queries slow, loop duration high" },
    ],
  },
]);
