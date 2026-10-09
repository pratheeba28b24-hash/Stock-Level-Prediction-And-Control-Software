with open('verify_results.log', 'r', encoding='utf-16', errors='ignore') as f_in:
    content = f_in.read()

with open('verify_results_utf8.txt', 'w', encoding='utf-8') as f_out:
    f_out.write(content)

print("Conversion complete.")
