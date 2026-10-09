with open('static/app.js', 'r', encoding='utf-8') as f:
    lines = []
    for idx, line in enumerate(f, 1):
        if 'new Chart' in line or 'borderColor' in line or 'backgroundColor' in line:
            lines.append(f"{idx}: {line.strip()}")

with open('scan_results.txt', 'w', encoding='utf-8') as f_out:
    f_out.write('\n'.join(lines))
print("Done, scanned lines:", len(lines))
