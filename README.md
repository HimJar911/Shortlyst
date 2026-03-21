After pulling

Step 1 — Install Python 3.12
Same installer you used: python-3.12.10-amd64.exe
Step 2 — Backend setup:
powershellcd shortlyst/backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install chromium
Step 3 — Frontend setup:
powershellcd shortlyst/frontend
npm install
Step 4 — Install Redis:
powershellscoop install redis
Step 5 — Set up .env:
powershellcd shortlyst/backend
Copy-Item .env.example .env
# Then open .env and fill in the actual API keys
Step 6 — Verify everything:
powershell# Backend
cd shortlyst/backend
.\venv\Scripts\Activate.ps1
python -c "import fastapi, anthropic, playwright, pdfplumber, redis, celery; print('OK')"

# Frontend
cd shortlyst/frontend
npm run dev

# Redis
redis-server
