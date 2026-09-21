FROM python:3.11-slim

# rasterio/geopandas need GDAL and friends at the OS level.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin libgdal-dev g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data models outputs

EXPOSE 8000

# Generate demo data once at image build time so /demo works out of the box;
# comment this out if you'd rather supply real data.
RUN python tools/generate_demo.py

ENV ENVIRONMENT=production

# Production: gunicorn managing uvicorn workers (see gunicorn_conf.py).
# For local development, override the command with:
#   docker run ... uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
CMD ["gunicorn", "app.main:app", "-c", "gunicorn_conf.py"]
