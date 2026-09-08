import json
from pathlib import Path
from graphify.build import build_from_json
from graphify.export import to_html

extract_res = json.loads(Path('.graphify_extract.json').read_text(encoding='utf-8'))
G = build_from_json(extract_res)

analysis = json.loads(Path('.graphify_analysis.json').read_text(encoding='utf-8'))
communities = {int(k): v for k, v in analysis['communities'].items()}
labels = {k: f"Community {k}" for k in communities.keys()}

to_html(G, communities, '../graphify-out/graph.html', community_labels=labels)
print("graph.html generated")
