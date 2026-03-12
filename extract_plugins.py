import json

retool_file = r'c:\Users\user\Downloads\Backened\Inventory New.json'

with open(retool_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

page_data = data.get('page', {}).get('data', {})
print("Keys in page.data:", list(page_data.keys()))

if 'plugins' in page_data:
    plugins = page_data['plugins']
    print(f"Plugins type: {type(plugins)}")
    # Handle Transit-style list
    if isinstance(plugins, list) and len(plugins) > 1:
        items = plugins[1]
        print(f"Total plugin entries: {len(items)}")
        
        # Dictionary to store clean components
        cleaned_plugins = {}
        
        # Items is a list of [id, data]
        for item in items:
            if isinstance(item, list) and len(item) == 2:
                pid = item[0]
                p_raw = item[1]
                
                # p_raw is like ["^0", ["^ ", "n", "pluginTemplate", "v", [...]]]
                # We need to find "subtype" or "^:" inside "v"
                subtype = "unknown"
                if isinstance(p_raw, list) and len(p_raw) > 1:
                    v_block = p_raw[1] # This is common
                    if isinstance(v_block, list):
                        # Find "pluginTemplate" and then its "v"
                        v_idx = -1
                        for i, x in enumerate(v_block):
                            if x == "v": v_idx = i+1
                        
                        if v_idx != -1 and v_idx < len(v_block):
                            v_data = v_block[v_idx]
                            if isinstance(v_data, list):
                                for i, x in enumerate(v_data):
                                    if x == "^:": subtype = v_data[i+1]
                                    if x == "subtype": subtype = v_data[i+1]
                
                cleaned_plugins[pid] = subtype
        
        print(json.dumps(cleaned_plugins, indent=2))

