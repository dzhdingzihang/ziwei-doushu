import hashlib, json, os, pathlib, subprocess, tempfile
UPSTREAM = "Renhuai123/ziwei-doushu"
TARGET = os.environ["GITHUB_REPOSITORY"]
def gh(*args):
    return subprocess.check_output(["gh", *args], text=True)
releases = json.loads(gh("api", f"repos/{UPSTREAM}/releases?per_page=100"))
for release in releases:
    tag = release["tag_name"]
    existing = subprocess.run(["gh", "release", "view", tag, "--repo", TARGET], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if not existing:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md") as notes:
            notes.write(f"完整镜像自 https://github.com/{UPSTREAM}/releases/tag/{tag}\n\n作者：王多鱼AI。数据许可：CC BY 4.0；其中引用的倪师原话为 CC BY-NC-SA 4.0。保留上游原始内容与许可。\n\n" + (release.get("body") or "")); notes.flush()
            subprocess.run(["gh", "release", "create", tag, "--repo", TARGET, "--title", release["name"] or tag, "--notes-file", notes.name], check=True)
    for asset in release["assets"]:
        current = json.loads(gh("api", f"repos/{TARGET}/releases/tags/{tag}"))
        done = next((a for a in current["assets"] if a["name"] == asset["name"] and a["size"] == asset["size"] and a.get("digest") and a.get("digest") == asset.get("digest")), None)
        if done:
            print("Verified existing", tag, asset["name"], flush=True); continue
        with tempfile.TemporaryDirectory() as directory:
            subprocess.run(["gh", "release", "download", tag, "--repo", UPSTREAM, "--pattern", asset["name"], "--dir", directory], check=True)
            file = pathlib.Path(directory) / asset["name"]
            assert file.stat().st_size == asset["size"], "Size mismatch"
            digest = hashlib.sha256()
            with file.open("rb") as stream:
                for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""): digest.update(chunk)
            actual = "sha256:" + digest.hexdigest()
            if asset.get("digest"): assert actual == asset["digest"], "Upstream SHA256 mismatch"
            subprocess.run(["gh", "release", "upload", tag, str(file), "--repo", TARGET, "--clobber"], check=True)
            uploaded = json.loads(gh("api", f"repos/{TARGET}/releases/tags/{tag}"))
            remote = next(a for a in uploaded["assets"] if a["name"] == asset["name"])
            assert remote["size"] == asset["size"]
            if remote.get("digest"): assert actual == remote["digest"], "Target SHA256 mismatch"
            print("Verified copied", tag, asset["name"], actual, flush=True)
print("All releases and all assets copied and verified.")
