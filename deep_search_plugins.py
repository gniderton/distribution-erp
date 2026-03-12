import json

retool_file = r'c:\Users\user\Downloads\Backened\Inventory New.json'

with open(retool_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

app_state_str = data['page']['data']['appState']
# app_state_str is a JSON string of a list
app_state = json.loads(app_state_str)

def recursive_search(obj, target_key):
    if isinstance(obj, dict):
        if target_key in obj:
            return obj[target_key]
        for v in obj.values():
            res = recursive_search(v, target_key)
            if res: return res
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if item == target_key and i + 1 < len(obj):
                return obj[i+1]
            res = recursive_search(item, target_key)
            if res: return res
    return None

plugins = recursive_search(app_state, 'plugins')
if plugins:
    print(f"Plugins found! Type: {type(plugins)}")
    # If it's the Transit list ['~#iOM', [...]]
    if isinstance(plugins, list) and len(plugins) > 1:
        # Sometimes the first element is the type tag, second is the data
        # Let's check if it's the list of entries or another level
        content = plugins[1]
        print(f"Plugins content type: {type(content)}")
        
        # In the snippet I saw, it was ["Inventory_Management", ["^0", [...]]]
        # So it might be nested quite deep.
        
        # Let's just print a recursive list of all keys found at any level inside plugins
        def get_all_ids(obj):
            ids = []
            if isinstance(obj, list):
                if len(obj) == 2 and isinstance(obj[1], list) and any(x == 'pluginTemplate' for x in obj[1]):
                    # This looks like [id, {data}]
                    ids.append(obj[0])
                for x in obj:
                    ids.extend(get_all_ids(x))
            elif isinstance(obj, dict):
                for v in obj.values():
                    ids.extend(get_all_ids(v))
            return ids

        all_ids = get_all_ids(plugins)
        print("Found component IDs:", sorted(list(set(all_ids))))
else:
    print("Plugins still not found.")
    # Show the structure of the first few items
    print("Top levels:", [str(x)[:100] for x in app_state])
