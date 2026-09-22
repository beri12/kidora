# Kidora AI service

FastAPI service that owns AI, ML and retrieval for Kidora. It is **not**
public: the Kidora API (NestJS) authenticates the user, authorises what they
may read, builds the learner context, and calls this service on the internal
network with a shared secret.

    Browser -> NestJS (authn + authz) -> AI service -> LLM

## Why the split

NestJS keeps the database, sessions and every authorization rule. This service
never resolves a student id on its own, so a browser cannot ask about another
child by changing an id in a request.

## Run locally

    python -m venv .venv && .venv/bin/pip install -r requirements.txt
    cp .env.example .env
    .venv/bin/uvicorn app.main:app --reload --port 8000

Docs at http://localhost:8000/docs

## Tests

    .venv/bin/python -m pytest

## Provider abstraction

`LLM_PROVIDER` selects the implementation behind `LLMProvider`; business logic
never names a vendor. `local` is a real fallback, not a fake LLM — it returns
an honest "unavailable" message and flags every response `degraded: true` so
the UI can say so.

## Phase status

Implemented (Phase 1): service skeleton, config, structured logging,
service-to-service auth, LLM provider abstraction (OpenAI / Anthropic /
Google / local), child-safety moderation in and out, structured response
validation with one retry and a safe fallback, adaptive difficulty banding,
health and readiness, Docker, tests.

Not yet implemented: RAG and pgvector (Phase 3), knowledge tracing and the
learner model (Phase 4), trained ML models (Phase 5), quiz/homework/reading/
story generators and study plans (Phase 6).
