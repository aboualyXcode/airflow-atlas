"""Lab: three tasks share a pool with one slot (atlas entry: pool-slots-exhausted).
Create the pool first:  airflow pools set lab_pool 1 'one slot'"""
import time

import pendulum
from airflow.sdk import dag, task


@dag(schedule=None, start_date=pendulum.datetime(2026, 1, 1, tz="UTC"), catchup=False, tags=["lab"])
def lab_pool():
    @task(pool="lab_pool")
    def slow(n: int):
        time.sleep(60)
        return n

    slow.expand(n=[1, 2, 3])


lab_pool()
