# IBM-Agent-Project

Project that integrates IBM WatsonX and Microsoft Outlook.

## Preparing for GitHub (hiding secrets)

- This repository previously contained sensitive tokens and API keys.
- I updated the project so secrets are loaded from environment variables and added examples.

What I changed:
- `config.py`: now reads configuration from environment variables (no hard-coded API keys).
- `.gitignore`: ignores `ms_token.json`, `.env`, virtualenvs and common temp files.
- `ms_token.json`: redacted placeholder (create locally).
- `.env.example`: sample file showing required env variables.

Setup (recommended):

1. Copy `.env.example` to `.env` and fill values. DO NOT commit `.env`.

   In PowerShell:

```powershell
copy .env.example .env
# Edit .env with your secret values (use a text editor)
```

2. Alternatively, set environment variables directly (PowerShell example):

```powershell
$env:WATSONX_API_KEY = 'your_watsonx_api_key'
$env:WATSONX_PROJECT_ID = 'your_project_id'
$env:MS_CLIENT_ID = 'your_ms_client_id'
# ...and so on
```

3. For Microsoft device-token caching, create `ms_token.json` locally by performing the login flow (this file is ignored by `.gitignore`).

Cleaning secrets from Git history (optional, advanced):

- If you already pushed secrets to a remote, remove them from history using the BFG Repo-Cleaner or `git filter-repo`. Example (careful, this rewrites history):

```powershell
# Remove file from index and commit
git rm --cached ms_token.json
git commit -m "Remove ms_token.json from repository"
git push origin main

# Use BFG or git filter-repo to purge from history (see tool docs)
```

If you want, I can:
- run tests, update any modules still importing raw secrets, or add a small script to help generate a local `ms_token.json`.
