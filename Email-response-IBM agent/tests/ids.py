import os

# Use environment variables for tests. Fill these locally or in CI secrets.
PROJECT_ID = os.environ.get("WATSONX_PROJECT_ID", "")
API_KEY = os.environ.get("WATSONX_API_KEY", "")
ENDPOINT = os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
DISPLAY_NAME = os.environ.get("DISPLAY_NAME", "email-agent")
CLIENT_ID = os.environ.get("MS_CLIENT_ID", "")
OBJECT_ID = os.environ.get("OBJECT_ID", "")
TENANT_ID = os.environ.get("MS_TENANT_ID", "")
