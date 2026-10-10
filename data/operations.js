// Operations, as diagrams: what to watch, how to respond, how to upgrade, how to size, what a
// production DAG declares, the security layers, and the runbooks drawn as flowcharts.
// Metric names are Airflow's StatsD/OpenTelemetry names; a Prometheus exporter renders them with
// underscores (scheduler.tasks.starving becomes airflow_scheduler_tasks_starving).
KA.define("ops", {
  observe: {
    layers: [
      { id: "freshness", name: "Data freshness", alert: "page", alertText: "critical DAG late", metrics: ["last successful run per critical DAG", "dag_processing.last_run.seconds_ago", "ti_failures"], logs: ["task logs of the failing DAG"], query: "time() - max by (dag_id) (airflow_dagrun_last_success_timestamp)", why: "What the business feels: reports and tables that are late. Page here." },
      { id: "parsing", name: "DAG parsing", alert: "ticket", alertText: "import errors, slow parsing", metrics: ["dag_processing.import_errors", "dag_processing.total_parse_time", "dag_processing.file_path_queue_size"], logs: ["DAG processor logs"], query: "max(airflow_dag_processing_import_errors)", why: "Broken or slow DAG files stop changes from reaching the scheduler." },
      { id: "scheduling", name: "Scheduling", alert: "page", alertText: "no scheduler heartbeat", metrics: ["scheduler_heartbeat", "scheduler.scheduler_loop_duration", "scheduler.tasks.starving", "pool.open_slots"], logs: ["scheduler logs"], query: "rate(airflow_scheduler_heartbeat[2m]) == 0", why: "Without a scheduler nothing new starts; a slow loop starts everything late." },
      { id: "execution", name: "Execution", alert: "ticket", alertText: "queued backlog, failures, zombies", metrics: ["executor.queued_tasks", "executor.open_slots", "ti_failures", "zombies_killed"], logs: ["worker logs, task logs"], query: "max(airflow_executor_queued_tasks)", why: "A growing queue with idle workers, or workers dying under tasks." },
      { id: "deferral", name: "Triggerer", alert: "ticket", alertText: "no triggerer heartbeat", metrics: ["triggerer_heartbeat", "triggers.running", "triggers.blocked_main_thread"], logs: ["triggerer logs"], query: "rate(airflow_triggerer_heartbeat[2m]) == 0", why: "Deferred tasks depend on it entirely." },
      { id: "database", name: "Metadata database", alert: "page", alertText: "connections near the limit", metrics: ["active connections against max_connections", "database size", "slow queries"], logs: ["PostgreSQL logs"], query: "sum(pg_stat_activity_count{datname=\"airflow\"}) / max(pg_settings_max_connections)", why: "Every component depends on it; it fails everything at once." },
      { id: "infrastructure", name: "Infrastructure and AWS", alert: "ticket", alertText: "worker memory, MWAA metrics", metrics: ["worker memory and restarts", "AmazonMWAA QueuedTasks and RunningTasks", "SQS queue age"], logs: ["CloudWatch Logs"], query: "# CloudWatch AmazonMWAA: QueuedTasks, RunningTasks, SchedulerHeartbeat", why: "Memory kills and network paths fail tasks without Airflow errors." },
    ],
    dashboards: [
      ["Data freshness", "Last success of each critical DAG against its deadline, failed runs today"],
      ["Scheduling", "Scheduler heartbeat and loop duration, starving tasks, pool usage"],
      ["Execution", "Queued and running tasks, open slots, failures and zombies by DAG"],
      ["DAG parsing", "Import errors, total parse time, slowest files"],
      ["Triggerer", "Heartbeat, running triggers, blocked event loop"],
      ["Metadata database", "Connections, CPU, size of the largest tables"],
    ],
    kinds: [
      ["Symptom", "page", "A critical DAG missed its deadline", "On-call, immediately"],
      ["Imminent symptom", "page", "No scheduler heartbeat, database connections above 90%", "On-call"],
      ["Cause", "ticket", "Import errors, queued backlog, zombies, triggerer down", "Owning team"],
      ["Hygiene", "report", "DAGs without retries or timeouts, sensors in poke mode, large XComs", "Weekly review"],
    ],
    burn: [
      ["14.4×", "1 hour", "5 minutes", "2%", "page"],
      ["6×", "6 hours", "30 minutes", "5%", "page"],
      ["1×", "3 days", "6 hours", "10%", "ticket"],
    ],
  },

  respond: {
    loop: [
      { t: "State the symptom", d: "What, who, since when, how much. 'Six ETL DAGs have not started since 03:00' beats 'Airflow is broken'.", run: "" },
      { t: "Find the first failing hop", d: "Follow the task: file, DAG processor, scheduler, executor, queue, worker, task, target system.", run: "airflow dags list-import-errors\nairflow tasks states-for-dag-run <dag_id> <run_id>" },
      { t: "Read what Airflow reports", d: "Task state, the task log, scheduler logs and the UI banners usually name the mechanism.", run: "airflow jobs check --job-type SchedulerJob --allow-multiple\nairflow pools list" },
      { t: "Name the mechanism", d: "'0 open slots in pool', 'Negsignal.SIGKILL' and 'DagBag import timeout' name a mechanism; 'queued' and 'failed' do not.", run: "" },
      { t: "Ask why until you reach a change", d: "DAG deploys, requirements changes, Helm or environment updates, network and IAM changes.", run: "git log --since=2.days --oneline -- dags/ requirements.txt" },
      { t: "Run the cheapest decisive check", d: "Run one task in isolation, or one connection check, where the failure happens.", run: "airflow tasks test <dag_id> <task_id> <logical_date>\nairflow connections get <conn_id>" },
      { t: "Mitigate, fix, verify, record", d: "Get the critical DAGs running first, then fix the cause, confirm runs succeed, and write it down.", run: "" },
    ],
    first15: [
      { t: "Alert or report arrives" },
      { t: "Acknowledge, open a channel, assign a commander" },
      { t: "State the symptom: which DAGs, since when, how late" },
      { t: "Blast radius: one DAG, one queue, one worker, or every DAG?" },
      { t: "What changed? DAG deploys, requirements, environment updates, network, IAM" },
      { t: "Obvious recent change?", yes: "Roll back that change and clear the affected tasks", no: "Mitigate generically: restart the stuck component, add workers, pause non-critical DAGs" },
      { t: "Verify that critical DAGs are running" },
      { t: "Investigate the root cause with the loop" },
    ],
    checklist: "# 1. Snapshot before anything changes\ntools/snapshot.sh > snapshot-$(date +%H%M).txt\n# 2. Is the platform alive?\nairflow jobs check --job-type SchedulerJob --allow-multiple\nairflow jobs check --job-type TriggererJob\nairflow db check\n# 3. What is broken right now?\nairflow dags list-import-errors\nairflow pools list",
    severity: [
      ["SEV1", "Critical data wrong or lost, or every DAG stopped", "Page now, commander, status page, all hands"],
      ["SEV2", "Critical DAGs late, or one component down", "Page, commander, status page if prolonged"],
      ["SEV3", "Non-critical DAGs failing, deploys blocked", "Business hours, ticket"],
    ],
    roles: [
      ["Incident commander", "Sets priorities, assigns work, decides on mitigations, keeps time", "Type commands"],
      ["Operations lead", "Investigates and makes changes, with helpers", "Talk to stakeholders"],
      ["Communications lead", "Status updates to data consumers", "Make technical calls"],
      ["Scribe", "Keeps the timeline of observations, decisions and actions", "Filter what seems unimportant"],
    ],
  },

  upgrade: {
    steps: [
      { t: "Read the release notes", d: "Airflow 3 removed SubDAGs, SLAs, execution_date and direct database access from tasks; check each feature you use.", run: "", risks: ["dag-import-error"] },
      { t: "Lint DAGs for removed APIs", d: "Ruff's AIR rules flag imports and arguments that changed in Airflow 3.", run: "ruff check dags/ --select AIR3 --preview", risks: ["dag-import-error"] },
      { t: "Pin providers to the new constraints", d: "Install providers with the constraints file of the target Airflow and Python versions.", run: "pip install -r requirements.txt --constraint \"https://raw.githubusercontent.com/apache/airflow/constraints-<version>/constraints-3.12.txt\"", risks: ["dependency-conflict"] },
      { t: "Back up and migrate the database", d: "Take a snapshot, then migrate the schema; large tables make this slow, so clean them first.", run: "airflow db clean --clean-before-timestamp <date> --yes\nairflow db migrate", risks: ["metadata-db-bloat"] },
      { t: "Deploy every component at the same version", d: "Scheduler, DAG processor, triggerer, API server and workers together; MWAA does this for you.", run: "airflow version", risks: ["tasks-stuck-queued", "zombie-tasks"] },
      { t: "Verify, then unpause gradually", d: "Run critical DAGs once by hand before turning the rest back on.", run: "airflow dags test orders_daily", risks: ["catchup-flood"] },
    ],
    facts: [
      ["Components must run the same Airflow version", "Upgrade them together"],
      ["Database migrations are hard to reverse", "Snapshot first, and rehearse on a copy"],
      ["Airflow 3 changed many import paths and defaults", "Lint DAGs before upgrading"],
      ["Providers are released separately", "Pin them with the constraints file"],
      ["Catchup defaults to False in Airflow 3", "Set catchup explicitly in every DAG"],
    ],
    skew: {
      title: "Versions that must agree",
      axis: ["older", "previous", "current", "next", "newer"],
      rows: [["Airflow components", 2, 2, "sk-node"], ["Database schema", 2, 2, "sk-cp"], ["Providers", 1, 3, "sk-cli"]],
    },
  },

  capacity: {
    calc: { runsPerDay: 4000, peakShare: 12, minutes: 6, perWorker: 10, workers: 8, days: 90 },
    dimensions: [
      ["Worker slots", "tasks running at peak against workers × concurrency", "Tasks wait in queued", ["tasks-stuck-queued"]],
      ["Pools and limits", "per-target pools, max_active_tasks, parallelism", "Tasks wait in scheduled", ["pool-slots-exhausted"]],
      ["Worker memory", "the largest task, times tasks per worker", "SIGKILL, zombies", ["task-oom", "zombie-tasks"]],
      ["Database connections", "processes × pool size against max_connections", "OperationalError everywhere", ["db-connections-exhausted"]],
      ["Database size", "task runs per day × days kept", "Slow scheduler and UI", ["metadata-db-bloat"]],
      ["Parse time", "files × import time per file", "Slow or broken DAG updates", ["dag-processing-timeout"]],
    ],
    rules: [
      "Size worker slots for the busiest hour, not the daily average.",
      "Give each external system a pool sized to what it can take.",
      "Keep memory-heavy tasks on their own queue or in their own pods.",
      "Clean the metadata database on a schedule; decide how many days you keep.",
    ],
    query: "# Busiest hours of the week: task instances started per hour\nsum(increase(airflow_ti_start[1h]))",
  },

  contract: {
    intro: "A production DAG for Larder's daily orders load. Highlighted lines are the contract: select one.",
    source: "reference/dags/orders_daily.py",
    manifest: [
      [null, "import pendulum"],
      [null, "from datetime import timedelta"],
      [null, "from airflow.sdk import dag, task"],
      [null, "from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor"],
      [null, ""],
      ["toplevel", "# Nothing below runs queries or API calls at import time."],
      [null, "@dag("],
      ["schedule", "    schedule=\"0 3 * * *\","],
      ["start", "    start_date=pendulum.datetime(2026, 1, 1, tz=\"Europe/London\"),"],
      ["catchup", "    catchup=False,"],
      ["limits", "    max_active_runs=1,"],
      ["retries", "    default_args={\"retries\": 3, \"retry_delay\": timedelta(minutes=5), \"retry_exponential_backoff\": True},"],
      [null, "    tags=[\"orders\", \"tier-1\"],"],
      [null, ")"],
      [null, "def orders_daily():"],
      [null, "    wait = S3KeySensor("],
      [null, "        task_id=\"wait_for_export\","],
      [null, "        bucket_key=\"s3://larder-landing/orders/{{ ds }}/_SUCCESS\","],
      ["deferrable", "        deferrable=True,"],
      ["sensor-timeout", "        timeout=6 * 60 * 60,"],
      [null, "    )"],
      [null, ""],
      ["timeout", "    @task(execution_timeout=timedelta(minutes=30), pool=\"warehouse\")"],
      [null, "    def load(ds=None):"],
      ["idempotent", "        # Overwrite the day's partition: safe to retry and to backfill."],
      [null, "        path = f\"s3://larder-lake/orders/dt={ds}/\""],
      [null, "        ..."],
      ["xcom", "        return path  # a reference, never the data"],
      [null, ""],
      [null, "    wait >> load()"],
      [null, ""],
      ["call", "orders_daily()"],
    ],
    spots: {
      toplevel: { t: "No work at import time", d: "The file is imported on every parse. Queries, API calls and heavy imports belong inside tasks.", prevents: ["dag-processing-timeout", "dag-import-error"] },
      schedule: { t: "A cron schedule you can read", d: "The run for a day starts when that day's interval ends, at 03:00 the following morning.", prevents: ["dag-run-not-triggered"] },
      start: { t: "A timezone-aware start date", d: "pendulum with an explicit timezone, so 03:00 means 03:00 where the business is.", prevents: ["dag-run-not-triggered"] },
      catchup: { t: "Catchup off, on purpose", d: "Historical loads are done with deliberate backfills, never by unpausing.", prevents: ["catchup-flood"] },
      limits: { t: "One run at a time", d: "Runs of a daily load overwrite the same targets; running two at once would race.", prevents: ["catchup-flood", "pool-slots-exhausted"] },
      retries: { t: "Retries with backoff", d: "Transient failures and lost workers recover on their own.", prevents: ["zombie-tasks", "task-sigterm"] },
      deferrable: { t: "A deferrable sensor", d: "Waiting happens in the triggerer, not in a worker slot.", prevents: ["sensor-slot-exhaustion"] },
      "sensor-timeout": { t: "A sensor timeout", d: "If the export never arrives, the run fails visibly after six hours instead of waiting forever.", prevents: ["sensor-slot-exhaustion"] },
      timeout: { t: "An execution timeout and a pool", d: "A hung load fails after 30 minutes; the warehouse pool caps concurrent load on the warehouse.", prevents: ["execution-timeout", "pool-slots-exhausted"] },
      idempotent: { t: "Idempotent writes", d: "Overwriting a partition makes retries, clears and backfills safe.", prevents: [] },
      xcom: { t: "Small XComs", d: "Return where the data is, not the data.", prevents: ["xcom-too-large"] },
      call: { t: "Call the DAG function", d: "The decorated function must be called at module level, or no DAG exists.", prevents: ["dag-not-appearing"] },
    },
  },

  security: {
    rings: [
      { t: "Network", d: "Who can reach the UI and what tasks can reach.", controls: ["Private web server access", "Private subnets with NAT or endpoints", "Security groups per target"], failures: ["aws-endpoint-timeout"] },
      { t: "Sign-in", d: "Every person proves who they are.", controls: ["IAM or single sign-on for the UI", "No shared accounts"], failures: [] },
      { t: "Roles in Airflow", d: "What each person may do in the UI and API.", controls: ["Viewer, User, Op and Admin roles by team", "Audit log of triggers, clears and pauses"], failures: [] },
      { t: "Secrets", d: "Credentials never live in DAG code or Variables.", controls: ["A secrets backend (Secrets Manager)", "One prefix convention per environment"], failures: ["connection-not-found", "secrets-access-denied"] },
      { t: "Execution role", d: "What tasks may do in AWS.", controls: ["Least privilege, reviewed with each DAG change", "Separate roles per environment"], failures: ["aws-access-denied"] },
      { t: "Code and dependencies", d: "Only reviewed code runs.", controls: ["DAGs deployed from CI after review", "Requirements pinned with constraints"], failures: ["dependency-conflict", "dag-import-error"] },
      { t: "Data and logs", d: "Encrypted, and kept only as long as needed.", controls: ["KMS encryption for the environment and logs", "Log and metadata retention by policy"], failures: ["metadata-db-bloat"] },
    ],
  },
});

// On-call runbooks as phases and steps. The atlas draws each one as a flowchart;
// `when`/`then`/`to` items are decision branches that lead to failure entries or other runbooks.
KA.define("runbooks", [
  {
    id: "dag-import-errors", title: "DAG import errors",
    trigger: "`dag_processing.import_errors` above zero (AirflowDagImportErrors), or a Broken DAG banner.",
    impact: "The affected DAGs do not update; new DAGs never appear.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [{ title: "Which files, which errors?", run: "airflow dags list-import-errors" }] },
      { title: "Diagnose", items: [
        { when: "ModuleNotFoundError or ImportError", then: "[Broken DAG](#/failures/dag-import-error)", to: ["dag-import-error"] },
        { when: "DagBag import timeout", then: "[DAG import timeout](#/failures/dag-processing-timeout)", to: ["dag-processing-timeout"] },
        { when: "The last requirements update failed", then: "[Dependency conflict](#/failures/dependency-conflict)", to: ["dependency-conflict"] },
        { when: "No error, but the DAG is absent", then: "[DAG not in the UI](#/failures/dag-not-appearing)", to: ["dag-not-appearing"] },
      ] },
      { title: "Mitigate", items: [{ title: "Revert the last DAG deploy", text: "Most import errors arrive with a deploy; the previous version restores the DAG." }] },
      { title: "Resolve", items: [{ title: "Fix and redeploy", run: "airflow dags reserialize" }] },
      { title: "Verify", items: [{ text: "list-import-errors is empty and the DAG shows its new version." }] },
      { title: "Escalate", items: [{ text: "If a critical DAG cannot be restored within its deadline, page its owner." }] },
    ],
  },
  {
    id: "scheduler-not-healthy", title: "Scheduler not healthy",
    trigger: "No scheduler heartbeat for 2 minutes (AirflowSchedulerDown), or the UI banner.",
    impact: "Nothing new is scheduled. Running tasks finish; new runs and tasks wait.",
    phases: [
      { title: "Triage", hint: "2 minutes", items: [{ title: "Is any scheduler alive?", run: "airflow jobs check --job-type SchedulerJob --allow-multiple --limit 5" }] },
      { title: "Diagnose", items: [
        { title: "Read the last scheduler logs", run: "kubectl logs deploy/airflow-scheduler -n airflow --tail=200" },
        { when: "too many clients already", then: "[Database out of connections](#/failures/db-connections-exhausted)", to: ["db-connections-exhausted"] },
        { when: "Loop duration in tens of seconds", then: "[Metadata database bloat](#/failures/metadata-db-bloat)", to: ["metadata-db-bloat"] },
        { when: "Crashed or OOMKilled", then: "[Scheduler not running](#/failures/scheduler-not-running)", to: ["scheduler-not-running"] },
      ] },
      { title: "Mitigate", items: [{ title: "Restart the scheduler", run: "kubectl rollout restart deploy/airflow-scheduler -n airflow" }] },
      { title: "Resolve", items: [{ text: "Fix what stopped it, and run two schedulers so one can fail." }] },
      { title: "Verify", items: [{ text: "Heartbeat steady and queued runs starting." }] },
      { title: "Escalate", items: [{ text: "If the scheduler will not stay up, page the platform lead." }] },
    ],
  },
  {
    id: "tasks-not-running", title: "Tasks not starting",
    trigger: "Tasks in scheduled or queued for more than 15 minutes (AirflowTasksStarving, AirflowQueuedBacklog).",
    impact: "Runs start late; deadlines are missed.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [
        { title: "Scheduled or queued?", text: "Scheduled means a limit holds them; queued means no worker took them." },
        { title: "Pools and slots", run: "airflow pools list" },
      ] },
      { title: "Diagnose", items: [
        { when: "0 open slots in pool, or max_active_tasks", then: "[Pools and limits](#/failures/pool-slots-exhausted)", to: ["pool-slots-exhausted"] },
        { when: "Running tasks are mostly sensors", then: "[Sensors hold every slot](#/failures/sensor-slot-exhaustion)", to: ["sensor-slot-exhaustion"] },
        { when: "Queued while workers are idle", then: "[No worker picks them up](#/failures/tasks-stuck-queued)", to: ["tasks-stuck-queued"] },
        { when: "Workers cannot connect to the broker", then: "[Broker unreachable](#/failures/broker-unavailable)", to: ["broker-unavailable"] },
        { when: "Deferred tasks never come back", then: "[Triggerer not running](#/failures/triggerer-not-running)", to: ["triggerer-not-running"] },
        { when: "Hundreds of old runs", then: "[Catchup flood](#/failures/catchup-flood)", to: ["catchup-flood"] },
      ] },
      { title: "Mitigate", items: [
        { title: "Pause non-critical DAGs", run: "airflow dags pause marketing_daily" },
        { title: "Add workers or slots", text: "Scale workers, or raise the pool for the critical DAGs." },
      ] },
      { title: "Resolve", items: [{ text: "Fix the limit, queue or component that held the tasks." }] },
      { title: "Verify", items: [{ text: "Queued tasks fall and critical runs are progressing." }] },
      { title: "Escalate", items: [{ text: "If critical deadlines will be missed, tell their consumers now." }] },
    ],
  },
  {
    id: "failing-tasks", title: "Many tasks failing",
    trigger: "Task failures well above normal (AirflowTaskFailuresHigh), or zombies (AirflowZombies).",
    impact: "Runs fail or retry; downstream data is late or missing.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [{ title: "One DAG or many? One worker or all?", text: "Failures across unrelated DAGs point at the platform; one DAG points at its code or its target." }] },
      { title: "Diagnose", items: [
        { when: "Log stops, Detected zombie job", then: "[Zombie tasks](#/failures/zombie-tasks)", to: ["zombie-tasks"] },
        { when: "Negsignal.SIGKILL or OOMKilled", then: "[Killed for memory](#/failures/task-oom)", to: ["task-oom"] },
        { when: "Received SIGTERM", then: "[Task received SIGTERM](#/failures/task-sigterm)", to: ["task-sigterm"] },
        { when: "conn_id isn't defined", then: "[Connection not defined](#/failures/connection-not-found)", to: ["connection-not-found"] },
        { when: "AccessDenied or Connect timeout to AWS", then: "[AccessDenied](#/failures/aws-access-denied) or [network path](#/failures/aws-endpoint-timeout)", to: ["aws-access-denied", "aws-endpoint-timeout"] },
      ] },
      { title: "Mitigate", items: [{ title: "Roll back the last change", text: "A DAG deploy, a requirements change, or a network or IAM change." }] },
      { title: "Resolve", items: [{ title: "Clear the failed tasks once fixed", run: "airflow tasks clear orders_daily --only-failed --start-date <date> --yes" }] },
      { title: "Verify", items: [{ text: "Failure rate back to normal for an hour." }] },
      { title: "Escalate", items: [{ text: "Data that may be wrong, not just late, is SEV1: tell its consumers." }] },
    ],
  },
  {
    id: "metadata-db-pressure", title: "Metadata database under pressure",
    trigger: "Connections above 80% of max_connections, or database CPU and size climbing (AirflowDbConnectionsHigh, AirflowDbLarge).",
    impact: "Every component slows down, then fails.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [{ title: "Connections or size?", run: "psql \"$AIRFLOW_DB\" -c \"SELECT count(*) FROM pg_stat_activity;\"\npsql \"$AIRFLOW_DB\" -c 'SHOW max_connections;'" }] },
      { title: "Diagnose", items: [
        { when: "Close to max_connections", then: "[Out of connections](#/failures/db-connections-exhausted)", to: ["db-connections-exhausted"] },
        { when: "Huge task_instance, log or xcom tables", then: "[Database bloat](#/failures/metadata-db-bloat)", to: ["metadata-db-bloat"] },
        { when: "xcom is the largest table", then: "[Large XComs](#/failures/xcom-too-large)", to: ["xcom-too-large"] },
      ] },
      { title: "Mitigate", items: [{ title: "Scale down extra connections", text: "Reduce API server workers or DAG processor parallelism until PgBouncer is in place." }] },
      { title: "Resolve", items: [{ title: "Clean history", run: "airflow db clean --clean-before-timestamp $(date -d '-90 days' +%F) --dry-run" }] },
      { title: "Verify", items: [{ text: "Connections below 60%, scheduler loop duration back to normal." }] },
      { title: "Escalate", items: [{ text: "If the database refuses connections, page the platform lead immediately." }] },
    ],
  },
  {
    id: "airflow-upgrade", title: "Upgrading Airflow",
    trigger: "Planned: a new Airflow or provider version.",
    impact: "Done well, a short pause in scheduling while components restart.",
    phases: [
      { title: "Before", items: [
        { title: "Lint DAGs for removed APIs", run: "ruff check dags/ --select AIR3 --preview" },
        { title: "Snapshot the metadata database", text: "Migrations are hard to reverse." },
      ] },
      { title: "During", items: [
        { title: "Migrate the schema", run: "airflow db migrate" },
        { title: "Deploy all components at the new version", run: "airflow version" },
      ] },
      { title: "If something goes wrong", items: [
        { when: "Import errors after the upgrade", then: "[DAG import errors runbook](#/operations/runbooks/dag-import-errors)", to: ["runbook:dag-import-errors"] },
        { when: "Requirements fail to install", then: "[Dependency conflict](#/failures/dependency-conflict)", to: ["dependency-conflict"] },
      ] },
      { title: "Verify", items: [{ text: "Critical DAGs run successfully once by hand before unpausing the rest." }] },
    ],
  },
]);
