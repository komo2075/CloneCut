import threading
import webbrowser
import sys
import os
import subprocess
import zipfile
import uuid
from datetime import datetime
from flask import Flask, render_template, request, send_file, jsonify

def resource_path(relative_path):
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

BASE_DIR = resource_path("")
FFMPEG_PATH = resource_path("ffmpeg.exe")

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)

UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "outputs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# 资源路径适配（打包后 Flask 模板和静态文件在 dist 目录，需要能访问到）
def get_base_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = get_base_dir()




formats = {
    "916": (1080, 1920),
    "11": (1080, 1080),
    "169": (1920, 1080),
    "23": (1080, 1620),
    "45": (1080, 1350)
}

# 用 token 暂存 zip 路径（单机自用够用）
ZIP_STORE = {}



def generate_resized_video(input_path, output_path, width, height):
    command = [
        FFMPEG_PATH, "-y", "-i", input_path,
        "-filter_complex",
        f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},boxblur=10[bg];"
        f"[0:v]fps=60,scale=-2:{height}[fg];"
        f"[bg][fg]overlay=(W-w)/2:0",
        "-b:v", "13000k",
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


@app.route("/download/<token>", methods=["GET"])
def download(token):
    path = ZIP_STORE.get(token)

    if not path:
        return "file not found, missing token", 404

    path = os.path.abspath(path)

    if not os.path.exists(path):
        return f"file not found on disk: {path}", 404

    return send_file(
        path,
        as_attachment=True,
        download_name=os.path.basename(path),
        mimetype="application/zip"
    )

@app.route("/convert", methods=["POST"])
def convert():
    warnings = []

    file = request.files.get("video")
    if not file:
        return jsonify(ok=False, warnings=["No video file uploaded. Export cannot proceed."]), 200

    selected_sizes = request.form.getlist("selected_sizes[]")
    if not selected_sizes:
        return jsonify(ok=False, warnings=["No output sizes selected. Export cannot proceed."]), 200
    blocks_raw = request.form.get("blocks")
    blocks = blocks_raw.split("||") if blocks_raw else []
    if not blocks:
        # 没积木也能导出，但会很容易重名
        warnings.append("No naming blocks found. Default size names will be used as filenames.")

    
    #clonecut2.2
    # ✅ 读取每个尺寸的区别名
    mode = request.form.get("mode")

    # ✅ 从 blocks 里解析出本次命名序列里用到了哪些区别名 key
    # blocks 里我们会让 custom 变成 "__PER_SIZE__:cb_xxx"
    custom_keys = []
    for b in blocks:
        if b.startswith("__PER_SIZE__:"):
            custom_keys.append(b.split(":", 1)[1])

    # ✅ 读取每个区别名 key 对应的 per-size 字典
    # 字段名格式: customblock_<key>_<size>
    custom_maps = {}
    for ck in custom_keys:
        m = {}
        for s in formats.keys():
            m[s] = request.form.get(f"customblock_{ck}_{s}", "").strip()
        custom_maps[ck] = m

    # zip 名为空：不阻止，自动给一个
    zip_name = request.form.get("zipname", "").strip()
    if not zip_name:
        zip_name = "CloneCut_" + datetime.now().strftime("%Y%m%d_%H%M%S")
        warnings.append(f"ZIP name not provided. Automatically using {zip_name}")


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

            #clonecut2.2
            # ✅ 处理 per-size 片段
            elif block.startswith("__PER_SIZE__:"):
                ck = block.split(":", 1)[1]
                v = ""
                if mode == "per-size":
                    v = (custom_maps.get(ck, {}).get(size_key, "") or "")
                # ✅ 关键：不填就是空，等于跳过这个片段
                name_parts.append(v)


            else:
                name_parts.append(block)

        # 命名片段空：不阻止，自动移除空片段
        if "" in name_parts:
            warnings.append(f"Incomplete filename for（{size_key}），Empty segments were ignored automatically.")
            name_parts = [p for p in name_parts if p != ""]

        # 仍然为空：给一个兜底名
        base_name = "".join(name_parts).strip()
        if not base_name:
            base_name = f"video_{size_key}"
            warnings.append(f"Final filename is empty for（{size_key}），Automatically using {base_name}")

        output_name = base_name + ".mp4"

        # 重名：不阻止，自动加序号
        if output_name in output_names:
            i = 2
            new_name = f"{base_name}_{i}.mp4"
            while new_name in output_names:
                i += 1
                new_name = f"{base_name}_{i}.mp4"
            warnings.append(f"Duplicate filename detected：{output_name}，Renamed automatically to {new_name}")
            output_name = new_name

        output_names.add(output_name)

        output_path = os.path.join(UPLOAD_FOLDER, output_name)
        generate_resized_video(input_path, output_path, w, h)
        result_files.append(output_path)

    zip_path = os.path.abspath(os.path.join(UPLOAD_FOLDER, zip_name + ".zip"))
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for f in result_files:
            zipf.write(f, os.path.basename(f))

    # 清理上传原文件（保留输出和zip）
    try:
        os.remove(input_path)
    except:
        pass

    token = str(uuid.uuid4())
    ZIP_STORE[token] = zip_path

    return jsonify(ok=True, download_url=f"/download/{token}", warnings=warnings), 200

def open_browser():
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    threading.Timer(1.5, open_browser).start()
    app.run(host="127.0.0.1", port=5000)
    
