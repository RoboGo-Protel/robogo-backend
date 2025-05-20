import cv2

def upscale_image(input_path, output_path, scale=2):
    # Buka gambar
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Gambar tidak ditemukan!")

    # Resize gambar
    height, width = img.shape[:2]
    new_size = (width * scale, height * scale)
    upscaled = cv2.resize(img, new_size, interpolation=cv2.INTER_CUBIC)

    # Simpan gambar
    cv2.imwrite(output_path, upscaled)
    print(f"Gambar berhasil di-upscale dan disimpan di {output_path}")

# Contoh pemakaian
upscale_image("input.png", "output_upscaled.png", scale=2)