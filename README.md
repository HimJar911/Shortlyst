# Shortlyst � Setup After Pulling

## Step 1 � Install Python 3.12
Download and run: https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe
During install: check "Add python.exe to PATH" then click Install Now

## Step 2 � Backend setup
```powershell
cd shortlyst/backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install chromium
```

## Step 3 � Frontend setup
```powershell
cd shortlyst/frontend
npm install
```

## Step 4 � Install Redis
```powershell
scoop install redis
```

## Step 5 � Set up .env
```powershell
cd shortlyst/backend
Copy-Item .env.example .env
# Open .env and fill in the API keys Himanshu sends you
```

## Step 6 � Verify everything
```powershell
# Backend
cd shortlyst/backend
.\venv\Scripts\Activate.ps1
python -c "import fastapi, anthropic, playwright, pdfplumber, redis, celery; print('OK')"

# Frontend
cd shortlyst/frontend
npm run dev

# Redis
redis-server

```
SQL
