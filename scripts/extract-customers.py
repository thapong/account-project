"""Read the supplied customer workbook into a private, traceable import payload."""
import hashlib
import json
from pathlib import Path
import openpyxl

source = Path("data-template/Customer.xlsx")
sheet = openpyxl.load_workbook(source, read_only=True, data_only=True)["Customer"]
rows = list(sheet.values)
headers = rows[0]
payload = {
    "filename": source.name,
    "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "sheet": sheet.title,
    "rows": [
        {"row": index, "values": dict(zip(headers, values))}
        for index, values in enumerate(rows[1:], start=2) if values[0]
    ],
}
target = Path(".local/customer-import.json")
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(payload, ensure_ascii=False, default=str), encoding="utf-8")
print(f"Prepared {len(payload['rows'])} customer rows. Source workbook unchanged.")
