FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 OMP_NUM_THREADS=2 PORT=7860
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.3.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt
COPY server.py .
RUN python -c 'from server import download_model; download_model()'
ENV HF_HUB_OFFLINE=1
EXPOSE 7860
CMD ["sh", "-c", "exec uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
