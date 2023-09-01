# 可交互环形进度条
---  

功能：环形进度显示，可拖动，可跳转。
运行：vsCode使用Live Server运行index.html即可查看效果。

# 如何使用
1. 需要以下代码进行复制到您的html中。
```html
  <svg id="XXX" class="loading" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景环 -->
      <circle class="loading-bg" cx="50%" cy="50%" />
      <!-- 前景环 -->
      <circle class="loading-ld" cx="50%" cy="50%" />
      <!-- 小按钮 -->
      <circle class="loading-play-btn" />
  </svg>
```

2. 引入RingProgressBar.js
```js
  import RingProgressBar from './RingProgressBar.js';
```

3.创建RingProgressBar对象
```js
  /* 后面两个参数分别为半径长度，环的宽度 */
  let ring = new RingProgressBar(document.querySelector('#XXX'), 80, 8);
```

4.如果要修改样式则可以参考index.html中的style以及RingProgressBar.css文件进行修改。

# 示例项目
和前面一样，vsCode使用Live Server运行index.html即可查看效果。该项目为一个带有示波器的音乐播放器，主要使用WebAudio实现，如果要更换音频，可以修改main.js中的`musicPlayer.loadMusic('./champions.mp3');`中的地址。
