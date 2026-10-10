"""Lab: a task asks for a connection that does not exist (atlas entry: connection-not-found)."""
from airflow.hooks.base import BaseHook
import pendulum
from airflow.sdk import dag, task


@dag(schedule=None, start_date=pendulum.datetime(2026, 1, 1, tz="UTC"), catchup=False, tags=["lab"])
def lab_missing_connection():
    @task(retries=0)
    def connect():
        conn = BaseHook.get_connection("lab_warehouse")  # never defined
        print(conn.host)

    connect()


lab_missing_connection()
