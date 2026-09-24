/* =========================================================
   哔哩哔哩宣传页 · 交互脚本
   - 弹幕引擎（开场 / 播放器 / 片尾三块舞台）+ 全局弹幕开关
   - 底部播放器：滚动 = 播放进度，分 P 章节、高能进度条、自动播放
   - 一键三连、编年史横向滚动、数字滚动、滚动出现
   ========================================================= */
(function () {
    'use strict';

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
    var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(pointer: fine)').matches;

    var TOTAL = 320; // 整页当成一支 05:20 的视频
    function fmt(sec) {
        sec = Math.round(sec);
        return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    }

    /* ---------------- 弹幕文案 ---------------- */
    var HERO_DM = ['前方高能预警！', '哈哈哈哈哈哈', '爷青回', 'awsl', '下次一定', '泪目了', '名场面打卡',
        '火钳刘明', '太强了吧！！', '一键三连了', 'UP 主好人一生平安', '2333333', '来了来了', '催更！催更！',
        '这就是 B 站吗', '我哭死', '多谢款待', '开幕雷击', '弹幕护体', '前排围观', '好家伙', '有被可爱到',
        '学到了学到了', '三刷了', '考研人来了', '打卡第 100 天', '从初中看到现在'];
    var SCENE_DM = ['名场面！！', '我哭死', '等了十二集', '这 BGM 绝了', '泪目', '啊啊啊啊啊', '截图了截图了',
        '这就是青春吧', '全体起立', '刀子来了', '空降成功', '回头看的那一眼……', '我不同意这个结局', '三刷打卡',
        '弹幕护体', '前方高能'];
    var ENERGY_DM = ['前方高能！！', '高能高能', '全体起立', '啊啊啊啊啊啊', '名场面来了', '！！！！！'];
    var END_DM = ['干杯~', '(゜-゜)つロ 干杯', '三连了', '下次一定（不是）', '感谢 UP 主', '下个视频见',
        '已关注', '好家伙直接看完了', 'awsl', '再来一遍', '已投币', '收藏了'];

    function randCls() {
        var r = Math.random();
        var c = r < .55 ? '' : r < .7 ? 'c-pink' : r < .85 ? 'c-blue' : 'c-yellow';
        if (Math.random() < .12) c += ' big';
        return c;
    }

    function dmOn() { return !document.body.classList.contains('dm-off'); }

    /* ---------------- 弹幕引擎 ---------------- */
    function Stage(el, opts) {
        this.el = el;
        this.opts = Object.assign({ lane: 44, top: 0, bottom: 0, speed: [8, 13], avoid: [] }, opts || {});
        this.busy = [];
        this.visible = false;
        this.measure();
    }
    Stage.prototype.measure = function () {
        this.width = this.el.clientWidth;
        this.el.style.setProperty('--dist', this.width + 'px');
        var lane = typeof this.opts.lane === 'function' ? this.opts.lane(this.el) : this.opts.lane;
        this.laneH = lane;
        var h = this.el.clientHeight - this.opts.top - this.opts.bottom;
        this.n = Math.max(1, Math.floor(h / lane));
        // 防挡弹幕：和标题、按钮重叠的轨道不放弹幕
        var sr = this.el.getBoundingClientRect();
        var avoid = typeof this.opts.avoid === 'function' ? this.opts.avoid() : this.opts.avoid;
        var boxes = avoid.map(function (sel) { return $(sel); }).filter(Boolean).map(function (el) {
            var r = el.getBoundingClientRect();
            return [r.top - sr.top - 8, r.bottom - sr.top + 8];
        });
        this.allowed = [];
        for (var i = 0; i < this.n; i++) {
            var y0 = this.opts.top + i * lane, y1 = y0 + lane;
            var hit = boxes.some(function (b) { return y1 > b[0] && y0 < b[1]; });
            if (!hit) this.allowed.push(i);
        }
        if (!this.allowed.length) for (var j = 0; j < this.n; j++) this.allowed.push(j);
    };
    Stage.prototype.spawn = function (text, cls, opts) {
        if (reduced || !this.width) return null;
        opts = opts || {};
        var now = performance.now();
        var lane = opts.lane;
        if (lane == null) {
            var busy = this.busy;
            var free = this.allowed.filter(function (i) { return !busy[i] || busy[i] < now; });
            if (!free.length) return null; // 轨道都满了就先不发，避免叠在一起
            lane = pick(free);
        }
        var s = this.opts.speed;
        var dur = opts.dur || (s[0] + Math.random() * (s[1] - s[0]));
        var d = document.createElement('span');
        d.className = 'dm' + (cls ? ' ' + cls : '');
        d.textContent = text;
        d.style.top = (this.opts.top + lane * this.laneH) + 'px';
        d.style.setProperty('--dur', dur.toFixed(2) + 's');
        if (opts.delay) d.style.animationDelay = opts.delay + 's';
        d.addEventListener('animationend', function () { d.remove(); });
        this.el.appendChild(d);
        // 这条弹幕的尾巴离开右边缘之前，同一条轨道先不放新的
        var w = d.offsetWidth;
        this.busy[lane] = now + ((w + 40) / (this.width + w)) * dur * 1000 + (opts.delay > 0 ? opts.delay * 1000 : 0);
        return d;
    };
    Stage.prototype.run = function (list, every) {
        var self = this;
        (function tick() {
            if (self.visible && !document.hidden && dmOn()) self.spawn(pick(list), randCls());
            setTimeout(tick, every * (.6 + Math.random() * .8));
        })();
    };
    Stage.prototype.prefill = function (list, count) {
        for (var i = 0; i < count; i++) {
            var dur = this.opts.speed[0] + Math.random() * (this.opts.speed[1] - this.opts.speed[0]);
            this.spawn(pick(list), randCls(), { dur: dur, delay: -(Math.random() * dur * .75), lane: this.allowed[i % this.allowed.length] });
        }
    };

    var stages = [];
    function makeStage(el, opts) {
        if (!el) return null;
        var st = new Stage(el, opts);
        stages.push(st);
        new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { st.visible = e.isIntersecting; });
        }).observe(el.parentElement);
        return st;
    }

    var heroStage = makeStage($('#heroStage'), {
        lane: function () { return window.innerWidth < 760 ? 34 : 46; },
        top: 78, bottom: 78, speed: [9, 14], avoid: function () {
            return window.innerWidth < 900 ? ['.hero-visual', '.hero-title', '.hero-sub'] : ['.hero-title', '.hero-sub'];
        }
    });
    var sceneStage = makeStage($('#sceneStage'), {
        lane: function (el) { return clamp(el.clientHeight / 8.5, 22, 42); },
        top: 8, bottom: 44, speed: [6, 10]
    });
    var endStage = makeStage($('#endStage'), {
        lane: function () { return window.innerWidth < 760 ? 34 : 48; },
        top: 20, bottom: 20, speed: [8, 13], avoid: ['.cheers', '.end-title', '.end-ctas']
    });

    if (heroStage) { heroStage.prefill(HERO_DM, Math.min(heroStage.allowed.length * 2, 12)); heroStage.run(HERO_DM, 520); }
    if (sceneStage) { sceneStage.prefill(SCENE_DM, sceneStage.n); sceneStage.run(SCENE_DM, 420); }
    if (endStage) endStage.run(END_DM, 900);

    /* 片尾：进入时刷一波「干杯」 */
    var endBurstDone = false;
    var endEl = $('#end');
    if (endEl && endStage) {
        new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting || endBurstDone || !dmOn()) return;
                endBurstDone = true;
                for (var i = 0; i < 8; i++) {
                    (function (i) {
                        setTimeout(function () { endStage.spawn(pick(END_DM), randCls()); }, i * 220);
                    })(i);
                }
            });
        }, { threshold: .35 }).observe(endEl);
    }

    /* 播放器里的「前方高能预警」 */
    var banner = $('#energyBanner');
    if (banner && sceneStage && !reduced) {
        (function loop() {
            setTimeout(function () {
                if (sceneStage.visible && !document.hidden && dmOn()) {
                    banner.classList.add('show');
                    for (var i = 0; i < 9; i++) {
                        (function (i) {
                            setTimeout(function () { sceneStage.spawn(pick(ENERGY_DM), 'c-yellow' + (i % 3 ? '' : ' big'), { dur: 5 + Math.random() * 2 }); }, 300 + i * 120);
                        })(i);
                    }
                    setTimeout(function () { banner.classList.remove('show'); }, 2300);
                }
                loop();
            }, 8000 + Math.random() * 3000);
        })();
    }

    /* 开场：自己发弹幕 */
    var form = $('#dmForm');
    var input = $('#dmInput');
    if (form && heroStage) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var text = input.value.trim();
            if (!text) { input.focus(); input.placeholder = '先写点什么再发送吧～'; return; }
            if (!dmOn()) setDm(true);
            var upper = heroStage.allowed.filter(function (i) { return i < heroStage.n / 2; });
            heroStage.spawn(text, 'mine', { lane: pick(upper.length ? upper : heroStage.allowed), dur: 10 });
            input.value = '';
        });
    }

    /* 全局弹幕开关 */
    var dmToggles = $$('[data-dm-toggle]');
    function setDm(on) {
        document.body.classList.toggle('dm-off', !on);
        dmToggles.forEach(function (b) {
            b.setAttribute('aria-pressed', String(on));
            b.title = on ? '关闭弹幕' : '打开弹幕';
        });
    }
    dmToggles.forEach(function (b) { b.addEventListener('click', function () { setDm(!dmOn()); }); });

    /* ---------------- 小电视的眼睛跟着鼠标 ---------------- */
    var tv = $('#bigTv');
    var eyes = $('#tvEyes');
    if (tv && eyes && finePointer && !reduced) {
        var eyeRaf = 0;
        window.addEventListener('pointermove', function (e) {
            if (eyeRaf) return;
            eyeRaf = requestAnimationFrame(function () {
                eyeRaf = 0;
                var r = tv.getBoundingClientRect();
                if (r.bottom < 0 || r.top > window.innerHeight) return;
                var dx = e.clientX - (r.left + r.width / 2);
                var dy = e.clientY - (r.top + r.height / 2);
                var len = Math.hypot(dx, dy) || 1;
                var k = Math.min(1, len / 400);
                eyes.style.transform = 'translate(' + (dx / len * 9 * k).toFixed(1) + 'px,' + (dy / len * 6 * k).toFixed(1) + 'px)';
            });
        }, { passive: true });
    }

    /* ---------------- 滚动出现 ---------------- */
    var rvEls = $$('.rv');
    rvEls.forEach(function (el) {
        var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains('rv'); });
        var i = sibs.indexOf(el);
        if (i > 0) el.style.setProperty('--d', Math.min(i * .08, .48) + 's');
    });
    if (reduced || !('IntersectionObserver' in window)) {
        rvEls.forEach(function (el) { el.classList.add('in'); });
    } else {
        var rvObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add('in'); rvObs.unobserve(e.target); }
            });
        }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
        rvEls.forEach(function (el) { rvObs.observe(el); });
    }

    /* ---------------- 数字滚动 ---------------- */
    var dataGrid = $('#dataGrid');
    if (dataGrid) {
        var countUp = function () {
            $$('[data-count]', dataGrid).forEach(function (el) {
                var raw = el.getAttribute('data-count');
                var target = parseFloat(raw);
                var dec = raw.indexOf('.') > -1 ? raw.split('.')[1].length : 0;
                if (reduced) { el.textContent = target.toFixed(dec); return; }
                var t0 = performance.now();
                (function tick(t) {
                    var p = Math.min(1, (t - t0) / 1600);
                    el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
                    if (p < 1) requestAnimationFrame(tick);
                })(t0);
            });
        };
        new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (e) { if (e.isIntersecting) { countUp(); obs.disconnect(); } });
        }, { threshold: .35 }).observe(dataGrid);
    }

    /* ---------------- 一键三连 ---------------- */
    var actions = $('#actions');
    var card = $('#videoCard');
    var toast = $('#toast');
    var toastTimer = 0;

    function setOn(btn, on) {
        if (!btn || btn.classList.contains('on') === on) return;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', String(on));
        var n = $('.n', btn);
        n.textContent = parseInt(n.textContent, 10) + (on ? 1 : -1);
    }
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2400);
    }
    function burst(fromEl, emojis, count) {
        if (reduced) return;
        var cr = card.getBoundingClientRect();
        var r = fromEl.getBoundingClientRect();
        var x = r.left + r.width / 2 - cr.left;
        var y = r.top + r.height / 2 - cr.top;
        for (var i = 0; i < count; i++) {
            var p = document.createElement('span');
            p.className = 'particle';
            p.textContent = pick(emojis);
            var ang = Math.random() * Math.PI * 2;
            var dist = 70 + Math.random() * 110;
            p.style.setProperty('--x', x + 'px');
            p.style.setProperty('--y', y + 'px');
            p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
            p.style.setProperty('--dy', (Math.sin(ang) * dist - 30).toFixed(0) + 'px');
            p.style.setProperty('--rot', (Math.random() * 120 - 60).toFixed(0) + 'deg');
            p.addEventListener('animationend', function () { this.remove(); });
            card.appendChild(p);
        }
    }
    function triple() {
        ['like', 'coin', 'fav'].forEach(function (a) { setOn($('[data-act="' + a + '"]', actions), true); });
        burst(actions, ['👍', '🪙', '⭐', '💗', '✨'], 22);
        showToast('三连成功！UP 主感动到落泪 (´;ω;｀)');
    }

    if (actions) {
        var likeBtn = $('[data-act="like"]', actions);
        var pressTimer = 0;
        var fired = false;

        likeBtn.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            fired = false;
            actions.classList.add('charging');
            pressTimer = setTimeout(function () {
                fired = true;
                actions.classList.remove('charging');
                triple();
            }, 900);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
            likeBtn.addEventListener(ev, function () {
                clearTimeout(pressTimer);
                actions.classList.remove('charging');
            });
        });
        likeBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        $$('.act[data-act]', actions).forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn === likeBtn && fired) { fired = false; return; }
                var on = !btn.classList.contains('on');
                setOn(btn, on);
                if (on) burst(btn, btn.dataset.act === 'coin' ? ['🪙'] : btn.dataset.act === 'fav' ? ['⭐'] : ['👍'], 6);
            });
        });
        $('.act-share', actions).addEventListener('click', function () { showToast('链接已复制（演示效果）'); });
        $('#sanlianBtn').addEventListener('click', triple);
    }

    /* ---------------- 编年史：竖着滚，横着走 ---------------- */
    var tlPin = $('#tlPin');
    var tlTrack = $('#tlTrack');
    var mqMobile = window.matchMedia('(max-width: 760px)');
    var tlDist = 0;
    function layoutTimeline() {
        if (!tlPin) return;
        if (mqMobile.matches) {
            tlDist = 0;
            tlPin.style.height = '';
            tlTrack.style.transform = '';
            return;
        }
        tlDist = Math.max(0, tlTrack.scrollWidth - window.innerWidth);
        tlPin.style.height = (window.innerHeight + tlDist) + 'px';
    }
    function updateTimeline() {
        if (!tlDist) return;
        var p = clamp(-tlPin.getBoundingClientRect().top / tlDist, 0, 1);
        tlTrack.style.transform = 'translate3d(' + (-p * tlDist).toFixed(1) + 'px,0,0)';
    }

    /* ---------------- 底部播放器 ---------------- */
    var sections = $$('main > section');
    var segsEl = $('#pbSegs');
    var knob = $('#pbKnob');
    var bar = $('#pbBar');
    var tip = $('#pbTip');
    var curEl = $('#pbCur');
    var chapterEl = $('#pbChapter');
    var energyPath = $('#pbEnergy path');
    var navLinks = $$('.p-nav a');
    var topbar = $('#topbar');
    var chapters = [];

    function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
    function label(c) { return c.p === c.title ? c.title : c.p + ' ' + c.title; }

    function layoutPlayer() {
        var max = maxScroll();
        chapters = sections.map(function (el, i) {
            var top = el.getBoundingClientRect().top + window.scrollY;
            return { el: el, id: el.id, p: el.dataset.p, title: el.dataset.title,
                     start: i === 0 ? 0 : clamp((top - window.innerHeight * .35) / max, 0, 1) };
        });
        chapters.forEach(function (c, i) { c.end = i < chapters.length - 1 ? chapters[i + 1].start : 1; });

        segsEl.innerHTML = '';
        chapters.forEach(function (c) {
            var s = document.createElement('div');
            s.className = 'pb-seg';
            s.style.flex = Math.max(c.end - c.start, .002) + ' 1 0';
            var fill = document.createElement('i');
            s.appendChild(fill);
            segsEl.appendChild(s);
            c.seg = s;
            c.fill = fill;
        });

        $$('[data-timecode]').forEach(function (t) {
            var c = chapters.filter(function (x) { return x.id === t.getAttribute('data-timecode'); })[0];
            if (c) t.textContent = fmt(c.start * TOTAL);
        });
        $('#pbTotal').textContent = fmt(TOTAL);
        buildEnergy();
    }

    /* 高能进度条：弹幕多的章节波峰更高 */
    function buildEnergy() {
        if (!energyPath) return;
        var peaks = { hero: .75, danmaku: 1, zones: .45, up: .8, history: .4, data: .5, end: .95 };
        var pts = [];
        var N = 120;
        for (var i = 0; i <= N; i++) {
            var x = i / N;
            var v = .12 + .08 * Math.sin(i * 1.7) * Math.sin(i * .43);
            chapters.forEach(function (c) {
                var mid = (c.start + c.end) / 2;
                var w = Math.max((c.end - c.start) / 3, .02);
                v += (peaks[c.id] || .3) * .75 * Math.exp(-Math.pow((x - mid) / w, 2));
            });
            pts.push([x * 1000, 40 - clamp(v, 0, 1) * 38]);
        }
        var d = 'M0 40 L' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' L1000 40Z';
        energyPath.setAttribute('d', d);
    }

    function currentIndex(p) {
        var idx = 0;
        for (var i = 0; i < chapters.length; i++) if (p >= chapters[i].start - 1e-4) idx = i;
        return idx;
    }

    function updatePlayer() {
        if (!chapters.length) return;
        var p = clamp(window.scrollY / maxScroll(), 0, 1);
        var idx = currentIndex(p);
        chapters.forEach(function (c) {
            var f = c.end > c.start ? clamp((p - c.start) / (c.end - c.start), 0, 1) : (p >= c.end ? 1 : 0);
            c.fill.style.width = (f * 100) + '%';
        });
        var c = chapters[idx];
        var local = c.end > c.start ? clamp((p - c.start) / (c.end - c.start), 0, 1) : 1;
        knob.style.left = (c.seg.offsetLeft + local * c.seg.offsetWidth) + 'px';
        curEl.textContent = fmt(p * TOTAL);
        chapterEl.textContent = label(c);
        bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
        bar.setAttribute('aria-valuetext', fmt(p * TOTAL) + ' ' + label(c));
        navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === c.id); });
        topbar.classList.toggle('scrolled', window.scrollY > 20);
    }

    /* 把进度条上的横坐标换算成页面进度（考虑分段之间的缝） */
    function ratioAt(clientX) {
        for (var i = 0; i < chapters.length; i++) {
            var r = chapters[i].seg.getBoundingClientRect();
            if (clientX <= r.right + 1.5 || i === chapters.length - 1) {
                var f = r.width ? clamp((clientX - r.left) / r.width, 0, 1) : 0;
                return { p: chapters[i].start + f * (chapters[i].end - chapters[i].start), c: chapters[i] };
            }
        }
        return { p: 0, c: chapters[0] };
    }
    function seek(p) { window.scrollTo({ top: p * maxScroll(), behavior: reduced ? 'auto' : 'smooth' }); }

    bar.addEventListener('pointermove', function (e) {
        var hit = ratioAt(e.clientX);
        var br = bar.getBoundingClientRect();
        tip.textContent = label(hit.c) + ' · ' + fmt(hit.p * TOTAL);
        tip.style.left = clamp(e.clientX - br.left, 40, br.width - 40) + 'px';
    });
    bar.addEventListener('click', function (e) { setPlaying(false); seek(ratioAt(e.clientX).p); });
    bar.addEventListener('keydown', function (e) {
        var p = window.scrollY / maxScroll();
        var step = { ArrowRight: .03, ArrowUp: .03, ArrowLeft: -.03, ArrowDown: -.03 }[e.key];
        if (step) { e.preventDefault(); seek(clamp(p + step, 0, 1)); }
        if (e.key === 'Home') { e.preventDefault(); seek(0); }
        if (e.key === 'End') { e.preventDefault(); seek(1); }
    });

    /* 自动播放：点 ▶ 页面自己往下走，适合投屏 */
    var pbPlay = $('#pbPlay');
    var playing = false;
    var lastT = 0;
    var playRaf = 0;
    var carry = 0;
    var SPEED = 120; // 像素 / 秒
    function step(t) {
        if (!playing) return;
        var dt = lastT ? Math.min(64, t - lastT) : 16;
        lastT = t;
        carry += SPEED * dt / 1000;
        var px = Math.floor(carry);
        if (px >= 1) { window.scrollBy(0, px); carry -= px; }
        if (window.scrollY >= maxScroll() - 2) { setPlaying(false); return; }
        playRaf = requestAnimationFrame(step);
    }
    function setPlaying(v) {
        if (v === playing) return;
        playing = v;
        pbPlay.setAttribute('aria-pressed', String(v));
        pbPlay.setAttribute('aria-label', v ? '暂停' : '自动播放页面');
        if (v) {
            if (window.scrollY >= maxScroll() - 2) window.scrollTo(0, 0);
            lastT = 0; carry = 0;
            playRaf = requestAnimationFrame(step);
        } else {
            cancelAnimationFrame(playRaf);
        }
    }
    pbPlay.addEventListener('click', function () { setPlaying(!playing); });
    window.addEventListener('wheel', function () { setPlaying(false); }, { passive: true });
    window.addEventListener('touchstart', function (e) { if (!pbPlay.contains(e.target)) setPlaying(false); }, { passive: true });
    window.addEventListener('keydown', function (e) {
        var tag = (e.target.tagName || '').toLowerCase();
        var typing = tag === 'input' || tag === 'textarea' || tag === 'button' || e.target === bar;
        if (e.code === 'Space' && !typing) { e.preventDefault(); setPlaying(!playing); return; }
        if (!typing && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].indexOf(e.key) > -1) setPlaying(false);
    });

    /* 站内锚点平滑滚动 */
    $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('href');
            var target = id.length > 1 && document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            setPlaying(false);
            var top = target.getBoundingClientRect().top + window.scrollY - (id === '#hero' ? 0 : 10);
            window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
        });
    });

    /* ---------------- 滚动与尺寸变化 ---------------- */
    var ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            ticking = false;
            updateTimeline();
            updatePlayer();
        });
    }
    function relayout() {
        stages.forEach(function (s) { s.measure(); });
        layoutTimeline();
        layoutPlayer();
        updateTimeline();
        updatePlayer();
    }
    var resizeTimer = 0;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 150); });
    window.addEventListener('load', function () { relayout(); setTimeout(relayout, 1000); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    relayout();
})();
