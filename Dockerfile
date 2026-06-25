FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create database directory
RUN mkdir -p database

# Ensure Python output is not buffered (required for SSE streaming)
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 5000

# Run with single worker + threads so SSE clients share the same process memory
CMD ["gunicorn", "-w", "1", "--threads", "8", "--timeout", "300", "-b", "0.0.0.0:5000", "app:app"]
