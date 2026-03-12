import json

retool_file = r'c:\Users\user\Downloads\Backened\Inventory New.json'

with open(retool_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

app_state_str = data['page']['data']['appState']
app_state = json.loads(app_state_str)

# app_state is a list like ['~#iR', [...]]
# The second item is likely the actual data
actual_data = app_state[1]

# In Transit format, it's often a list of [key, value, key, value...] if it starts with '^ '
# Or it's a list with special markers.

def find_plugins(obj):
    if isinstance(obj, dict):
        if 'plugins' in obj:
            return obj['plugins']
        for k, v in obj.items():
            res = find_plugins(v)
            if res: return res
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if item == 'plugins':
                return obj[i+1]
            res = find_plugins(item)
            if res: return res
    return None

plugins = find_plugins(actual_data)

if plugins:
    # plugins is likely a list/map in Transit format.
    # We want to find the IDs.
    print(f"Plugins type: {type(plugins)}")
    # If it's a list starting with '~#iOM', the items follow.
    if isinstance(plugins, list) and len(plugins) > 1:
        # Sometimes it's ['~#iOM', [ [id, {data}], [id, {data}] ]]
        items = plugins[1]
        print(f"Found {len(items)} plugin entries.")
        summary = []
        for item in items:
            if isinstance(item, list) and len(item) == 2:
                pid = item[0]
                pdata = item[1]
                # pdata is another Transit list
                # Try to find 'subtype'
                subtype = "unknown"
                if isinstance(pdata, list):
                    for i, val in enumerate(pdata):
                        if val == '^:': # This seems to be the key for subtype/type in this encoding
                             subtype = pdata[i+1]
                        if val == 'subtype':
                             subtype = pdata[i+1]
                summary.append({'id': pid, 'subtype': subtype})
        print(json.dumps(summary, indent=2))
else:
    print("Plugins not found in appState.")
    # Debug print some of app_state
    print("AppState structure snippet:", str(actual_data)[:500])
