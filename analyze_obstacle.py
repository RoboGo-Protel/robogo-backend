import base64
import cv2
import numpy as np
import requests
import time
from flask import Flask, request, jsonify, send_file
from io import BytesIO

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze_image_by_url():
    data = request.get_json()
    image_url = data.get('imageUrl')

    if not image_url:
        return jsonify({'error': 'imageUrl is required'}), 400

    try:
        start_total = time.time()

        response = requests.get(image_url)
        img_arr = np.frombuffer(response.content, np.uint8)
        img = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        height, width = img.shape[:2]
        center_start = width // 3
        center_end = width * 2 // 3
        center_area = img[:, center_start:center_end]

        gray = cv2.cvtColor(center_area, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 100, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        found_obstacle = False
        for c in contours:
            area = cv2.contourArea(c)
            if area > 500:
                found_obstacle = True
                x, y, w, h = cv2.boundingRect(c)
                # Ubah warna kotak menjadi merah (BGR: (0, 0, 255))
                cv2.rectangle(img, (x + center_start, y), (x + center_start + w, y + h), (0, 0, 255), 2)

        # Encode processed image to base64
        _, buffer = cv2.imencode('.jpg', img)
        img_base64 = 'data:image/jpeg;base64,' + base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'obstacle': found_obstacle,
            'image': img_base64
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
