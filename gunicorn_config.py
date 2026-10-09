# Gunicorn configuration file for production hosting
import multiprocessing

# Bind to localhost
bind = "0.0.0.0:5000"

# Number of worker processes (Recommended: 2-4 worker cores per system)
workers = multiprocessing.cpu_count() * 2 + 1

# Process threads
threads = 2

# Timeout for workers before being killed
timeout = 120

# Logging parameters
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"

# Process naming
proc_name = "stocksense_gunicorn"
