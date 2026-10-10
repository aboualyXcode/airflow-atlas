"""Lab: a task that runs longer than its execution_timeout (atlas entry: execution-timeout)."""
import time
from datetime import timedelta

import pendulum
from airflow.sdk import dag, task


@dag(schedule=None, start_date=pendulum.datetime(2026, 1, 1, tz="UTC"), catchup=False, tags=["lab"])
def lab_timeout():
    @task(execution_timeout=timedelta(seconds=10), retries=0)
    def hangs():
        time.sleep(120)  # stands in for a call with no client timeout

    hangs()


lab_timeout()
