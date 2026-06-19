import requests
from auth.ms_auth import get_access_token

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


def get_unread_emails(max_results=5) -> list:
    """
    Fetches unread emails from Outlook inbox via Microsoft Graph API.
    Returns list of dicts: { id, subject, sender, body }
    """
    token = get_access_token()

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Query unread emails, newest first
    url = (
        f"{GRAPH_BASE}/me/mailFolders/inbox/messages"
        f"?$filter=isRead eq false"
        f"&$top={max_results}"
        f"&$orderby=receivedDateTime desc"
        f"&$select=id,subject,from,bodyPreview,body,receivedDateTime"
    )

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise Exception(
            f"Failed to fetch emails: {response.status_code} — {response.text}"
        )

    messages = response.json().get("value", [])

    if not messages:
        return []

    emails = []

    for msg in messages:
        sender = msg.get("from", {}).get("emailAddress", {})
        sender_str = f"{sender.get('name', '')} <{sender.get('address', '')}>"

        # Use bodyPreview (plain text snippet) — cleaner for the model
        body = msg.get("bodyPreview", "")

        emails.append({
            "id": msg["id"],
            "subject": msg.get("subject", "No Subject"),
            "sender": sender_str,
            "body": body[:500]  # cap at 500 chars for the model
        })

    return emails


def mark_as_read(email_id: str):
    """
    Marks an email as read.
    """
    token = get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    url = f"{GRAPH_BASE}/me/messages/{email_id}"
    response = requests.patch(url, headers=headers, json={"isRead": True})

    if response.status_code == 200:
        print(f"   ✅ Marked as read")
    else:
        print(f"   ⚠️  Could not mark as read: {response.status_code}")


def flag_email(email_id: str):
    """
    Flags an email (sets followUp flag).
    """
    token = get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    url = f"{GRAPH_BASE}/me/messages/{email_id}"
    body = {
        "flag": {
            "flagStatus": "flagged"
        }
    }

    response = requests.patch(url, headers=headers, json=body)

    if response.status_code == 200:
        print(f"   🚩 Email flagged")
    else:
        print(f"   ⚠️  Could not flag email: {response.status_code}")


def draft_reply(email_id: str, reply_body: str):
    """
    Creates a draft reply to an email.
    Does NOT send — just saves as draft.
    """
    token = get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create reply draft
    url = f"{GRAPH_BASE}/me/messages/{email_id}/createReply"
    response = requests.post(url, headers=headers)

    if response.status_code != 201:
        print(f"   ⚠️  Could not create reply draft: {response.status_code}")
        return

    draft = response.json()
    draft_id = draft["id"]

    # Update the draft with our reply body
    update_url = f"{GRAPH_BASE}/me/messages/{draft_id}"
    update_body = {
        "body": {
            "contentType": "Text",
            "content": reply_body
        }
    }

    update_response = requests.patch(update_url, headers=headers, json=update_body)

    if update_response.status_code == 200:
        print(f"   ✉️  Reply draft saved to Drafts folder")
    else:
        print(f"   ⚠️  Could not update draft: {update_response.status_code}")