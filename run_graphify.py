import json
import sys
from pathlib import Path
from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

def run():
    target_dir = Path("src")
    print(f"Step 1: Detecting files in {target_dir}...")
    detect_res = detect(target_dir)
    Path('.graphify_detect.json').write_text(json.dumps(detect_res), encoding='utf-8')
    
    print(f"Detected {detect_res.get('total_files', 0)} files")
    
    code_files = []
    for f in detect_res.get('files', {}).get('code', []):
        if Path(f).is_dir():
            code_files.extend(collect_files(Path(f)))
        else:
            code_files.append(Path(f))
            
    print(f"Step 2: Extracting AST for {len(code_files)} code files...")
    if code_files:
        extract_res = extract(code_files)
        Path('.graphify_extract.json').write_text(json.dumps(extract_res, indent=2), encoding='utf-8')
        print(f"AST extracted: {len(extract_res['nodes'])} nodes, {len(extract_res['edges'])} edges")
    else:
        print("No code files found.")
        sys.exit(1)
        
    print("Step 3: Building graph and clustering...")
    G = build_from_json(extract_res)
    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    
    try:
        surprises = surprising_connections(G, communities)
    except Exception as e:
        print(f"Warning: Surprising connections failed: {e}")
        surprises = []
        
    labels = {cid: f"Community {cid}" for cid in communities}
    
    print("Step 4: Generating report and exports...")
    Path('../graphify-out').mkdir(exist_ok=True)
    report = generate(G, communities, cohesion, labels, gods, surprises, detect_res, {'input': 0, 'output': 0}, str(target_dir))
    Path('../graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
    to_json(G, communities, '../graphify-out/graph.json')
    
    analysis = {
        'communities': {str(k): v for k, v in communities.items()},
        'cohesion': {str(k): v for k, v in cohesion.items()},
        'gods': gods,
        'surprises': surprises,
    }
    Path('.graphify_analysis.json').write_text(json.dumps(analysis, indent=2), encoding='utf-8')
    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")
    print("Report written to ../graphify-out/GRAPH_REPORT.md")

if __name__ == '__main__':
    run()
