import os
import json
import re
from ibm_watsonx_ai.foundation_models import ModelInference

# -------------------------
# CONFIG (from environment)
# -------------------------
API_KEY = os.environ.get("WATSONX_API_KEY", "")
PROJECT_ID = os.environ.get("WATSONX_PROJECT_ID", "")
URL = os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

if not API_KEY or not PROJECT_ID:
    print("Skipping Watson test: set WATSONX_API_KEY and WATSONX_PROJECT_ID in environment")
    raise SystemExit(0)

# -------------------------
# INIT MODEL
# -------------------------
model = ModelInference(
    model_id=os.environ.get("WATSONX_MODEL_ID", "mistralai/mistral-small-3-1-24b-instruct-2503"),
    params={
        "max_new_tokens": 200,
        "temperature": 0.2  # lower temp = more structured output
    },
    credentials={
        "url": URL,
        "apikey": API_KEY
    },
    project_id=PROJECT_ID
)

# -------------------------
# PROMPT (STRICT JSON)
# -------------------------
prompt = """
You are an email classification system.

You MUST return ONLY valid JSON.
No explanations. No markdown. No extra text.

Return format:
{
  "category": "work | personal | spam | meeting",
  "urgency": "low | medium | high",
  "intent": "string"
}

Email:
"Can we meet tomorrow at 3pm?"

Return JSON only.
"""

# -------------------------
# CALL MODEL
# -------------------------
response_text = model.generate_text(prompt=prompt)

print("RAW OUTPUT:")
print(response_text)
print("\n------------------")

# -------------------------
# CLEAN + PARSE OUTPUT
# -------------------------

def extract_json(text):
    """
    Handles cases where model returns extra text
    """
    try:
        return json.loads(text)
    except:
        # extract JSON block if wrapped in extra text
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        else:
            raise ValueError("No valid JSON found in response")

# convert to python dict
data = extract_json(response_text)

# -------------------------
# FINAL OUTPUT
# -------------------------
print("PARSED DICT:")
print(data)

print("\nFIELDS:")
print("Category:", data.get("category"))
print("Urgency:", data.get("urgency"))
print("Intent:", data.get("intent"))