import json

with open('cheque_page.json', 'r') as f:
    data = json.load(f)

widgets = []

def extract_widgets(node):
    if isinstance(node, dict):
        if 'widgetName' in node and 'type' in node:
            widgets.append({
                'name': node.get('widgetName'),
                'type': node.get('type'),
                'text': node.get('text', ''),
                'label': node.get('label', '')
            })
        for key, value in node.items():
            extract_widgets(value)
    elif isinstance(node, list):
        for item in node:
            extract_widgets(item)

extract_widgets(data)

with open('cheque_widgets.txt', 'w') as f:
    for w in widgets:
        f.write(f"{w['name']} ({w['type']}) - text/label: {w['text']}{w['label']}\n")
