import json
import os
import msal

from config import MS_CLIENT_ID, MS_TENANT_ID, MS_SCOPES, MS_TOKEN_FILE

AUTHORITY = f"https://login.microsoftonline.com/{MS_TENANT_ID}"


def build_msal_app(cache=None):
    return msal.PublicClientApplication(
        client_id=MS_CLIENT_ID,
        authority=AUTHORITY,
        token_cache=cache
    )


def load_cache():
    cache = msal.SerializableTokenCache()
    if os.path.exists(MS_TOKEN_FILE):
        cache.deserialize(open(MS_TOKEN_FILE, "r").read())
    return cache


def save_cache(cache):
    if cache.has_state_changed:
        with open(MS_TOKEN_FILE, "w") as f:
            f.write(cache.serialize())


def get_access_token() -> str:
    cache = load_cache()
    app = build_msal_app(cache=cache)

    accounts = app.get_accounts()

    result = None

    # Try silent first if account exists
    if accounts:
        result = app.acquire_token_silent(MS_SCOPES, account=accounts[0])

    # If silent failed or no account, do device flow login
    if not result or "access_token" not in result:
        print("\n🔐 Microsoft Login Required")
        print("─" * 40)

        flow = app.initiate_device_flow(scopes=MS_SCOPES)

        if "user_code" not in flow:
            raise Exception(f"Device flow failed: {flow.get('error_description')}")

        print(flow["message"])
        print("─" * 40)
        print("After logging in, come back here — this will continue automatically.\n")

        result = app.acquire_token_by_device_flow(flow)

    if "access_token" not in result:
        error = result.get("error_description", result.get("error", "Unknown error"))
        raise Exception(f"Login failed: {error}")

    save_cache(cache)

    print("✅ Login successful!\n")
    return result["access_token"]