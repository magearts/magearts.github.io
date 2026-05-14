from rembg import remove, new_session
from PIL import Image
from pillow_heif import register_heif_opener
import os
import cv2
import numpy as np
from scipy import ndimage
from datetime import datetime

register_heif_opener()


_face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


def keep_person_component(rgba: Image.Image, source_rgb: Image.Image) -> Image.Image:
    """Keep only alpha components that contain a detected human face.
    Falls back to the largest component if no face is found."""
    if rgba.mode != "RGBA":
        rgba = rgba.convert("RGBA")
    arr = np.array(rgba)
    alpha = arr[:, :, 3]

    labeled, n = ndimage.label(alpha > 0)
    if n == 0:
        return rgba

    gray = cv2.cvtColor(np.array(source_rgb), cv2.COLOR_RGB2GRAY)
    faces = _face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

    keep_labels = set()
    for (x, y, w, h) in faces:
        cx, cy = x + w // 2, y + h // 2
        lab = labeled[cy, cx]
        if lab != 0:
            keep_labels.add(int(lab))

    if not keep_labels:
        sizes = ndimage.sum(alpha > 0, labeled, range(1, n + 1))
        keep_labels = {int(np.argmax(sizes) + 1)}

    mask = np.isin(labeled, list(keep_labels))
    arr[:, :, 3] = np.where(mask, alpha, 0)
    return Image.fromarray(arr, mode="RGBA")


# ===== MODEL =====
session_quality = new_session("birefnet-portrait")

script_dir = os.path.dirname(os.path.abspath(__file__))

# ===== SOURCE FOLDER =====
source_folder = os.path.join(script_dir, "input_images")

# ===== OUTPUT BASE FOLDER =====
output_base = os.path.join(script_dir, "output_images")

# # ===== INPUT DONE BASE FOLDER =====
# input_done_base = os.path.join(script_dir, "input_done")

os.makedirs(output_base, exist_ok=True)

# create timestamp folder YYYYMMDDHHMISS
timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
output_folder = os.path.join(output_base, timestamp)
# input_done_folder = os.path.join(input_done_base, timestamp)

os.makedirs(output_folder, exist_ok=True)
# os.makedirs(input_done_folder, exist_ok=True)

# read source folder
files = [
    f for f in os.listdir(source_folder)
    if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".heic"))
]
total = len(files)
print(f"Found {total} image(s) to process.")

for idx, file in enumerate(files, start=1):
    input_path = os.path.join(source_folder, file)
    print(f"[{idx}/{total}] Processing: {file}")

    with Image.open(input_path) as inp:
        inp_rgb = inp.convert("RGB")

        result = remove(
            inp_rgb,
            session=session_quality,
            alpha_matting=True,
            alpha_matting_foreground_threshold=270,
            alpha_matting_background_threshold=20,
            alpha_matting_erode_size=11,
        )

        result = keep_person_component(result, inp_rgb)

        output_name = os.path.splitext(file)[0] + ".png"
        output_path = os.path.join(output_folder, output_name)

        result.save(output_path)

    # done_path = os.path.join(input_done_folder, file)
    # os.rename(input_path, done_path)
    # # print(f"[{idx}/{total}] Done: {output_name}")

if not os.listdir(output_folder):
    os.rmdir(output_folder)
    # os.rmdir(input_done_folder)
    print("No images processed. Folders removed.")
else:
    print("All done!")
    print("  Output folder:    ", output_folder)
    # print("  Input done folder:", input_done_folder)