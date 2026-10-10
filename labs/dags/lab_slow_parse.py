"""Lab: module-level work that outlasts dagbag_import_timeout (atlas entry: dag-processing-timeout).
The sleep stands in for a database query or API call at the top of a DAG file."""
import time

import pendulum
from airflow.sdk import dag, task
time.sleep(40)  # runs on every parse; the default dagbag_import_timeout is 30 seconds

@dag(schedule=None, start_date=pendulum.datetime(2026, 1, 1, tz="UTC"), catchup=False, tags=["lab"])
def lab_slow_parse():
    @task
    def hello():
        print("parsed eventually")

    hello()


lab_slow_parse()
