"""DAG integrity tests. Run them in CI against your DAGs before they reach the bundle:

    DAGS_FOLDER=dags pytest reference/ci/test_dag_integrity.py

They catch failures that otherwise appear only in production: import errors, slow imports,
tasks without retries or timeouts, and catchup left on by accident."""
import os
import runpy
import time
from pathlib import Path

import pytest
from airflow.models import DagBag

DAGS_FOLDER = Path(os.environ.get("DAGS_FOLDER", "dags"))
IMPORT_BUDGET_SECONDS = float(os.environ.get("IMPORT_BUDGET_SECONDS", "2"))


@pytest.fixture(scope="session")
def dagbag():
    return DagBag(dag_folder=str(DAGS_FOLDER), include_examples=False)


def test_no_import_errors(dagbag):
    assert not dagbag.import_errors, "\n".join(f"{path}: {err}" for path, err in dagbag.import_errors.items())


def test_dags_exist(dagbag):
    assert dagbag.dags, f"no DAGs found in {DAGS_FOLDER}"


@pytest.mark.parametrize("path", sorted(DAGS_FOLDER.glob("**/*.py")), ids=str)
def test_import_time(path):
    start = time.perf_counter()
    runpy.run_path(str(path))
    elapsed = time.perf_counter() - start
    assert elapsed < IMPORT_BUDGET_SECONDS, f"{path} takes {elapsed:.1f}s to import: move work into tasks"


def test_tasks_have_retries_and_timeouts(dagbag):
    problems = []
    for dag_id, dag in dagbag.dags.items():
        for t in dag.tasks:
            if not t.retries:
                problems.append(f"{dag_id}.{t.task_id}: no retries")
            if t.execution_timeout is None:
                problems.append(f"{dag_id}.{t.task_id}: no execution_timeout")
    assert not problems, "\n".join(problems)


def test_catchup_off_unless_tagged(dagbag):
    flooded = [d for d, dag in dagbag.dags.items() if dag.catchup and "catchup-ok" not in dag.tags]
    assert not flooded, f"catchup=True without the catchup-ok tag: {flooded}"
