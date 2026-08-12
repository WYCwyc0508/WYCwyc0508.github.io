(function () {
  var CONFIG = {
    repo: "WYCwyc0508/WYCwyc0508.github.io",
    branch: "main",
    password: "MjAwNjA1MDh3eWM=",
    token: "Z2l0aHViX3BhdF8xMUNGVVFVVUkwTFR4Z0todmozTkIzX2tKd0g5akFacG5XWUNYdDY0MVVab1hleGt3UUhVT3VHSkQyZXA2YkhBSUwyRVlSMkFTV0xtUTV0dnJG",
    postDir: "docs/blog/posts",
    assetDir: "docs/blog/assets"
  };

  function b64decode(s) {
    try {
      return atob(s);
    } catch (e) {
      return "";
    }
  }

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    bytes.forEach(function (b) {
      bin += String.fromCharCode(b);
    });
    return btoa(bin);
  }

  function $(id) {
    return document.getElementById(id);
  }

  var form = $("submit-form");
  var statusEl = $("submit-status");

  function show(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className = "submit-status" + (isError ? " submit-status-error" : "");
  }

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        resolve(fr.result);
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function compress(dataUrl, file) {
    return new Promise(function (resolve, reject) {
      loadImage(dataUrl).then(function (img) {
        var maxDim = 1920;
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        if (w <= maxDim && h <= maxDim && file.size <= 2 * 1024 * 1024) {
          resolve(dataUrl.split(",")[1]);
          return;
        }
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      }, reject);
    });
  }

  function putContent(path, contentB64, message) {
    var url = "https://api.github.com/repos/" + CONFIG.repo + "/contents/" + path;
    return fetch(url, {
      method: "PUT",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + b64decode(CONFIG.token),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        content: contentB64,
        branch: CONFIG.branch
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (j) {
          throw new Error(j.message || res.status + " " + res.statusText);
        });
      }
    });
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function rand(n) {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var out = "";
    for (var i = 0; i < n; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function buildPost(title, body, links) {
    var d = new Date();
    var date = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    var imgBlock = links.length ? "\n\n" + links.join("\n\n") : "";
    return "---\ndate: " + date + "\n---\n\n# " + title + "\n\n" + body + imgBlock + "\n";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var password = $("submit-password").value.trim();
    var title = $("submit-title").value.trim();
    var body = $("submit-body").value.trim();
    var files = Array.from($("submit-files").files || []);

    if (!title || !body) {
      show("请填写标题和正文", true);
      return;
    }
    if (password !== b64decode(CONFIG.password)) {
      show("密码错误", true);
      return;
    }
    if (files.length > 5) {
      show("最多上传 5 张图片", true);
      return;
    }
    if (CONFIG.token === "") {
      show("站点尚未配置 token,无法发布", true);
      return;
    }

    var btn = $("submit-btn");
    btn.disabled = true;
    show("正在发布,请稍候……", false);

    (async function () {
      try {
        var links = [];
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          if (!file.type || file.type.indexOf("image/") !== 0) {
            continue;
          }
          show("正在上传图片 " + (i + 1) + "/" + files.length, false);
          var dataUrl = await readAsDataURL(file);
          var base64 = await compress(dataUrl, file);
          var ext = file.type === "image/png" ? "png" : "jpg";
          var assetPath = CONFIG.assetDir + "/" + new Date().getTime() + "-" + rand(4) + "." + ext;
          await putContent(assetPath, base64, "post image");
          links.push("![图片](/blog/assets/" + assetPath.split("/").pop() + ")");
        }

        var slug = slugify(title) || "post";
        var d = new Date();
        var dateStr = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
        var postPath = CONFIG.postDir + "/" + dateStr + "-" + slug + ".md";
        var n = 2;
        show("正在发布文章……", false);
        while (true) {
          try {
            await putContent(postPath, b64encode(buildPost(title, body, links)), "post: " + title);
            break;
          } catch (err) {
            if (err.message && err.message.indexOf("already exists") !== -1) {
              postPath = CONFIG.postDir + "/" + dateStr + "-" + slug + "-" + n + ".md";
              n++;
              continue;
            }
            throw err;
          }
        }
        form.reset();
        show("发布成功!约 1~2 分钟后可在「博客」页看到新文章。", false);
      } catch (err) {
        show("发布失败:" + err.message, true);
      } finally {
        btn.disabled = false;
      }
    })();
  });
})();
