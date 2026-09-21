# MANGANAI-SIH — Backend

FastAPI backend for AI/ML manganese-ore prospectivity prediction + satellite
raster processing + GIS zone export + production/demand shortfall forecasting.
Includes JWT authentication and per-user run history backed by SQLite.

## Project layout
```
backend/
  app/
    main.py            # FastAPI app, wires up all routers
    config.py           # env-driven settings (secret key, DB url, CORS, paths)
    database.py          # SQLAlchemy engine/session/init_db
    models_db.py          # ORM tables: User, TrainingRun, PredictionRun, ProductionForecast
    schemas.py             # Pydantic request/response models
    auth/
      security.py          # password hashing + JWT create/decode
      deps.py                # get_current_user dependency
    routers/
      auth.py                 # /auth/register, /auth/login, /auth/me
      training.py               # /train, /metrics
      prediction.py               # /predict, /zones
      production.py                # /production
      history.py                    # /history/trainings, /predictions, /production
      misc.py                        # /, /health, /demo, /raster-info
    ml/
      train.py            # RandomForest training on labelled CSV
      predict.py            # raster inference -> prospectivity GeoTIFF + GeoJSON zones
      production.py           # linear-fit production vs demand forecast
    satellite/
      preprocess.py            # raster inspection + spectral index helpers
  tools/
    generate_demo.py             # synthetic demo data generator
  tests/
    test_api.py                    # pytest smoke tests (auth + access control)
  data/ models/ outputs/             # runtime data, trained model, generated outputs
  requirements.txt
  Dockerfile
  .env.example
```

## Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # then edit .env and set a real SECRET_KEY
python tools/generate_demo.py  # generates synthetic training/production/raster data
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000
Swagger docs: http://127.0.0.1:8000/docs

## Auth flow
1. **Register** — `POST /auth/register`
   ```json
   { "email": "you@example.com", "password": "at-least-8-chars", "full_name": "Optional Name" }
   ```
2. **Login** — `POST /auth/login` as `application/x-www-form-urlencoded` with fields `username` (= your email) and `password`. Returns:
   ```json
   { "access_token": "...", "token_type": "bearer" }
   ```
3. **Call protected endpoints** with header `Authorization: Bearer <access_token>`.
4. Swagger UI's "Authorize" button handles step 3 for you automatically once you've logged in through it.

Public/unauthenticated: `/`, `/health`, `/demo`, `/metrics`, `/zones`, `/raster-info`.
Require login: `/train`, `/predict`, `/production`, and everything under `/history/*`.

## Endpoints
| Method | Path | Auth? | Purpose |
|---|---|---|---|
| GET | `/` | no | service info |
| GET | `/health` | no | liveness + whether a model is trained |
| POST | `/auth/register` | no | create account |
| POST | `/auth/login` | no | get JWT access token |
| GET | `/auth/me` | yes | current user info |
| POST | `/train` | yes | upload training CSV, trains RandomForest, logs run |
| GET | `/metrics` | no | last training run's metrics |
| POST | `/predict` | yes | upload 9-band GeoTIFF, returns prospectivity stats + GeoJSON path, logs run |
| GET | `/zones` | no | last prediction's GeoJSON zones |
| POST | `/production` | yes | upload production/demand CSV, forecasts shortfall, logs run |
| GET | `/history/trainings` | yes | your past training runs |
| GET | `/history/predictions` | yes | your past prediction runs |
| GET | `/history/production` | yes | your past production forecasts |
| GET | `/demo` | no | runs the full pipeline once on synthetic demo data |
| GET | `/raster-info` | no | inspects the demo raster's bands/CRS/bounds |

## Data formats
Training CSV columns:
```
red_edge_1,red_edge_2,nir,swir1,swir2,ndvi,ndmi,elevation,slope,label
```
Prediction GeoTIFF: exactly 9 bands, aligned, in that same order (no `label` band).

Production CSV columns:
```
year,production,demand
```

The demo generator (`tools/generate_demo.py`) makes synthetic versions of all three so
you can exercise the whole pipeline (`GET /demo`) without needing real data. For an
actual SIH submission, replace it with real Sentinel-2 bands, DEM-derived elevation/slope,
known occurrence labels, and authoritative production/demand statistics.

**The model predicts prospectivity, not a confirmed manganese reserve** — field and
geological validation is still required before any resource claim.

## Docker
```bash
docker build -t manganai-backend .
docker run -p 8000:8000 --env-file .env manganai-backend
```

## Tests
```bash
pip install -r requirements.txt   # includes pytest
pytest -v
```
Covers registration, login, `/auth/me`, and that protected routes reject unauthenticated
requests. Does not exercise `/train` / `/predict` / `/production` themselves, since those
need real or demo data files already on disk.

## Notes on what was fixed/added versus the original prototype
- **Bug fix**: `app/ml/predict.py` was reading only band 9 of the input raster
  (`src.read(len(FEATURES))` = `src.read(9)`) instead of all 9 feature bands
  (`src.read()`), which broke inference. Fixed.
- **Added**: JWT auth (register/login/me), SQLite-backed per-user history for every
  training/prediction/production run, `.env`-driven config, Docker support, and a
  pytest smoke-test suite.

## Production-readiness: what changed for real multi-user traffic
The original single-user prototype stored every upload/model/result at one fixed
path (`data/training.csv`, `models/manganese_rf.joblib`, ...), so two users hitting
the API at the same time would silently overwrite each other's files. That's fixed,
along with several other things a live website needs:

| Concern | What's in place |
|---|---|
| **Per-user data isolation** | Every user gets their own `data/<user_id>/`, `models/<user_id>/`, `outputs/<user_id>/` folder (see `app.config.user_paths()`). Concurrent users never touch each other's files. `/train`, `/predict`, `/metrics`, `/zones` all operate on the *current logged-in user's* data/model, not a shared global one. |
| **Public demo stays separate** | `/demo` and `/raster-info` use a fixed `DEMO_KEY` sandbox, isolated from real users. |
| **Secret key safety** | App refuses to start if `ENVIRONMENT=production` and `SECRET_KEY` is still the placeholder default. |
| **CORS** | Configurable via `CORS_ORIGINS` env var — add your real frontend domain(s) before deploying. |
| **Rate limiting** | `/auth/login` and `/auth/register` are rate-limited per IP (`slowapi`), configurable via `LOGIN_RATE_LIMIT` / `REGISTER_RATE_LIMIT`. |
| **Upload size limits** | Uploads are streamed and capped at `MAX_UPLOAD_MB` (default 200 MB) instead of being read unbounded into memory/disk. |
| **Structured logging + error handling** | Every request is logged with a request ID, method, path, status, and duration. Unhandled exceptions return a generic 500 (no stack trace leaked to the client) and are logged server-side. |
| **Production ASGI server** | `Dockerfile` runs `gunicorn` with `uvicorn.workers.UvicornWorker` (see `gunicorn_conf.py`) instead of `uvicorn --reload`. |
| **Database** | Works with SQLite out of the box; switch to PostgreSQL for real concurrent traffic by setting `DATABASE_URL=postgresql://...` and uncommenting `psycopg2-binary` in `requirements.txt` — no code changes needed, SQLAlchemy handles both. |
| **Schema migrations** | Alembic is scaffolded (`migrations/`). In production, run `alembic upgrade head` to manage schema changes instead of relying on auto-`create_all()` (which only runs when `ENVIRONMENT != production`). |
| **Health check** | `/health` now also checks DB connectivity — point your uptime monitor / load balancer health check at it. |

### Before you actually deploy, still do this
1. `python -c "import secrets; print(secrets.token_hex(32))"` → put the result in `SECRET_KEY`.
2. Set `ENVIRONMENT=production` and `CORS_ORIGINS` to your real domain(s).
3. Point `DATABASE_URL` at a managed PostgreSQL instance (SQLite is fine for small demos but not for real concurrent write traffic).
4. Run `alembic revision --autogenerate -m "initial"` once, then `alembic upgrade head`, on your production database.
5. Put the app behind HTTPS (a reverse proxy like Nginx/Caddy, or your hosting provider's load balancer — this app does not terminate TLS itself).
6. Decide on a backup strategy for the database and for `data/` / `models/` / `outputs/` if you need to retain user uploads and trained models long-term.
7. Consider adding: email verification on signup, password-reset flow, and centralized log/metric aggregation (e.g. Sentry, CloudWatch) — none of which are in scope for this pass but are natural next steps for a public-facing product.
