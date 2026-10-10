# Common tasks: `make help` lists them. The atlas tooling needs only Node 20+; the labs need Python.
.PHONY: help serve test check docs build browser lab snapshot

help: ## list the targets
	@grep -E '^[a-z-]+:.*## ' Makefile | sed 's/:.*## /\t/'

serve: ## serve the atlas on http://localhost:8000 (opening index.html works too)
	python3 -m http.server 8000

test: ## unit tests: data integrity, matcher, layout, generated files, Markdown safety
	npm test

check: ## the data is valid and generated files are current (CI runs this)
	npm run check

docs: ## regenerate docs/ from the data
	node scripts/atlas.mjs docs

build: ## write dist/airflow-atlas.html, one file that works offline
	node scripts/atlas.mjs build

browser: ## render every view in Chromium (needs: npm install --no-save playwright)
	npm run test:browser

lab: ## run a local Airflow for the labs (needs apache-airflow, see labs/README.md)
	AIRFLOW_HOME=$(PWD)/.airflow airflow standalone

snapshot: ## a read-only snapshot of the deployment the airflow CLI points at
	tools/snapshot.sh
