import re

retool_file = r'c:\Users\user\Downloads\Backened\Inventory New.json'

with open(retool_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Try finding escaped "id":"name"
escaped_ids = re.findall(r'\\"id\\":\\"(?P<id>[^\\"]+)\\"', content)
# Try finding unescaped "id":"name" (just in case)
unescaped_ids = re.findall(r'"id":"(?P<id>[^"]+)"', content)

all_ids = sorted(list(set(escaped_ids + unescaped_ids)))

# Filter out common properties that might match
ignored = ['n', 'v', 'pluginTemplate', 'id', 'uuid', 'type', 'subtype', 'namespace', 'resourceName', 'container', 'folder', 'presetName']
filtered_ids = [i for i in all_ids if i not in ignored and not i.startswith('~')]

print(f"Total potential component IDs found: {len(filtered_ids)}")
print(json.dumps(filtered_ids, indent=2))
