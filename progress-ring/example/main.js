import RingProgressBar from './plugin/RingProgressBar.js'

globalThis.onload = () => {
    let musicPlayer = new MusicPlayer(document.querySelector('.music-root'));
    // 修改这里
    musicPlayer.loadMusic('./xxx.mp3');
}

/* 播放器类 */
class MusicPlayer {
    /* 组件 */
    /** @type {HTMLElement} 根容器 */
    target;
    /** @type {MessageChannel} 隧道 */
    #chanel;
    #ring;  // 进度条
    playMainBtn; // 播放按钮

    /* WebAudio 部分 */
    /** @type {AudioContext} webAudio上下文 */
    #audioContent;
    #sourceNode;   // 音源
    #analyserNode; // 分析处理器
    #sourceBuffer; // buffer流

    /* 实时参数 */
    #frame = 0;  // 帧
    #spectrumItemCount = 128; // 频谱条个数
    #scannerItem = 0; // 当前扫描的位置

    /* 状态 */
    #isInitial = false; // 是否初始化容器
    #isLoad = false; // 是否加载完成
    #isWaiting = false;// 是否在等待播放

    constructor(target) {
        this.target = target;
        this.spectrumItemContent = [];
        // 生成频谱条
        let fragment = document.createDocumentFragment();
        for (let i = 0, obj; i < this.#spectrumItemCount; i++) {
            obj = document.createElement('div');
            obj.classList.add('spectrum-item');
            obj.setAttribute('style', `--i: ${i};`);
            this.spectrumItemContent.push(obj);
            fragment.appendChild(obj);
        }
        target.querySelector('.spectrum').appendChild(fragment);
        // 创建进度条
        this.#ring = new RingProgressBar(document.querySelector('#ring-progress-1'), 190, 5);
        /* 初始化WebAudio设置 */
        this.playMainBtn = target.querySelector('.panel-btn-main');
        this.playMainBtn.setAttribute('data-playing', 'false');
        // 为播放暂停按钮添加事件监听
        this.playMainBtn = target.querySelector('.panel-btn-main');
        this.playMainBtn.onclick = e => {
            if (!this.#isInitial) {
                this.#initContext(this.playOrStop.bind(this, e));
            } else this.playOrStop(e);
        };
        // 进度条位置变化，更新跳转
        window.addEventListener('progressUpdate', e => {
            if (!this.#isInitial) {
                return;
            }
            this.jump(e.detail.percentage);
        });
        // 完成监听
        window.addEventListener('progressComplete', e => {
            if (e.detail.complete) {
                this.playingComplete();
            }
        }, false);
        // 初始化隧道
        this.#chanel = new MessageChannel();
        this.#chanel.port2.onmessage = this.timerCallback;
        this.#chanel.port1.postMessage(null);
    }

    /* 时钟回调函数 */
    timerCallback = () => {
        let playing = this.playMainBtn.dataset.playing;
        /* 检测状态 */
        if (playing === 'true') {
            let currentTime = this.#audioContent.currentTime - this.#sourceNode.breakTime;
            // 更新进度
            let progress = (currentTime + this.#sourceNode.startTime) / this.#sourceNode.buffer.duration;
            this.#ring.setProgress(progress);
            // 获取频谱
            let freqByteData = new Uint8Array(this.#analyserNode.frequencyBinCount);
            this.#analyserNode.getByteFrequencyData(freqByteData);
            // 将数据显示到频谱条
            if (this.#frame % 4 === 0) {
                let index = this.#scannerItem;
                let item = this.target.querySelector('.spectrum').childNodes[index];
                item.style.width = freqByteData[index + 50] + 'px';
                if (index >= this.#spectrumItemCount - 1) {
                    this.#scannerItem = 0;
                } else {
                    this.#scannerItem += 1;
                }
            }
        }
        /* 重置帧 */
        if (++this.#frame === this.#spectrumItemCount) {
            this.#frame = 0;
        }

        Promise.resolve().then(() => this.#chanel.port1.postMessage(null));
    }

    #initContext = callback => {
        /* 创建WebAudio长下文 **/
        this.#audioContent = new AudioContext();

        // 将arrayBuffer转音频audio buffer
        this.#audioContent.decodeAudioData(this.#sourceBuffer, buffer => {
            let analyser = this.#analyserNode = this.#audioContent.createAnalyser(), // 波形分析器
                sourceNode = this.#sourceNode = this.#audioContent.createBufferSource(); // 源处理器
            // 连接资源文件
            sourceNode.buffer = buffer;
            // 连接源处理器和波形分析器
            sourceNode.connect(analyser);
            // 确定FFT频域大小
            analyser.fftSize = 1024;
            // FFT结果插值
            analyser.smoothingTimeConstant = .6;
            // 连接到destination
            analyser.connect(this.#audioContent.destination);
            this.#isInitial = true;

            callback instanceof Function === true && callback();
        });
    }

    /* 加载歌曲 */
    loadMusic = src => {
        this.#isLoad = false;
        /* fetch 请求数据 */
        fetch(src, {
            method: "get",
            responseType: 'arraybuffer'
        }).then(response => {
            if (response.status === 200 || response.status === 304) {
                response.arrayBuffer().then(res => {
                    this.#sourceBuffer = res;
                    this.#isLoad = true;
                    this.#isWaiting && this.#play();
                });
            } else {
                console.log('%c 连接失效了!', 'color: red;');
            }
        });
        // 清理原来的缓存
        if (this.#sourceNode) {
            this.#stop();
            this.#sourceNode = null;
            this.#analyserNode = null;
        }
    }

    /* 播放完成 */
    playingComplete = e => {
        this.jump(0);
        this.#stop();
    }

    /* 按钮播放，暂停 */
    playOrStop = e => {
        e.stopPropagation();
        // 获取播放状态
        let state = this.#audioContent.state;
        if (state === 'suspended') {
            this.#audioContent.resume();
        }
        if (this.playMainBtn.dataset.playing === 'false') {
            this.#play();
        } else if (this.playMainBtn.dataset.playing === 'true') {
            this.#pause();
        }
    }


    /* 跳转 */
    jump = percentage => {
        let duration = this.#sourceNode.buffer.duration;
        // 停止
        this.#stop();
        let sourceNode = this.#audioContent.createBufferSource(); // 创建新的源处理器
        // 重新获取音源
        sourceNode.buffer = this.#sourceNode.buffer;
        // 连接新的音源到分析器
        sourceNode.connect(this.#analyserNode);
        this.#sourceNode = sourceNode;
        // 记录计时器
        sourceNode.breakTime = this.#audioContent.currentTime;// 记录断点时间
        sourceNode.startTime = duration * percentage;// 记录起始时间
        // 重新start
        sourceNode.start(this.#audioContent.currentTime, duration * percentage);
        this.#play();
    }

    /* 播放 */
    #play = () => {
        if (this.#isLoad === false) {
            return this.#isWaiting = true;
        } else {
            this.#isWaiting = false;
        }
        let element = this.playMainBtn;
        // 播放
        if (this.#audioContent.state === 'suspended') {
            this.#audioContent.resume();
        } else {
            try {
                this.#sourceNode.start(0);
            } catch {
                this.jump(0);
                this.#audioContent.resume();
            }
            // 初始化记录
            this.#sourceNode.breakTime = this.#audioContent.currentTime;// 记录断点时间
            this.#sourceNode.startTime = 0;// 记录起始时间
        }
        // 更换图标
        element.src = './svg/pause.svg';
        this.playMainBtn.dataset.playing = 'true';
    }

    /* 暂停 */
    #pause = () => {
        let element = this.playMainBtn;
        // 暂停
        this.#audioContent.suspend();
        // 更换图标
        element.src = './svg/play.svg';
        this.playMainBtn.dataset.playing = 'false';
    }

    /* 停止 */
    #stop = () => {
        this.#pause();
        this.#sourceNode.stop(0);
    }
}
