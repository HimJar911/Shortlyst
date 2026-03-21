# Setup After Pulling

## Prerequisites
Install these first if you dont have them:
- Python 3.12: https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe
  - During install: check Add to PATH, click Install Now
- Node.js LTS: https://nodejs.org/en/download
- Scoop (for Redis): run this in PowerShell:
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

## Backend
cd backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install chromium
Copy-Item .env.example .env
# Open .env and fill in the API keys Himanshu sends you

## Frontend
cd frontend
npm install

## Redis
scoop install redis
C:\Users\himan\AppData\Local\Programs\Microsoft VS Code;C:\Program Files (x86)\Common Files\Oracle\Java\java8path;C:\Program Files (x86)\Common Files\Oracle\Java\javapath;C:\WINDOWS\system32;C:\WINDOWS;C:\WINDOWS\System32\Wbem;C:\WINDOWS\System32\WindowsPowerShell\v1.0\;C:\WINDOWS\System32\OpenSSH\;C:\Program Files\Microsoft SQL Server\150\Tools\Binn\;C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\;C:\Program Files\dotnet\;C:\Program Files\nodejs\;C:\Program Files\Amazon\AWSCLIV2\;C:\Program Files\Docker\Docker\resources\bin;C:\Program Files\Git\cmd;C:\Program Files\MATLAB\R2025b\bin;C:\Users\himan\AppData\Local\Programs\Python\Python312\Scripts\;C:\Users\himan\AppData\Local\Programs\Python\Python312\;C:\Users\himan\AppData\Local\Programs\Python\Python314\Scripts\;C:\Users\himan\AppData\Local\Programs\Python\Python314\;C:\Users\himan\AppData\Local\Programs\Python\Launcher\;C:\Users\himan\AppData\Local\Microsoft\WindowsApps;C:\Users\himan\.dotnet\tools;C:\Users\himan\AppData\Local\Programs\Microsoft VS Code\bin;C:\Users\himan\AppData\Roaming\npm;c:\Users\himan\.vscode\extensions\ms-python.debugpy-2025.18.0-win32-x64\bundled\scripts\noConfigScripts;C:\Users\himan\scoop\shims += ";C:\Users\himan\scoop\shims"

## Verify Everything Works
# Backend
cd backend
.\venv\Scripts\Activate.ps1
python -c "import fastapi, anthropic, playwright, pdfplumber, redis, celery; print('Backend OK')"

# Playwright
python -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('https://example.com')
    print('Playwright OK title:', page.title())
    browser.close()
"

# Frontend
cd frontend
npm run dev
# Should see localhost:3000

# Redis (open a separate terminal)
redis-server
# In another terminal:
redis-cli ping
# Should return PONG

## Running the App
# Terminal 1 - Redis
redis-server

# Terminal 2 - Backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 3 - Frontend
cd frontend
npm run dev
