import os
import json
import mimetypes
from datetime import datetime
import asyncio
import csv

# Optional: Load metadata from a CSV (like your Google Sheet)
def load_metadata(csv_path):
    meta_map = {}
    if not csv_path or not os.path.exists(csv_path):
        return meta_map
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row.get("fileKey") or row.get("fileName")
            if key:
                meta_map[key] = {
                    "documentName": row.get("documentName", ""),
                    "description": row.get("description", "")
                }
    return meta_map

# Traverse folders and collect file info
def traverse_folder(folder_path, parent_path="", meta_map=None):
    meta_map = meta_map or {}
    folder_name = os.path.basename(folder_path)
    full_path = f"{parent_path}/{folder_name}" if parent_path else folder_name
    full_path = full_path.replace("\\", "/")  # normalize for web
    file_list = []

    for entry in os.scandir(folder_path):
        if entry.is_file():
            file_name = entry.name
            file_stat = entry.stat()
            meta = meta_map.get(file_name, {})
            final_name = meta.get("documentName") or file_name
            final_desc = meta.get("description") or ""
            mime_type, _ = mimetypes.guess_type(entry.path)
            mime_type = mime_type or "application/octet-stream"
            file_list.append({
                "name": file_name,
                "documentName": final_name,
                "type": mime_type.split("/")[1],
                "link": os.path.abspath(entry.path).replace("\\", "/"),
                "date": datetime.fromtimestamp(file_stat.st_ctime).strftime("%b %d, %Y"),
                "desc": final_desc,
                "size": file_stat.st_size,
                "path": full_path
            })
        elif entry.is_dir():
            sub_files = traverse_folder(entry.path, full_path, meta_map)
            file_list.extend(sub_files)

    return file_list

# Group files by their folder path
def group_by_section(files):
    sections_map = {}
    for file in files:
        if file["path"] not in sections_map:
            sections_map[file["path"]] = []
        sections_map[file["path"]].append(file)
    return [{"section": path, "files": sections} for path, sections in sections_map.items()]

# Async function to mimic fetchDocumentsData
async def fetch_documents_data(folder_path, metadata_csv=None):
    print("Fetching documents data...")
    await asyncio.sleep(0.1)  # simulate async behavior
    meta_map = load_metadata(metadata_csv)
    all_files = traverse_folder(folder_path, meta_map=meta_map)
    folder_tree = group_by_section(all_files)
    print("Loaded documents from local folder")
    return folder_tree

# Save output JSON
async def main():
    folder_path = "Documents"
    metadata_csv = "meta.csv"
    data = await fetch_documents_data(folder_path, metadata_csv)
    output_file = "documents_output.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({"data": data}, f, indent=2)
    print(f"Output saved to {output_file}")

if __name__ == "__main__":
    asyncio.run(main())
