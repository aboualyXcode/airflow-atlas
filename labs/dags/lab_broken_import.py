"""Lab: a DAG that fails at import time (atlas entry: dag-import-error)."""
import pendulum
from airflow.sdk import dag, task
from airflow.providers.does_not_exist.operators.magic import MagicOperator  # noqa: F401  not installed

@dag(schedule=None, start_date=pendulum.datetime(2026, 1, 1, tz="UTC"), catchup=False, tags=["lab"])
def lab_broken_import():
    @task
    def hello():
        print("this DAG never parses")

    hello()


lab_broken_import()
