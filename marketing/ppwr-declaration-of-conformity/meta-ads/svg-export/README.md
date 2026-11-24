# 文字を編集できるSVGに書き出す

広告のHTML（cr*.html）から、文字を`<text>`のまま残したSVGを作る。図形・グラデーション・影はベクター、写真や資料の画像は埋め込み。

```bash
cd marketing/ppwr-declaration-of-conformity/meta-ads
node svg-export/extract.mjs "$PWD/cr2.html" /tmp/cr2.json      # 配置・文字・色をHTMLから読み取る
python3 svg-export/build.py /tmp/cr2.json "$PWD" out-cr2.svg     # SVGを組み立てる
```

- 文字のフォントは「Noto Sans JP」を指定している。開く端末に入っていないと、別のゴシック体に置き換わる。
- 対応しているCSSは、このフォルダの広告で使っているもの（単色・線形・円形グラデーション、角丸、影、回転、枠線、インラインSVG）だけ。
