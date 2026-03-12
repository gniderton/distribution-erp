import json

retool_file = r'c:\Users\user\Downloads\Backened\Inventory New.json'

with open(retool_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

plugins = data.get('page', {}).get('data', {}).get('plugins', {})

components = []
for pid, pdata in plugins.items():
    p_type = pdata.get('type')
    subtype = pdata.get('subtype')
    template = pdata.get('template', {})
    
    # Try to find labels or values to identify what it is
    label = ""
    if isinstance(template, list):
        # Handle the case where template is a list of [key, value] pairs (Retool format)
        for item in template:
            if isinstance(item, list) and len(item) > 1:
                if item[0] == 'label':
                    label = item[1]
    elif isinstance(template, dict):
        label = template.get('label', '')

    components.append({
        'id': pid,
        'type': p_type,
        'subtype': subtype,
        'label': label
    })

print(json.dumps(components, indent=2))
