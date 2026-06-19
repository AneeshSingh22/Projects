import os

# -------------------------
# WATSONX CONFIG (load from environment)
# -------------------------
# Set these in your environment or in a local `.env` loaded by your shell.
WATSONX_API_KEY = os.environ.get("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.environ.get("WATSONX_PROJECT_ID", "")
WATSONX_URL = os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
WATSONX_MODEL_ID = os.environ.get("WATSONX_MODEL_ID", "mistralai/mistral-small-3-1-24b-instruct-2503")


# -------------------------
# MICROSOFT / OUTLOOK CONFIG (load from environment)
# -------------------------
# Client ID and tenant should be set as environment variables.
MS_CLIENT_ID = os.environ.get("MS_CLIENT_ID", "")
MS_TENANT_ID = os.environ.get("MS_TENANT_ID", "consumers")
# Local token cache file (ignored by default)
MS_TOKEN_FILE = os.environ.get("MS_TOKEN_FILE", "ms_token.json")

MS_SCOPES = [
    "Mail.Read",
    "Mail.ReadWrite"
]


# -------------------------
# GENERAL
# -------------------------
MAX_EMAILS = int(os.environ.get("MAX_EMAILS", "5"))