from mail.outlook_client import get_unread_emails, mark_as_read, flag_email, draft_reply
from agent.classifier import classify_email
from config import MAX_EMAILS


def decide_and_act(classification: dict):
    """
    Reads classification result and executes real actions via Graph API.
    """
    action = classification.get("suggested_action", "ignore")
    email_id = classification.get("email_id")

    print(f"\n📧 '{classification.get('subject')}' from {classification.get('sender')}")
    print(f"   Category  : {classification.get('category')}")
    print(f"   Urgency   : {classification.get('urgency')}")
    print(f"   Intent    : {classification.get('intent')}")
    print(f"   Action    : {action}")

    # ---- Execute real actions ----

    if action == "flag":
        flag_email(email_id)

    elif action == "draft_reply":
        reply_text = classification.get("draft_reply", "Thank you for your email. I will get back to you shortly.")
        draft_reply(email_id, reply_text)

    elif action == "schedule_meeting":
        draft_reply(
            email_id,
            "Thanks for reaching out! I'd be happy to meet. Could you confirm the time and date that works best for you?"
        )
        print("   📅 [AGENT] Calendar integration coming in Phase 3")

    elif action == "archive":
        mark_as_read(email_id)
        print("   📦 Marked as read (archive logic coming in Phase 3)")

    elif action == "ignore":
        print("   ✋ No action taken")


def run():
    print("🚀 Outlook Email Agent Starting...\n")
    print(f"📬 Fetching up to {MAX_EMAILS} unread emails from Outlook...\n")

    emails = get_unread_emails(max_results=MAX_EMAILS)

    if not emails:
        print("✅ No unread emails. Inbox clear.")
        return

    print(f"Found {len(emails)} unread email(s). Classifying...\n")
    print("=" * 55)

    for email in emails:
        try:
            result = classify_email(email)
            decide_and_act(result)
        except Exception as e:
            print(f"⚠️  Error on '{email.get('subject')}': {e}")

    print("\n" + "=" * 55)
    print("✅ Agent run complete.")


if __name__ == "__main__":
    run()