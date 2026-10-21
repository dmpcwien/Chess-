FROM python:3.12-slim
WORKDIR /srv
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt ./online/requirements.txt
RUN pip install --no-cache-dir -r online/requirements.txt 'pytest>=8,<10' 'httpx>=0.27,<1'
COPY . ./online/
# Gate Render deployments on the same variant, rating and WebSocket tests used in CI.
RUN python -m compileall -q online && python -m pytest -q online/tests
RUN useradd -r -u 10001 chessapp
USER chessapp
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn online.server:app --host 0.0.0.0 --port ${PORT:-8000}"]
