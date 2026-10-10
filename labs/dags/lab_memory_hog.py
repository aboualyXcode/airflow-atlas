"""Lab: a task that keeps allocating memory (atlas entry: task-oom).
Run it only inside a container with a memory limit, as labs/README.md shows."""
import pendulum
from airflow.sdk import dag, task


@dag(schedule=None, start_date=pendulum.datetime(2026, 1, 1, tz="UTC"), catchup=False, tags=["lab"])
def lab_memory_hog():
    @task(retries=0)
    def grow():
        chunks = []
        for _ in range(4096):  # up to 4 GiB, far above the container's 1 GiB limit
            chunks.append(bytearray(1024 * 1024))
        return len(chunks)

    grow()


lab_memory_hog()
