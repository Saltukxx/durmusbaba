#!/usr/bin/env python
"""
Bu script, service-account.json dosyasını Base64'e dönüştürür.
Bu, güvenli bir şekilde credentials'ları environment variable olarak saklamak için kullanılır.
"""

import base64
import json
import sys

def encode_file_to_base64(file_path):
    """Dosyayı Base64'e dönüştürür."""
    try:
        with open(file_path, 'r') as file:
            # JSON formatını doğrula
            json_content = json.load(file)
            # Tekrar JSON string'e dönüştür
            json_str = json.dumps(json_content)
            # Base64'e dönüştür
            base64_bytes = base64.b64encode(json_str.encode('utf-8'))
            base64_str = base64_bytes.decode('utf-8')
            return base64_str
    except Exception as e:
        print(f"Hata: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "service-account.json"
    
    base64_str = encode_file_to_base64(file_path)
    if base64_str:
        print("\n=== Base64 Kodlanmış Service Account JSON ===")
        print(base64_str)
        print("\n=== Bu değeri GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable olarak kullanın ===")
        
        # .env dosyasına ekleme seçeneği
        add_to_env = input("\n.env dosyasına eklemek ister misiniz? (e/h): ")
        if add_to_env.lower() == 'e':
            try:
                with open('.env', 'a') as env_file:
                    env_file.write(f"\nGOOGLE_APPLICATION_CREDENTIALS_BASE64={base64_str}")
                print(".env dosyasına eklendi.")
            except Exception as e:
                print(f".env dosyasına eklenirken hata oluştu: {e}")
    else:
        print("Dosya kodlanamadı.") 