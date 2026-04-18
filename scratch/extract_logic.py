import json
import os

file_path = r'c:\Users\user\Downloads\Backened\Gniderton_Sales_Application.json'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Retool JSON structure is often deeply nested. 
# It seems to be in page.data.appState which is a stringified transit-json or similar.
# But wait, looking at the previous output, it looks like standard JSON with some transit-like strings inside.

def extract_logic(obj, results):
    if isinstance(obj, dict):
        if 'id' in obj and ('query' in obj or 'funcBody' in obj):
            name = obj.get('id')
            logic = obj.get('query') or obj.get('funcBody')
            results[name] = logic
        for key, value in obj.items():
            extract_logic(value, results)
    elif isinstance(obj, list):
        for item in obj:
            extract_logic(item, results)

results = {}
extract_logic(data, results)

output_path = r'c:\Users\user\Downloads\Backened\extracted_retool_logic.txt'
with open(output_path, 'w', encoding='utf-8') as f:
    for name, logic in results.items():
        f.write(f"--- {name} ---\n{logic}\n\n")

print(f"Extracted {len(results)} logic blocks.")
