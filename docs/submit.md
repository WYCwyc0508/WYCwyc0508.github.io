# 投稿

在这里可以直接从手机发布图文到本站博客。提交后约 1~2 分钟自动上线。

<div id="submit-form-wrap">
  <form id="submit-form" class="submit-form">
    <label for="submit-password">密码</label>
    <input type="password" id="submit-password" placeholder="请输入投稿密码" autocomplete="off">

    <label for="submit-title">标题</label>
    <input type="text" id="submit-title" placeholder="给这篇文章起个标题" maxlength="60">

    <label for="submit-body">正文</label>
    <textarea id="submit-body" rows="10" placeholder="写点什么吧……支持 Markdown 语法"></textarea>

    <label for="submit-files">图片(可选,最多 5 张,自动压缩)</label>
    <input type="file" id="submit-files" accept="image/*" multiple>

    <button type="submit" id="submit-btn">发布</button>
    <div id="submit-status" class="submit-status"></div>
  </form>
</div>

<script src="/submit.js" defer></script>
