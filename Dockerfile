# Production-ready Dockerfile for StockSense
FROM python:3.10-slim-buster

# Prevent Python from writing .pyc files and enable unbuffered output logging
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# System dependencies for compiled extensions (like xgboost/scikit-learn)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirement details
COPY requirements.txt /app/

# Install pip dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code files
COPY . /app/

# Create folders for uploads, barcodes and models with permissions
RUN mkdir -p /app/static/uploads /app/static/codes /app/static/models && \
    chmod -R 755 /app/static

# Expose production port
EXPOSE 5000

# Run using Gunicorn using local configuration
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:app"]
