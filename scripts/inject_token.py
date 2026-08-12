import base64
import os
import sys

path = "site/assets/javascripts/posting.js"
placeholder = '"{{POST_TOKEN}}"'
token = os.environ.get("POST_TOKEN", "")

with open(path, encoding="utf-8") as f:
    content = f.read()

if placeholder not in content:
    sys.exit("Placeholder not found in " + path)

encoded = base64.b64encode(token.encode()).decode()
content = content.replace(placeholder, '"' + encoded + '"')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Token injected")
