import json

retool_file = r'c:\Users\user\Downloads\Backened\Inventory New.json'

with open(retool_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Keys at root:", list(data.keys()))
if 'page' in data:
    print("Keys in 'page':", list(data['page'].keys()))
    if 'data' in data['page']:
        print("Keys in 'page.data':", list(data['page']['data'].keys()))
