from flask import Flask, render_template, request, send_file
import os
import subprocess
import zipfile
import uuid

app = Flask(__name__)
UPLOAD_FOLDER = "static/outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 支持的视频尺寸
formats = {
    "916": (1080, 1920),
    "11": (1080, 1080),
    "169": (1920, 1080),
    "23": (1080, 1620),
    "45": (1080, 1350)
}

# 生成视频（背景模糊 + 前景居中）
def generate_resized_video(input_path, output_path, width, height):
    command = [
        "ffmpeg", "-y", "-i", input_path,
        "-filter_complex",
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},boxblur=10[bg];"
        f"[0:v]fps=60,scale=-2:{height}[fg];"
        f"[bg][fg]overlay=(W-w)/2:0",
        "-b:v", "13000k",  # 设置视频比特率，确保 ≥ 12000 kbps
        "-maxrate", "13000k",
        "-bufsize", "26000k",
        "-preset", "fast",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-movflags", "+faststart",
        output_path
    ]
    subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", sizes=formats.keys())

@app.route("/convert", methods=["POST"])
def convert():
    file = request.files.get("video")
    if not file:
        return "No video uploaded", 400

    selected_sizes = request.form.getlist("selected_sizes[]")
    if not selected_sizes:
        return "请至少选择一个输出尺寸", 400

    # 注意：这里是 name="blocks" 而不是 blocks[]
    blocks_raw = request.form.get("blocks")
    blocks = blocks_raw.split("||") if blocks_raw else []

    mode = request.form.get("mode")
    per_size_names = {}
    for key in formats.keys():
        per_size_names[key] = request.form.get(f"custom_name_{key}", "").strip()

    zip_name = request.form.get("zipname", "").strip()
    if not zip_name:
        return "请填写 ZIP 包名称", 400

    if mode == "per-size":
        for key in selected_sizes:
            if not per_size_names[key]:
                return f"命名未填写完整（{key}）", 400

    filename = str(uuid.uuid4()) + ".mp4"
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(input_path)

    result_files = []
    output_names = set()

    for size_key in selected_sizes:
        w, h = formats[size_key]
        name_parts = []

        for block in blocks:
            if block == "__SIZE__":
                name_parts.append(size_key)
            elif block == "__PER_SIZE__":
                name_parts.append(per_size_names.get(size_key, "") if mode == "per-size" else size_key)
            else:
                name_parts.append(block)

        output_name = "".join(name_parts) + ".mp4"

        if output_name in output_names:
            return f"存在命名完全相同的视频（{output_name}），请调整命名避免冲突", 400
        output_names.add(output_name)

        output_path = os.path.join(UPLOAD_FOLDER, output_name)
        generate_resized_video(input_path, output_path, w, h)
        result_files.append(output_path)

    zip_path = os.path.join(UPLOAD_FOLDER, zip_name + ".zip")
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for f in result_files:
            zipf.write(f, os.path.basename(f))

    os.remove(input_path)
    return send_file(zip_path, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)
