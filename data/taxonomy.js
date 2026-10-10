// Categories used everywhere: planes colour the stations, layers group failures, and lenses
// filter the AWS map down to one concern at a time.
KA.define("planes", {
  control: { name: "Scheduling and serving", hint: "Decides what runs, and shows it" },
  node: { name: "Execution", hint: "Runs task instances" },
  addon: { name: "State and services", hint: "Database, queue, logs, secrets" },
  workload: { name: "Your code", hint: "DAG files, tasks and their dependencies" },
  client: { name: "People and tools", hint: "UI, CLI and REST users" },
  aws: { name: "Infrastructure and AWS", hint: "Clusters, networks and managed services" },
});

KA.define("layers", [
  { id: "parsing", name: "DAG parsing", hint: "From files to DAGs" },
  { id: "scheduling", name: "Scheduling", hint: "Runs, limits and the scheduler loop" },
  { id: "execution", name: "Task execution", hint: "What happens inside a running task" },
  { id: "workers", name: "Executors and workers", hint: "From queued to running" },
  { id: "deferral", name: "Deferral", hint: "Triggers and the triggerer" },
  { id: "metadata", name: "Metadata database", hint: "The hub every component depends on" },
  { id: "connections", name: "Connections", hint: "How tasks find credentials" },
  { id: "dependencies", name: "Dependencies", hint: "Python packages and providers" },
  { id: "logs", name: "Logs", hint: "Getting task logs back to the UI" },
  { id: "aws", name: "AWS", hint: "IAM, networks and managed services" },
]);

KA.define("lenses", [
  {
    id: "networking",
    name: "Networking",
    summary: "MWAA runs in two private subnets of your VPC. Everything a task calls, including S3, CloudWatch and SQS, must be reachable through a NAT gateway or VPC endpoints.",
    stations: ["vpc", "security-groups", "nat", "worker", "scheduler", "api-server", "aws-targets", "users"],
    flows: ["aws-network"],
    layers: ["aws"],
    decide: {
      title: "How the web server is reached",
      cols: ["Access mode", "Who can open the UI", "Choose it when"],
      rows: [
        ["Private network", "Only clients inside the VPC (VPN, bastion, peered networks)", "Production, with a corporate network to the VPC"],
        ["Public network", "Anyone with an IAM-authorized login token, over the internet", "Teams without a private path; still IAM-protected"],
      ],
    },
  },
  {
    id: "security",
    name: "Security",
    summary: "The execution role is what every task is allowed to do in AWS. Connections and variables belong in a secrets backend, and people sign in to the UI through IAM.",
    stations: ["iam", "secrets-backend", "kms", "worker", "api-server", "users", "dag-bucket"],
    flows: ["aws-mwaa-run"],
    layers: ["connections", "aws"],
    decide: {
      title: "Where connections live",
      cols: ["Option", "How it works", "Watch out for"],
      rows: [
        ["Secrets Manager backend", "Airflow reads airflow/connections/<id> and airflow/variables/<key> on demand", "The execution role needs GetSecretValue on those names"],
        ["Environment variables", "AIRFLOW_CONN_<ID> set on every component", "Visible to anyone who can read the configuration"],
        ["Metadata database", "Created in the UI or CLI, encrypted with the Fernet key", "Drifts from code; lost if the key is lost"],
      ],
    },
  },
  {
    id: "code",
    name: "Code and dependencies",
    summary: "DAGs, plugins and requirements.txt are uploaded to an S3 bucket; MWAA installs the requirements and syncs the DAGs to every component.",
    stations: ["dag-bucket", "dag-files", "python-env", "scheduler", "worker"],
    flows: ["aws-mwaa-run"],
    layers: ["parsing", "dependencies"],
    decide: {
      title: "Ways to add Python packages",
      cols: ["Option", "How it works", "Choose it when"],
      rows: [
        ["requirements.txt with constraints", "Installed on every component at startup", "Pure Python packages pinned to Airflow's constraints file"],
        ["Startup script", "A shell script run before Airflow starts", "System libraries or environment variables"],
        ["Wheels in plugins.zip", "Packages installed from bundled files", "No internet access from the private subnets"],
        ["Your own image (EKS)", "Everything baked and tested in one image", "You run Airflow yourself with the Helm chart"],
      ],
    },
  },
  {
    id: "deployment",
    name: "Deployment",
    summary: "The same DAGs, run three ways on AWS. The choice decides who upgrades Airflow, how workers scale, and which settings you control.",
    stations: ["scheduler", "worker", "metadata-db", "broker", "triggerer", "api-server"],
    flows: [],
    layers: ["scheduling", "workers", "metadata"],
    decide: {
      title: "Ways to run Airflow on AWS",
      cols: ["Option", "You manage", "Choose it when"],
      rows: [
        ["Amazon MWAA", "DAGs, requirements, execution role, network", "You want Airflow without operating it"],
        ["Official Helm chart on EKS", "Everything, through Kubernetes resources", "You need the Kubernetes executor, custom images or full control"],
        ["Docker Compose on EC2", "Everything, by hand", "Development and evaluation only"],
      ],
    },
    widget: "capacity",
  },
  {
    id: "observability",
    name: "Observability",
    summary: "MWAA ships task, scheduler, worker, web server and DAG processing logs to CloudWatch Logs at the level you choose, and Airflow metrics to CloudWatch.",
    stations: ["remote-logs", "cloudwatch", "scheduler", "worker", "api-server"],
    flows: ["aws-mwaa-run"],
    layers: ["logs", "scheduling"],
    decide: {
      title: "What to turn on",
      cols: ["Signal", "Where", "Why"],
      rows: [
        ["Task logs (INFO)", "CloudWatch Logs", "The UI reads task logs from here"],
        ["Scheduler and DAG processing logs", "CloudWatch Logs", "Import errors and slow parsing show up here first"],
        ["Worker logs", "CloudWatch Logs", "Killed tasks and lost heartbeats"],
        ["Airflow metrics", "CloudWatch metrics (AmazonMWAA namespace)", "Queued tasks, running tasks, scheduler heartbeat"],
      ],
    },
  },
]);
