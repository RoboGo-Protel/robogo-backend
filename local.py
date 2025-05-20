import cv2
import numpy as np
import requests
import time
import sys
import os

def analyze_image_from_url(image_url):
    try:
        start_total = time.time()

        # Unduh gambar
        start_dl = time.time()
        response = requests.get(image_url)
        dl_time = time.time() - start_dl
        print(f"[INFO] Download image: {dl_time:.3f} detik, size: {len(response.content)} bytes")

        # Simpan gambar ke file lokal
        with open('downloaded_image.jpg', 'wb') as f:
            f.write(response.content)
        print("[INFO] Image saved locally as downloaded_image.jpg")

        image_np = np.frombuffer(response.content, np.uint8)

        start_decode = time.time()
        img = cv2.imdecode(image_np, cv2.IMREAD_COLOR)
        decode_time = time.time() - start_decode
        print(f"[INFO] Decode image: {decode_time:.3f} detik")

        if img is None:
            raise ValueError("Failed to decode image")

        return analyze_image(img, start_total)

    except Exception as e:
        print(f"[ERROR] {e}")
        return None

def analyze_image_from_file(filepath):
    try:
        start_total = time.time()

        start_load = time.time()
        img = cv2.imread(filepath)
        load_time = time.time() - start_load
        print(f"[INFO] Load image: {load_time:.3f} detik")

        if img is None:
            raise ValueError("Failed to load image from file")

        return analyze_image(img, start_total)

    except Exception as e:
        print(f"[ERROR] {e}")
        return None

def analyze_image(img, start_total):
    start_proc = time.time()

    height, width = img.shape[:2]
    center_start = width // 3
    center_end = width * 2 // 3
    center_area = img[:, center_start:center_end]

    gray = cv2.cvtColor(center_area, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 100, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    found_obstacle = any(cv2.contourArea(c) > 500 for c in contours)

    proc_time = time.time() - start_proc
    total_time = time.time() - start_total
    print(f"[INFO] Process image: {proc_time:.3f} detik")
    print(f"[INFO] Total elapsed time: {total_time:.3f} detik")
    print(f"[RESULT] Obstacle detected: {found_obstacle}")

    return found_obstacle

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python script.py --url <image_url>")
        print("  python script.py --file <image_path>")
        sys.exit(1)

    option = sys.argv[1]
    value = sys.argv[2]

    if option == '--url':
        analyze_image_from_url(value)
    elif option == '--file':
        analyze_image_from_file(value)
    else:
        print("Unknown option. Use --url or --file")
