"""A throwaway server for the automated workflow tests: sync, status, sites and /health, without the
voice models, on its own empty database. Never touches server/data/reunite.db.

    python -m server.testserver --port 8010     (database in a new temporary folder)
"""
import argparse
import os
import sys
import tempfile


def make_app():
    """Builds the app. REUNITE_DB must be set before this is called (store reads it on import)."""
    from fastapi import FastAPI

    from .sites import router as sites_router
    from .status import router as status_router
    from .sync import demo_epoch, router as sync_router

    app = FastAPI()
    app.include_router(sync_router)
    app.include_router(status_router)
    app.include_router(sites_router)

    @app.get("/health")
    def health():
        return {"status": "ok", "test_server": True, "demo_epoch": demo_epoch()}

    return app


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8010)
    args = parser.parse_args()
    os.environ.setdefault("REUNITE_DB", os.path.join(tempfile.mkdtemp(prefix="reunite-test-"), "test.db"))
    os.environ.setdefault("LINK_DELAY_MS", "0")
    import uvicorn

    print(f"test server on {args.port}, database {os.environ['REUNITE_DB']}", file=sys.stderr)
    uvicorn.run(make_app(), host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
