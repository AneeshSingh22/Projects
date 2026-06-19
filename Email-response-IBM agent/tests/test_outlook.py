import os
import msal
import requests

# Read from environment to avoid committing secrets in tests
CLIENT_ID = os.environ.get("MS_CLIENT_ID", "")
TENANT_ID = os.environ.get("MS_TENANT_ID", "consumers")

if not CLIENT_ID:
    print("Skipping Outlook test: set MS_CLIENT_ID in environment")
    raise SystemExit(0)

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = ["Mail.Read"]

app = msal.PublicClientApplication(
    client_id=CLIENT_ID,
    authority=AUTHORITY
)

# Force fresh login
flow = app.initiate_device_flow(scopes=SCOPES)
print(flow.get("message", "Follow device login instructions"))
result = app.acquire_token_by_device_flow(flow)

if "access_token" not in result:
    print("❌ Token error:", result)
else:
    print("✅ Got token")
    token = result["access_token"]

    # Test the Graph API call
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        "https://graph.microsoft.com/v1.0/me",
        headers=headers
    )
    print("Profile status:", response.status_code)
    print("Profile:", response.json())

    # Test mail access
    mail_response = requests.get(
        "https://graph.microsoft.com/v1.0/me/messages?$top=1",
        headers=headers
    )
    print("\nMail status:", mail_response.status_code)
    print("Mail response:", mail_response.json())