import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
worker_class = "uvicorn.workers.UvicornWorker"
# A common starting point: 2x CPU cores + 1. Tune based on load testing.
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))  # ML training/prediction can take a while
graceful_timeout = 30
keepalive = 5
accesslog = "-"   # stdout
errorlog = "-"    # stdout
loglevel = os.getenv("LOG_LEVEL", "info")
