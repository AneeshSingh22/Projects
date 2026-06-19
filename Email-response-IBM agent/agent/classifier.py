import json
import re
from ibm_watsonx_ai.foundation_models import ModelInference

from config import WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL, WATSONX_MODEL_ID

# -------------------------
# INIT MODEL
# -------------------------
model = ModelInference(
    model_id=WATSONX_MODEL_ID,
    params={
        "max_new_tokens": 300,
        "temperature": 0.2
    },
    credentials={
        "url": WATSONX_URL,
        "apikey": WATSONX_API_KEY
    },
    project_id=WATSONX_PROJECT_ID
)


def build_prompt(email: dict) -> str:
    return f"""
You are an email classification system.

You MUST return ONLY valid JSON.
No explanations. No markdown. No extra text.

Return format:
{{
  "category": "work | personal | spam | meeting | newsletter",
  "urgency": "low | medium | high",
  "intent": "brief description of what the sender wants",
  "suggested_action": "reply | ignore | flag | schedule_meeting | archive | draft_reply",
  "draft_reply": "short reply if suggested_action is draft_reply, else empty string"
}}

Email:
From: {email.get('sender', 'Unknown')}
Subject: {email.get('subject', 'No Subject')}
Body: {email.get('body', '')}

Return JSON only.
"""


def extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"No valid JSON found:\n{text}")


def classify_email(email: dict) -> dict:
    prompt = build_prompt(email)
    raw_output = model.generate_text(prompt=prompt)
    result = extract_json(raw_output)

    # Attach metadata
    result["email_id"] = email.get("id", "unknown")
    result["subject"] = email.get("subject", "No Subject")
    result["sender"] = email.get("sender", "Unknown")

    return result