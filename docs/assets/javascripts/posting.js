(function () {
  var CONFIG = {
    repo: "WYCwyc0508/WYCwyc0508.github.io",
    branch: "main",
    password: "MjAwNjA1MDh3eWM=",
    token: "{{POST_TOKEN}}"
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

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  var UNLOCK_KEY = "site_post_unlocked";

  function isUnlocked() {
    try {
      return localStorage.getItem(UNLOCK_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setUnlocked() {
    try {
      localStorage.setItem(UNLOCK_KEY, "1");
    } catch (e) {}
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function rand(n) {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var out = "";
    for (var i = 0; i < n; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function api(method, path, body) {
    var url = "https://api.github.com/repos/" + CONFIG.repo + "/contents/" + path;
    var opts = {
      method: method,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + b64decode(CONFIG.token),
        "Content-Type": "application/json"
      }
    };
    if (body) {
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.json().then(function (j) {
        if (!res.ok) {
          throw new Error(j.message || res.status + " " + res.statusText);
        }
        return j;
      });
    });
  }

  function getFile(path) {
    return fetch("https://raw.githubusercontent.com/" + CONFIG.repo + "/" + CONFIG.branch + "/" + path)
      .then(function (res) {
        if (res.ok) {
          return res.text();
        }
        throw new Error("raw fail");
      })
      .catch(function () {
        return api("GET", path).then(function (j) {
          return atob(j.content.replace(/\s+/g, ""));
        });
      });
  }

  function saveJsonFile(path, obj, message) {
    var content = JSON.stringify(obj, null, 2);
    return api("GET", path).then(function (j) {
      return { content: content, sha: j.sha };
    }).catch(function () {
      return { content: content, sha: null };
    }).then(function (p) {
      var body = { message: message, content: b64encode(p.content), branch: CONFIG.branch };
      if (p.sha) {
        body.sha = p.sha;
      }
      return api("PUT", path, body);
    });
  }

  function putFile(path, contentB64, message) {
    return api("PUT", path, { message: message, content: contentB64, branch: CONFIG.branch });
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

  function compressImage(dataUrl, file) {
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

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function buildWidget(widget) {
    var section = widget.getAttribute("data-section");
    var postsDir = "docs/" + section + "/posts";
    var indexJson = "docs/" + section + "/index.json";
    var commentsJson = "docs/" + section + "/comments.json";

    widget.innerHTML =
      "<h2>文章</h2>" +
      "<div class='sw-posts'></div>" +
      (isUnlocked()
        ? "<details class='sw-post-form'>" +
          "<summary>发表文章</summary>" +
          "<form>" +
          "<label>标题</label><input type='text' name='title' maxlength='60'>" +
          "<label>正文(支持 Markdown)</label><textarea name='body' rows='8'></textarea>" +
          "<label>图片(可选,最多 5 张)</label><input type='file' name='files' accept='image/*' multiple>" +
          "<button type='submit'>发布</button>" +
          "<div class='sw-status'></div>" +
          "</form>" +
          "</details>"
        : "") +
      "<h2>评论</h2>" +
      "<div class='sw-comments'></div>" +
      "<form class='sw-comment-form'>" +
      "<label>昵称</label><input type='text' name='name' maxlength='20'>" +
      "<label>内容</label><textarea name='text' rows='3'></textarea>" +
      "<button type='submit'>发表评论</button>" +
      "<div class='sw-status'></div>" +
      "</form>";

    var postsEl = widget.querySelector(".sw-posts");
    var commentsEl = widget.querySelector(".sw-comments");

    function renderPosts(list) {
      var entries = (list || []).slice().sort().reverse();
      if (!entries.length) {
        postsEl.innerHTML = "<p class='sw-empty'>还没有文章,来发表第一篇吧</p>";
        return;
      }
      postsEl.innerHTML = "<ul class='sw-post-list'>" + entries.map(function (e) {
        var name = e.file || e.name;
        var title = e.title || name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "").replace(/-/g, " ");
        var url = "/" + section + "/posts/" + name.replace(/\.md$/, "") + "/";
        return "<li><a href='" + url + "'>" + esc(title) + "</a><span class='sw-date'>" + esc(String(e.date || name).slice(0, 10)) + "</span></li>";
      }).join("") + "</ul>";
    }

    function loadPosts() {
      getFile(indexJson).then(function (text) {
        var data = JSON.parse(text);
        renderPosts(data.posts);
      }).catch(function () {
        api("GET", postsDir).then(function (files) {
          renderPosts(files);
        }).catch(function () {
          postsEl.innerHTML = "<p class='sw-empty'>暂时无法加载文章列表</p>";
        });
      });
    }

    function renderComments(comments) {
      var list = (comments || []).slice().reverse();
      if (!list.length) {
        commentsEl.innerHTML = "<p class='sw-empty'>暂无评论</p>";
        return;
      }
      commentsEl.innerHTML = list.map(function (c) {
        return "<div class='sw-comment'><span class='sw-comment-name'>" + esc(c.name || "匿名") + "</span>" +
          "<span class='sw-comment-time'>" + esc(String(c.time || "").slice(0, 16)) + "</span>" +
          "<p>" + esc(c.text) + "</p></div>";
      }).join("");
    }

    function loadComments() {
      getFile(commentsJson).then(function (text) {
        renderComments(JSON.parse(text).comments);
      }).catch(function () {
        commentsEl.innerHTML = "<p class='sw-empty'>暂无评论</p>";
      });
    }

    var postForm = widget.querySelector(".sw-post-form form");
    if (postForm) {
      postForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var status = f.querySelector(".sw-status");
      var btn = f.querySelector("button");
      var title = f.querySelector("[name=title]").value.trim();
      var body = f.querySelector("[name=body]").value.trim();
      var files = Array.from(f.querySelector("[name=files]").files || []);

      function show(msg, isError) {
        status.textContent = msg;
        status.className = "sw-status" + (isError ? " sw-status-error" : "");
      }

      if (!title || !body) {
        return show("请填写标题和正文", true);
      }
      if (files.length > 5) {
        return show("最多上传 5 张图片", true);
      }

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
            var base64 = await compressImage(dataUrl, file);
            var ext = file.type === "image/png" ? "png" : "jpg";
            var assetPath = "docs/" + section + "/assets/" + new Date().getTime() + "-" + rand(4) + "." + ext;
            await putFile(assetPath, base64, "post image");
            links.push("![](" + assetPath.replace(/^docs/, "") + ")");
          }

          var slug = slugify(title) || "post";
          var dateStr = today();
          var postPath = postsDir + "/" + dateStr + "-" + slug + ".md";
          var n = 2;
          show("正在发布文章……", false);
          while (true) {
            try {
              var md = "---\ndate: " + dateStr + "\n---\n\n# " + title + "\n\n" + body + (links.length ? "\n\n" + links.join("\n\n") : "") + "\n";
              await putFile(postPath, b64encode(md), "post: " + title);
              break;
            } catch (err) {
              if (err.message && err.message.indexOf("already exists") !== -1) {
                postPath = postsDir + "/" + dateStr + "-" + slug + "-" + n + ".md";
                n++;
                continue;
              }
              throw err;
            }
          }

          await saveJsonFile(indexJson, {
            posts: (function (cur) {
              cur.push({ file: postPath.split("/").pop(), title: title, date: dateStr });
              return cur;
            })(await getFile(indexJson).then(function (t) {
              try {
                return JSON.parse(t).posts || [];
              } catch (e) {
                return [];
              }
            }).catch(function () {
              return [];
            }))
          }, "update index");

          f.reset();
          show("发布成功!文章已出现在本页上方", false);
          loadPosts();
        } catch (err) {
          show("发布失败:" + err.message, true);
        } finally {
          btn.disabled = false;
        }
      })();
    });
    }

    widget.querySelector(".sw-comment-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var status = f.querySelector(".sw-status");
      var btn = f.querySelector("button");
      var name = f.querySelector("[name=name]").value.trim();
      var text = f.querySelector("[name=text]").value.trim();

      function show(msg, isError) {
        status.textContent = msg;
        status.className = "sw-status" + (isError ? " sw-status-error" : "");
      }

      if (!text) {
        return show("请输入评论内容", true);
      }
      btn.disabled = true;
      show("正在发表评论……", false);

      (async function () {
        try {
          var cur = await getFile(commentsJson).then(function (t) {
            try {
              return JSON.parse(t).comments || [];
            } catch (e) {
              return [];
            }
          }).catch(function () {
            return [];
          });
          cur.push({ name: name || "匿名", text: text, time: new Date().toISOString() });
          await saveJsonFile(commentsJson, { comments: cur }, "new comment");
          f.reset();
          show("评论已发表", false);
          loadComments();
        } catch (err) {
          show("评论失败:" + err.message, true);
        } finally {
          btn.disabled = false;
        }
      })();
    });

    loadPosts();
    loadComments();
  }

  var secretToggle = document.querySelector(".secret-toggle");
  if (secretToggle) {
    var secretForm = document.querySelector(".secret-form");
    var secretMsg = secretForm.querySelector(".secret-msg");
    secretToggle.addEventListener("click", function () {
      secretForm.hidden = !secretForm.hidden;
    });
    secretForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = secretForm.querySelector("input").value.trim();
      if (value === b64decode(CONFIG.password)) {
        secretForm.hidden = true;
        secretToggle.hidden = true;
        setUnlocked();
        secretMsg.textContent = "投稿权限已开启,可前往游戏、工作、生活、美食等页面发表文章";
        secretMsg.className = "secret-msg secret-msg-ok";
      } else {
        secretMsg.textContent = "密码错误";
        secretMsg.className = "secret-msg secret-msg-error";
      }
    });
  }

  var widgets = document.querySelectorAll("[data-section]");
  for (var i = 0; i < widgets.length; i++) {
    buildWidget(widgets[i]);
  }
})();
