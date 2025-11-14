#!/usr/bin/env python3
"""
Import voorraad.csv directly via API
"""

import requests
import json
import sys
import os

CSV_FILE = '/Users/dremy/Downloads/voorraad.csv'
API_BASE = 'http://localhost:3000/api'

def main():
    # Step 1: Try to login (you may need to adjust these)
    print("🔐 Step 1: Logging in...")
    
    # Try common test credentials
    test_emails = [
        'creator@example.com',
        'admin@example.com',
        'test@example.com'
    ]
    
    session = requests.Session()
    logged_in = False
    
    for email in test_emails:
        try:
            response = session.post(
                f'{API_BASE}/auth/login',
                json={'email': email, 'password': 'password123'},
                timeout=5
            )
            if response.status_code == 200:
                print(f"✅ Logged in as: {email}")
                logged_in = True
                break
        except Exception as e:
            continue
    
    if not logged_in:
        print("❌ Could not login. Please provide credentials:")
        email = input("Email: ")
        password = input("Password: ")
        
        response = session.post(
            f'{API_BASE}/auth/login',
            json={'email': email, 'password': password},
            timeout=5
        )
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code}")
            print(response.text)
            sys.exit(1)
        
        print(f"✅ Logged in as: {email}")
    
    # Step 2: Upload CSV
    print(f"\n📤 Step 2: Uploading {CSV_FILE}...")
    
    if not os.path.exists(CSV_FILE):
        print(f"❌ File not found: {CSV_FILE}")
        sys.exit(1)
    
    with open(CSV_FILE, 'rb') as f:
        files = {'csv': ('voorraad.csv', f, 'text/csv')}
        
        try:
            response = session.post(
                f'{API_BASE}/merchant/inventory/import',
                files=files,
                timeout=60
            )
            
            print(f"\n📊 Response status: {response.status_code}")
            
            try:
                data = response.json()
                print("\n📊 Response data:")
                print(json.dumps(data, indent=2))
                
                if response.status_code == 200:
                    if 'success' in data:
                        print(f"\n✅ Success: {len(data.get('success', []))} stocks updated")
                    if 'errors' in data and data['errors']:
                        print(f"\n⚠️  Errors: {len(data['errors'])} errors")
                        print("\nFirst 10 errors:")
                        for i, err in enumerate(data['errors'][:10], 1):
                            print(f"  {i}. Row {err.get('row', '?')}: {err.get('error', 'Unknown')}")
                else:
                    print(f"\n❌ Import failed with status {response.status_code}")
                    
            except json.JSONDecodeError:
                print("\n❌ Response is not JSON:")
                print(response.text[:500])
                
        except requests.exceptions.RequestException as e:
            print(f"\n❌ Request failed: {e}")
            sys.exit(1)

if __name__ == '__main__':
    main()

