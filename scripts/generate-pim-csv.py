#!/usr/bin/env python3
"""
Script to generate PIM CSV from merchantSku list

Usage: python3 scripts/generate-pim-csv.py <input.csv> [output.csv]

Input CSV should have a column "merchantSku" (or "sku")
Output CSV will have: sku,variant_size,variant_color,price_excl_vat,stock

This CSV can be used with the CreatorListing import which auto-creates products and variants
"""

import csv
import sys
import os
from collections import defaultdict

# Map color codes to full names
COLOR_MAP = {
    'WHT': 'White',
    'BLK': 'Black',
    'GRY': 'Grey',
    'NAV': 'Navy',
    'PNK': 'Pink',
    'BL': 'Blue',
    'OL': 'Olive',
    'FL': 'Floral',
    'DE': 'Denim',
    'RE': 'Red',
    'WH': 'White',
    'GR': 'Green',
    'BR': 'Brown',
    'WI': 'Wine',
    'B': 'Blue',
    'V': 'Violet',
    'F': 'Floral',
    'L': 'Lavender',
    'G': 'Green',
    'N': 'Navy',
    'D': 'Denim',
    'C': 'Cream',
    'E': 'Ecru',
    'R': 'Red',
    'H': 'Honey',
    'I': 'Ivory',
    'O': 'Orange',
    'S': 'Silver',
    'T': 'Tan',
    'W': 'White'
}

def normalize_color(color_code):
    """Convert color code to full name, or keep existing name if already full"""
    if not color_code:
        return 'Default'
    
    # If it's already a full color name (has spaces or is longer than 3 chars), keep it
    if ' ' in color_code or len(color_code) > 3:
        return color_code
    
    # Otherwise, try to map the code
    upper = color_code.upper()
    return COLOR_MAP.get(upper, color_code)

def parse_merchant_sku(merchant_sku):
    """Parse merchantSku to extract product info
    Examples: "TS001-S-WHT" -> { productCode: "TS001", size: "S", color: "WHT" }
    """
    cleaned = merchant_sku.strip().rstrip(',')
    parts = cleaned.split('-')
    
    if len(parts) >= 3:
        # Pattern: [PRODUCT]-[SIZE]-[COLOR]
        return {
            'productCode': parts[0],
            'size': parts[-2],
            'color': parts[-1]
        }
    elif len(parts) == 2:
        # Pattern: [PRODUCT]-[SIZE] (no color)
        return {
            'productCode': parts[0],
            'size': parts[1],
            'color': ''
        }
    
    return {
        'productCode': cleaned,
        'size': '',
        'color': ''
    }

def main():
    if len(sys.argv) < 2:
        print('Usage: python3 scripts/generate-pim-csv.py <input.csv> [output.csv]')
        print('Example: python3 scripts/generate-pim-csv.py merchantSku-list.csv pim-import.csv')
        print('\nInput CSV can have:')
        print('  - Only merchantSku column (will extract size/color from SKU)')
        print('  - merchantSku, variant_size, variant_color columns (will use those directly)')
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'pim-import.csv'
    
    print(f'Reading from: {input_file}')
    print(f'Writing to: {output_file}')
    
    if not os.path.exists(input_file):
        print(f'Error: Input file not found: {input_file}')
        sys.exit(1)
    
    # Read input CSV
    output_rows = []
    seen_variants = set()
    product_map = defaultdict(list)
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = [f.lower().strip() for f in reader.fieldnames or []]
        
        for row in reader:
            # Find merchantSku column (case-insensitive)
            merchant_sku = None
            for key in row.keys():
                if key.lower().strip() in ['merchantsku', 'merchant_sku', 'sku']:
                    merchant_sku = row[key]
                    break
            
            if not merchant_sku or not merchant_sku.strip():
                continue
            
            # Check if variant_size and variant_color are already in the CSV
            variant_size = None
            variant_color = None
            
            for key in row.keys():
                key_lower = key.lower().strip()
                if key_lower in ['variant_size', 'size', 'variant size']:
                    variant_size = row[key].strip() if row[key] else None
                elif key_lower in ['variant_color', 'color', 'variant color']:
                    variant_color = row[key].strip() if row[key] else None
            
            # If size/color are in CSV, use them; otherwise extract from merchantSku
            if variant_size and variant_color:
                # Use values from CSV directly
                # Extract product code from merchantSku (first part before first dash)
                product_code = merchant_sku.split('-')[0] if '-' in merchant_sku else merchant_sku
                size = variant_size
                color = normalize_color(variant_color) if variant_color else 'Default'
            elif variant_size or variant_color:
                # Partial data: use what we have, extract rest from merchantSku
                parsed = parse_merchant_sku(merchant_sku)
                product_code = parsed['productCode']
                size = variant_size if variant_size else (parsed['size'] or 'OS')
                color = normalize_color(variant_color) if variant_color else normalize_color(parsed['color'])
            else:
                # Extract everything from merchantSku
                parsed = parse_merchant_sku(merchant_sku)
                product_code = parsed['productCode']
                size = parsed['size'] or 'OS'
                color = normalize_color(parsed['color'])
            
            # Create unique key to avoid duplicates
            variant_key = f"{product_code}-{size}-{color}"
            if variant_key in seen_variants:
                continue
            seen_variants.add(variant_key)
            
            output_row = {
                'sku': product_code,
                'variant_size': size,
                'variant_color': color,
                'price_excl_vat': '1.00',  # Dummy price - will be updated in UI later
                'stock': '0'
            }
            
            output_rows.append(output_row)
            product_map[product_code].append(output_row)
    
    # Sort output by product code and variant
    output_rows.sort(key=lambda x: (x['sku'], x['variant_size'], x['variant_color']))
    
    # Write output CSV
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['sku', 'variant_size', 'variant_color', 'price_excl_vat', 'stock'])
        writer.writeheader()
        writer.writerows(output_rows)
    
    print(f'\n✅ Generated {len(output_rows)} rows for {len(product_map)} products')
    print(f'\nProducts found:')
    for product_code, variants in sorted(product_map.items()):
        print(f'  - {product_code}: {len(variants)} variant(s)')
    print(f'\n📄 CSV saved to: {output_file}')
    print(f'\n📋 Next steps:')
    print(f'  1. Import this CSV via Creator Studio → Producten tab → CSV Import')
    print(f'  2. This will create ProductMaster and ProductVariant entries in PIM')
    print(f'  3. Then import your stock CSV via Voorraad tab → CSV Import')

if __name__ == '__main__':
    main()


