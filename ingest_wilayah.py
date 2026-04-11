import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE_URL = 'https://www.emsifa.com/api-wilayah-indonesia/api'


def fetch_json(url: str, retries: int = 3, backoff_seconds: float = 1.0):
  last_err = None
  for i in range(retries):
    try:
      with urllib.request.urlopen(url) as resp:
        raw = resp.read().decode('utf-8')
        return json.loads(raw)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
      last_err = e
      time.sleep(backoff_seconds * (2 ** i))
  raise last_err


def write_csv(filename: str, fieldnames: list, rows: list):
  with open(filename, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)


def main():
  os.makedirs('wilayah_csv', exist_ok=True)

  provinces = fetch_json(f'{BASE_URL}/provinces.json')
  province_rows = [{'id': p['id'], 'name': p['name']} for p in provinces]
  write_csv('wilayah_csv/provinces.csv', ['id', 'name'], province_rows)

  for p in provinces:
    province_id = p['id']
    regencies = fetch_json(f'{BASE_URL}/regencies/{province_id}.json')
    regency_rows = [{'id': r['id'], 'province_id': r['province_id'], 'name': r['name']} for r in regencies]
    write_csv('wilayah_csv/regencies.csv', ['id', 'province_id', 'name'], regency_rows)

    for r in regencies:
      regency_id = r['id']
      districts = fetch_json(f'{BASE_URL}/districts/{regency_id}.json')
      district_rows = [{'id': d['id'], 'regency_id': d['regency_id'], 'name': d['name']} for d in districts]
      write_csv('wilayah_csv/districts.csv', ['id', 'regency_id', 'name'], district_rows)

      for d in districts:
        district_id = d['id']
        villages = fetch_json(f'{BASE_URL}/villages/{district_id}.json')
        village_rows = [{'id': v['id'], 'district_id': v['district_id'], 'name': v['name']} for v in villages]
        write_csv('wilayah_csv/villages.csv', ['id', 'district_id', 'name'], village_rows)

    print(f'Exported province {province_id} ({p["name"]})')

  print('Done. CSV files saved in wilayah_csv/')


if __name__ == '__main__':
  main()
