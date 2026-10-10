"""Larder's daily orders load: the production DAG contract, line by line in the atlas
(Operations > DAG contract). Every highlighted choice prevents a failure in the catalog."""
from datetime import timedelta

import pendulum
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.sdk import dag, task

# Nothing below runs queries or API calls at import time.


@dag(
    schedule="0 3 * * *",
    start_date=pendulum.datetime(2026, 1, 1, tz="Europe/London"),
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 3, "retry_delay": timedelta(minutes=5), "retry_exponential_backoff": True},
    tags=["orders", "tier-1"],
)
def orders_daily():
    wait = S3KeySensor(
        task_id="wait_for_export",
        bucket_key="s3://larder-landing/orders/{{ ds }}/_SUCCESS",
        deferrable=True,
        timeout=6 * 60 * 60,
    )

    @task(execution_timeout=timedelta(minutes=30), pool="warehouse")
    def load(ds=None):
        # Overwrite the day's partition: safe to retry and to backfill.
        path = f"s3://larder-lake/orders/dt={ds}/"
        # ... COPY the export into the warehouse partition for `ds` ...
        return path  # a reference, never the data

    wait >> load()


orders_daily()
