/**
 * @file 环形可拖拽进度条
 * @author Static-Papaya
 * @time 2022.4.12.
 */
/**
 * 环形可拖拽进度条主要类
 * @class
 */
class RingProgressBar {
    /** @type {SVGElement} 前景圆环 */
    #loading;
    /** @type {SVGElement} 小按钮 */
    #playBtn;
    /** @type {number} 百分比 */
    #percentage = 0;

    /**
     * @constructor
     * @param {SVGElement} target svg容器
     * @param {number} r 半径
     * @param {number} [strokeWidth=1] 圆环厚度
     */
    constructor(target, r, strokeWidth = 1) {
        let outCircle = target.querySelector('.loading-bg'),
            innerCircle = this.#loading = target.querySelector('.loading-ld');
        // 设置SVG画布宽高
        target.setAttribute('width', 2 * r + strokeWidth);
        target.setAttribute('height', 2 * r + strokeWidth);
        // 设置半径
        innerCircle.style.setProperty('stroke-dasharray', `calc(${Math.PI * 2 * r} * var(--loading)) ${Math.PI * 2 * r}`);
        // 圆环设置
        outCircle.setAttribute('r', this.r = r);
        innerCircle.setAttribute('r', r);
        // 设置路径边距
        outCircle.setAttribute('stroke-width', this.strokeWidth = strokeWidth);
        innerCircle.setAttribute('stroke-width', strokeWidth);
        // 添加进度条接触监听
        target.onmousedown = this.#callback;
        // 默认位置
        this.#redirect(0);
        // 配置按钮
        this.#loadPlayBtn(target.querySelector('.loading-play-btn'));
        // 添加拖动监听
        this.#playBtn.onmousedown = e => {
            e.stopPropagation();
            document.onmousemove = this.#callback;
            document.onmouseup = () => {
                document.onmousemove = null;
                document.onmouseup = null;
                return false;
            }
        };
        // 手机拖动监听
        this.#playBtn.ontouchstart = e => {
            e.stopPropagation();
            document.ontouchmove = this.#callback;
            document.ontouchend = document.ontouchcancel = () => {
                document.ontouchmove = null;
                document.ontouchend = null;
                document.ontouchcancel = null;
                return false;
            }
        }
    }

    /* 进度条位置更新 */
    #redirect = (location = 0) => this.#loading.style.setProperty('--loading', location);

    /**
     * 设置进度
     * @param {number} [percentage=0] 百分比，设置范围 0 ~ 1
     */
    setProgress = (percentage = 0) => {
        // 检测进度是否大于100%
        if (percentage >= 1) {
            percentage = 1;
            // 触发进度完成事件
            let event = new CustomEvent('progressComplete', {
                detail: { complete: true }
            });
            window.dispatchEvent(event);
        }
        // 更新进度位置
        this.#redirect(percentage);
        // 百分比转角度
        let angle = Math.PI * 2 * percentage,
            px = 0,
            py = this.r;
        // 求旋转后目标向量
        let x = px * Math.sin(angle) + py * Math.cos(angle) + this.r + .5 * this.strokeWidth,
            y = py * Math.sin(angle) - px * Math.cos(angle) + this.r + .5 * this.strokeWidth,
            r = this.r;
        px = x - r - .5 * this.strokeWidth,
            py = y - r - .5 * this.strokeWidth;
        let cLength = Math.sqrt(px ** 2 + py ** 2);
        // 求K值
        let K = r / cLength;
        let playBtnX = K * px + r + .5 * this.strokeWidth,
            playBtnY = K * py + r + .5 * this.strokeWidth;
        this.#playBtn.style.setProperty("cx", playBtnX);
        this.#playBtn.style.setProperty("cy", playBtnY);
    }

    /* 点击进度条响应方法 */
    #callback = e => {
        e.stopPropagation();
        let posX, posY;
        if (e instanceof TouchEvent) {
            const { x, y } = this.#loading.getBoundingClientRect();
            posX = e.changedTouches[0].pageX - x;
            posY = e.changedTouches[0].pageY - y;
        } else {
            posX = e.offsetX;
            posY = e.offsetY;
        }
        let r = this.r;
        // 检测触发位置是否在圆环上
        let px = posX - r - .5 * this.strokeWidth,
            py = posY - r - .5 * this.strokeWidth;
        let cLength = Math.sqrt(px ** 2 + py ** 2);
        let catchClick = Math.abs(this.r - cLength) < 0.5 * this.strokeWidth;
        if (catchClick || e.type === 'mousemove' || e.type === 'touchmove' ) {
            // 在环内，触碰有效
            // 计算夹角
            let c1 = Math.acos(py / cLength) * 180 / Math.PI;
            // 检测触碰点所属分区
            let belongBlock = px >= 0 ? py > 0 ? 0 : 3 : py > 0 ? 1 : 2;
            // 计算百分比
            let percentage = (belongBlock == 0 ? 90 - c1 : belongBlock == 3 ? 450 - c1 : 90 + c1) / 360;
            // 针对拖动最大间距检测
            if ((e.type === 'mousemove' || e.type === 'touchmove') && Math.abs(this.#percentage - percentage) > .5) {
                return;
            }
            // 触发位置调整事件
            let event = new CustomEvent('progressUpdate', {
                detail: { percentage: percentage }
            });
            window.dispatchEvent(event);
            // 写入进度
            this.#percentage = percentage;
            // 更新位置
            this.#redirect(percentage);
            // 求K值
            let K = r / cLength;
            let playBtnX = K * px + this.r + .5 * this.strokeWidth,
                playBtnY = K * py + this.r + .5 * this.strokeWidth;
            this.#playBtn.style.setProperty("cx", playBtnX);
            this.#playBtn.style.setProperty("cy", playBtnY);
        }
    }

    /* 加载拖动按钮 */
    #loadPlayBtn = playButton => {
        this.#playBtn = playButton;
        let r = this.strokeWidth * .6;
        // 设置按钮半径
        playButton.style.setProperty('r', r);
        // 重新定位
        playButton.style.setProperty('cx', 2 * this.r + r);
        playButton.style.setProperty('cy', this.r + r);
    }

    /**
     * 获取当前进度
     * @returns {number} 返回0 ~ 1百分比.
     */
    getPercentage = () => this.#percentage;
}

export default RingProgressBar;
