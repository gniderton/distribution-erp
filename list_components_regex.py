import json
import re

retool_file = r'c:\Users\user\Downloads\Backened\Inventory New.json'

with open(retool_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Try to find all "id":"NAME" patterns
ids = re.findall(r'"id":"([^"]+)"', content)
# Try to find all "subtype":"TYPE" patterns
subtypes = re.findall(r'"subtype":"([^"]+)"', content)

# Unique IDs
unique_ids = sorted(list(set(ids)))

# Filter out common non-component IDs if any, though most will be components
# We also want to know which IDs have which subtypes
# Let's search for blocks that contain both

matches = re.finditer(r'"id":"(?P<id>[^"]+)".*?"subtype":"(?P<subtype>[^"]+)"', content)
results = []
for m in matches:
    results.append(m.groupdict())

# Print summary
print(f"Total Unique IDs found: {len(unique_ids)}")
print(f"Component matches found: {len(results)}")
print(json.dumps(results[:50], indent=2)) # Print first 50
