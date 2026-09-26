/* =========================================================
   哔哩哔哩宣传页 · 交互脚本
   - 弹幕引擎（开场 / 片尾两块舞台，可选颜色和顶部 / 底部弹幕）
   - P1 名场面播放器、P3 能点开的互动视频（播放器本体在 player.js）
   - 底部播放器：滚动 = 播放进度，分 P 章节、高能进度条、自动播放、倍速
   - 一键三连（卡片和视频页共用状态）、戳小电视、分区骰子、
     编年史横向滚动 + 年份导航、实时播放量、片尾给这一页三连
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
    var END_DM = ['干杯~', '(゜-゜)つロ 干杯', '三连了', '下次一定（不是）', '感谢 UP 主', '下个视频见',
        '已关注', '好家伙直接看完了', 'awsl', '再来一遍', '已投币', '收藏了'];

    function randCls() {
        var r = Math.random();
        var c = r < .55 ? '' : r < .7 ? 'c-pink' : r < .85 ? 'c-blue' : 'c-yellow';
        if (Math.random() < .12) c += ' big';
        return c;
    }

    var BP = window.BP || {};
    var dmOn = BP.dmOn || function () { return true; };
    var setDm = BP.setDm || function () {};

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
    // 顶部 / 底部弹幕：水平居中停 4 秒，一行一条
    Stage.prototype.spawnFixed = function (text, cls, where) {
        if (reduced || !this.width) return null;
        var now = performance.now();
        var rows = where === 'top' ? (this.topRows = this.topRows || []) : (this.bottomRows = this.bottomRows || []);
        var n = Math.max(1, Math.floor(this.n / 3)), r = 0;
        while (r < n && rows[r] > now) r++;
        if (r >= n) r = 0;
        rows[r] = now + 4000;
        var d = document.createElement('span');
        d.className = 'dm fixed' + (cls ? ' ' + cls : '');
        d.textContent = text;
        d.style.top = (where === 'top' ? this.opts.top + r * this.laneH : this.el.clientHeight - this.opts.bottom - (r + 1) * this.laneH) + 'px';
        d.addEventListener('animationend', function () { d.remove(); });
        this.el.appendChild(d);
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
    var endStage = makeStage($('#endStage'), {
        lane: function () { return window.innerWidth < 760 ? 34 : 48; },
        top: 20, bottom: 20, speed: [8, 13], avoid: ['.cheers', '.end-title', '.end-ctas', '.end-sanlian']
    });

    if (heroStage) { heroStage.prefill(HERO_DM, Math.min(heroStage.allowed.length * 2, 12)); heroStage.run(HERO_DM, 520); }
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

    /* ---------------- P1：真的能播的名场面 ---------------- */
    var summerMount = $('#summerPlayer');
    var summer = null;
    if (summerMount && BP.Player && BP.films.summer) {
        summer = new BP.Player(summerMount, BP.films.summer, {
            loop: true, send: true, muted: true, volume: .6,
            placeholder: '发条弹幕，它会钉在这一秒'
        });
        // 滚到这里就静音自动播放，离开就暂停；用户自己按过暂停就不再自动播
        if (!reduced && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting && e.intersectionRatio >= .5) {
                        if (!summer.userPaused && !document.documentElement.classList.contains('modal-open')) summer.play({ auto: true });
                    } else if (summer.playing) {
                        summer.pause({ auto: true });
                    }
                });
            }, { threshold: [0, .5, .8] }).observe(summerMount);
        }
        var summerClear = $('#summerClear');
        var syncClear = function () { if (summerClear) summerClear.hidden = !summer.mine.length; };
        summer.on('dm', syncClear);
        syncClear();
        if (summerClear) summerClear.addEventListener('click', function () { summer.clearMine(); summer.toast('已清空你发的弹幕'); });
    }

    /* 开场：自己发弹幕（可以选颜色和位置，和 B 站一样） */
    var form = $('#dmForm');
    var input = $('#dmInput');
    var styleBtn = $('#dmStyleBtn');
    var stylePanel = $('#dmStyle');
    var dmColor = '', dmMode = 'scroll';
    function toggleStyle(open) {
        if (!stylePanel) return;
        stylePanel.hidden = !open;
        styleBtn.setAttribute('aria-expanded', String(open));
    }
    if (styleBtn && stylePanel) {
        styleBtn.addEventListener('click', function () { toggleStyle(stylePanel.hidden); });
        stylePanel.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            var group = b.parentElement;
            $$('button', group).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
            if (b.hasAttribute('data-color')) dmColor = b.getAttribute('data-color');
            if (b.hasAttribute('data-mode')) dmMode = b.getAttribute('data-mode');
            styleBtn.className = 'dm-send-badge' + (dmColor ? ' ' + dmColor : '') + (dmMode !== 'scroll' ? ' m-' + dmMode : '');
            styleBtn.textContent = dmMode === 'top' ? '顶' : dmMode === 'bottom' ? '底' : '弹';
        });
        document.addEventListener('click', function (e) { if (!form.contains(e.target)) toggleStyle(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggleStyle(false); });
    }
    if (form && heroStage) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var text = input.value.trim();
            if (!text) { input.focus(); input.placeholder = '先写点什么再发送吧～'; return; }
            if (!dmOn()) setDm(true);
            var cls = 'mine' + (dmColor ? ' ' + dmColor : '');
            if (dmMode === 'scroll') {
                var upper = heroStage.allowed.filter(function (i) { return i < heroStage.n / 2; });
                heroStage.spawn(text, cls, { lane: pick(upper.length ? upper : heroStage.allowed), dur: 10 });
            } else {
                heroStage.spawnFixed(text, cls, dmMode);
            }
            input.value = '';
            toggleStyle(false);
        });
    }

    /* 戳一下小电视 */
    var bigTv = $('#bigTv');
    var tvSay = $('#tvSay');
    var POKE = ['干杯！(゜-゜)つロ', '欢迎来到 B 站～', '诶嘿，被你发现了', '再戳就要投币了哦', '别、别戳啦 (/ω＼)',
        '……你是不是很闲 (￣▽￣)', '告诉你个秘密：往下滑，视频真的能播', '好吧，你赢了，给你三连 👍🪙⭐'];
    var pokes = 0, pokeT = 0, sayT = 0;
    if (bigTv && tvSay) {
        bigTv.addEventListener('click', function () {
            var line = POKE[Math.min(pokes, POKE.length - 1)];
            pokes++;
            bigTv.classList.remove('poked');
            void bigTv.getBoundingClientRect();
            bigTv.classList.add('poked');
            bigTv.classList.toggle('shy', pokes >= 4);
            clearTimeout(pokeT);
            pokeT = setTimeout(function () { bigTv.classList.remove('poked'); }, 600);
            tvSay.textContent = line;
            tvSay.classList.add('show');
            clearTimeout(sayT);
            sayT = setTimeout(function () { tvSay.classList.remove('show'); }, 1800);
            if (heroStage && dmOn()) heroStage.spawn(pokes >= 5 ? '小电视被戳了 ' + pokes + ' 下' : '戳了戳小电视', 'c-blue');
        });
    }

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

    /* ---------------- P2：分区贴纸（点一张，或者让骰子帮你选） ---------------- */
    var zones = $$('.zone');
    var zoneResult = $('#zoneResult');
    var dice = $('#zoneDice');
    function zoneInfo(z) { return { emoji: $('.z-emoji', z).textContent, name: $('h3', z).textContent, desc: $('p', z).textContent }; }
    function emojiBurst(host, emoji, count) {
        if (reduced) return;
        var r = host.getBoundingClientRect();
        for (var i = 0; i < count; i++) {
            var p = document.createElement('span');
            p.className = 'particle';
            p.textContent = emoji;
            var ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 90;
            p.style.setProperty('--x', r.width / 2 + 'px');
            p.style.setProperty('--y', r.height / 2 + 'px');
            p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
            p.style.setProperty('--dy', (Math.sin(ang) * dist - 30).toFixed(0) + 'px');
            p.style.setProperty('--rot', (Math.random() * 120 - 60).toFixed(0) + 'deg');
            p.addEventListener('animationend', function () { this.remove(); });
            host.appendChild(p);
        }
    }
    function pickZone(z) {
        zones.forEach(function (x) { x.classList.remove('lit', 'picked'); });
        z.classList.add('lit');
        void z.offsetWidth;
        z.classList.add('picked');
        var info = zoneInfo(z);
        emojiBurst(z, info.emoji, 10);
        if (!zoneResult) return;
        zoneResult.textContent = '今天就看';
        var b = document.createElement('b');
        b.textContent = '「' + info.name + '」';
        var a = document.createElement('a');
        a.href = 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(info.name);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = '去 B 站看看 ↗';
        zoneResult.appendChild(b);
        zoneResult.appendChild(document.createTextNode('吧：' + info.desc));
        zoneResult.appendChild(a);
    }
    zones.forEach(function (z) {
        var info = zoneInfo(z);
        z.setAttribute('role', 'button');
        z.tabIndex = 0;
        z.setAttribute('aria-label', info.name + '：' + info.desc);
        z.addEventListener('click', function () { pickZone(z); });
        z.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickZone(z); }
        });
        if (!finePointer || reduced) return;
        // 鼠标在贴纸上移动时，贴纸跟着微微倾斜
        z.addEventListener('pointermove', function (e) {
            var r = z.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
            z.style.setProperty('--rx', (-y * 16).toFixed(1) + 'deg');
            z.style.setProperty('--ry', (x * 16).toFixed(1) + 'deg');
        });
        z.addEventListener('pointerleave', function () { z.style.removeProperty('--rx'); z.style.removeProperty('--ry'); });
    });
    if (dice && zones.length) {
        dice.addEventListener('click', function () {
            if (dice.disabled) return;
            if (reduced) { pickZone(pick(zones)); return; }
            dice.disabled = true;
            zoneResult.textContent = '转呀转……';
            var steps = 14 + Math.floor(Math.random() * 5), i = 0, cur = -1, delay = 50;
            (function step() {
                var next;
                do { next = Math.floor(Math.random() * zones.length); } while (next === cur);
                if (cur >= 0) zones[cur].classList.remove('lit');
                cur = next;
                zones[cur].classList.add('lit');
                if (++i < steps) { delay *= 1.12; setTimeout(step, delay); }
                else { pickZone(zones[cur]); dice.disabled = false; }
            })();
        });
    }

    /* ---------------- P5：实时播放量估算 ---------------- */
    var liveEl = $('#liveCount'), lcTime = $('#lcTime'), lcNum = $('#lcNum');
    if (liveEl && lcTime && lcNum) {
        var lcStart = Date.now(), PER_SEC = 4.1e9 / 86400, lcOn = false;
        new IntersectionObserver(function (entries) { entries.forEach(function (e) { lcOn = e.isIntersecting; }); }).observe(liveEl);
        setInterval(function () {
            if (!lcOn || document.hidden) return;
            var s = (Date.now() - lcStart) / 1000;
            lcTime.textContent = fmt(Math.floor(s));
            lcNum.textContent = Math.floor(s * PER_SEC).toLocaleString('zh-CN');
        }, 100);
    }

    /* ---------------- 片尾：给这一页三连、干杯 ---------------- */
    var endActs = $('#endActs'), endThanks = $('#endThanks'), cheersBtn = $('#cheersBtn');
    function endFlood(list, n) {
        if (!endStage) return;
        if (!dmOn()) setDm(true);
        for (var i = 0; i < n; i++) {
            (function (i) { setTimeout(function () { endStage.spawn(pick(list), 'c-yellow' + (i % 3 ? '' : ' big')); }, i * 130); })(i);
        }
    }
    if (endActs) {
        var pageState = { like: false, coin: false, fav: false };
        var pageBtns = $$('[data-page-act]', endActs);
        var pageAll = function () { return pageState.like && pageState.coin && pageState.fav; };
        var paintPage = function () {
            pageBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(pageState[b.getAttribute('data-page-act')])); });
        };
        var celebrate = function (already) {
            endThanks.textContent = already ? '已经三连过啦，谢谢你 (´▽`ʃ♡ƪ)' : '三连成功！做这一页的同学收到了 (´;ω;｀)';
            endFlood(['三连了！', '已三连', '一键三连！', '感谢 UP 主', '下次还来', '好评！'], 10);
        };
        var pagePress = 0, pageFired = false, likeB = $('[data-page-act="like"]', endActs);
        likeB.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            pageFired = false;
            pagePress = setTimeout(function () {
                pageFired = true;
                var already = pageAll();
                pageState.like = pageState.coin = pageState.fav = true;
                paintPage();
                celebrate(already);
            }, 900);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { likeB.addEventListener(ev, function () { clearTimeout(pagePress); }); });
        likeB.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        pageBtns.forEach(function (b) {
            b.addEventListener('click', function () {
                if (b === likeB && pageFired) { pageFired = false; return; }
                var a = b.getAttribute('data-page-act');
                pageState[a] = !pageState[a];
                paintPage();
                if (pageAll()) celebrate(false);
                else if (pageState[a]) endThanks.textContent = { like: '点赞 +1，谢谢！', coin: '投币成功，硬币 -1 (＞﹏＜)', fav: '收藏了，下次还能找到这一页' }[a] + '（长按点赞可以一键三连）';
                else endThanks.textContent = '';
            });
        });
    }
    if (cheersBtn) {
        cheersBtn.addEventListener('click', function () {
            cheersBtn.classList.remove('clink');
            void cheersBtn.offsetWidth;
            cheersBtn.classList.add('clink');
            endFlood(['干杯~', '(゜-゜)つロ 干杯', '干杯！！', 'Cheers~', '干了这杯弹幕'], 6);
        });
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

    /* ---------------- 一键三连（卡片和视频页共用一份状态） ---------------- */
    var BASE = { like: 2333, coin: 666, fav: 520 };
    var upState = { like: false, coin: false, fav: false, follow: false };
    var rows = [];
    var onTriple = [];

    function isTriple() { return upState.like && upState.coin && upState.fav; }
    function paintRows() {
        rows.forEach(function (r) {
            ['like', 'coin', 'fav'].forEach(function (a) {
                var btn = $('[data-act="' + a + '"]', r.el), on = upState[a];
                btn.classList.toggle('on', on);
                btn.setAttribute('aria-pressed', String(on));
                $('.n', btn).textContent = BASE[a] + (on ? 1 : 0);
            });
        });
    }
    function burst(row, fromEl, emojis, count) {
        if (reduced) return;
        var cr = row.host.getBoundingClientRect();
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
            row.host.appendChild(p);
        }
    }
    function triple(row, quiet) {
        var already = isTriple();
        ['like', 'coin', 'fav'].forEach(function (a) { upState[a] = true; });
        paintRows();
        if (row) {
            burst(row, row.el, ['👍', '🪙', '⭐', '💗', '✨'], 22);
            if (!quiet) row.toast(already ? '已经三连过啦，UP 主记住你了 (｡･ω･｡)' : '三连成功！UP 主感动到落泪 (´;ω;｀)');
        }
        onTriple.forEach(function (fn) { fn(); });
    }
    function bindActions(el, host, toastEl) {
        var toastTimer = 0;
        var row = {
            el: el, host: host,
            toast: function (msg) {
                if (!toastEl) return;
                toastEl.textContent = msg;
                toastEl.classList.add('show');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
            }
        };
        rows.push(row);
        var likeBtn = $('[data-act="like"]', el);
        var pressTimer = 0;
        var fired = false;
        // 长按点赞 = 一键三连
        likeBtn.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            fired = false;
            el.classList.add('charging');
            pressTimer = setTimeout(function () {
                fired = true;
                el.classList.remove('charging');
                triple(row);
            }, 900);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
            likeBtn.addEventListener(ev, function () {
                clearTimeout(pressTimer);
                el.classList.remove('charging');
            });
        });
        likeBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        $$('.act[data-act]', el).forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn === likeBtn && fired) { fired = false; return; }
                var a = btn.getAttribute('data-act'), on = !upState[a];
                upState[a] = on;
                paintRows();
                if (on) burst(row, btn, a === 'coin' ? ['🪙'] : a === 'fav' ? ['⭐'] : ['👍'], 6);
                if (isTriple()) onTriple.forEach(function (fn) { fn(); });
            });
        });
        $('.act-share', el).addEventListener('click', function () {
            var url = location.href.split('#')[0] + '#up';
            var ok = function () { row.toast('链接已复制，快去分享给朋友吧 ✨'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { row.toast('复制失败，手动复制地址栏吧'); });
            else row.toast('复制失败，手动复制地址栏吧');
        });
        return row;
    }
    var card = $('#videoCard');
    var cardRow = card ? bindActions($('[data-actions]', card), card, $('[data-toast]', card)) : null;
    $$('[data-sanlian]').forEach(function (b) { b.addEventListener('click', function () { triple(cardRow); }); });

    /* ---------------- P3：卡片里的视频真的能点开 ---------------- */
    var U = BP.U;
    var film2 = BP.films && BP.films.upload;
    var vpage = $('#vpage');
    var coverBtn = $('#coverBtn');
    var coverCanvas = $('#coverCanvas');
    var coverScrub = $('#coverScrub');
    var dmListEl = $('#vpDmList');
    var chListEl = $('#vpChapters');
    var vplayer = null, modalRow = null, lastFocus = null, autoChooseT = 0;
    var FANS = 1024, DM_TOTAL = 386;

    function drawCover() { if (coverCanvas && film2 && coverCanvas.clientWidth) BP.still(coverCanvas, film2, -1); }
    function mineCount() {
        if (vplayer) return vplayer.mine.length;
        try { return (JSON.parse(localStorage.getItem('bp-dm-upload') || '[]') || []).length; } catch (e) { return 0; }
    }
    function updateDmCount() {
        var n = mineCount();
        $$('[data-dm-count]').forEach(function (el) { el.textContent = DM_TOTAL + n; });
        $$('[data-clear-mine]').forEach(function (b) { b.hidden = !n; });
    }
    updateDmCount();

    // 封面：像 B 站首页一样，鼠标左右移动就能预览视频
    if (coverBtn && film2) {
        var scrubRaf = 0, scrubX = 0;
        coverBtn.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            scrubX = e.clientX;
            if (scrubRaf) return;
            scrubRaf = requestAnimationFrame(function () {
                scrubRaf = 0;
                var r = coverBtn.getBoundingClientRect();
                var k = clamp((scrubX - r.left) / r.width, 0, 1);
                coverBtn.classList.add('scrubbing');
                coverScrub.style.transform = 'scaleX(' + k.toFixed(3) + ')';
                BP.still(coverCanvas, film2, k * (film2.choice.at - .05));
            });
        });
        coverBtn.addEventListener('pointerleave', function () {
            cancelAnimationFrame(scrubRaf);
            scrubRaf = 0;
            coverBtn.classList.remove('scrubbing');
            drawCover();
        });
        coverBtn.addEventListener('click', function () { openVideo(); });
    }
    $$('[data-open-video]').forEach(function (b) { b.addEventListener('click', function () { openVideo(); }); });
    $$('[data-seek]').forEach(function (b) {
        b.addEventListener('click', function () { openVideo(parseFloat(b.getAttribute('data-seek'))); });
    });

    function chapterAt(t) {
        var name = '';
        film2.chapters.forEach(function (c) { if (t >= c.t) name = c.title; });
        return name;
    }
    function openVideo(seekTo) {
        if (!vpage || !film2 || !BP.Player) return;
        setPlaying(false);
        if (summer && summer.playing) summer.pause({ auto: true });
        lastFocus = document.activeElement;
        document.documentElement.classList.add('modal-open');
        if (typeof vpage.showModal === 'function') { if (!vpage.open) vpage.showModal(); }
        else vpage.setAttribute('open', '');
        if (!vplayer) initVideoPage();
        vplayer.relayout();
        if (seekTo != null) {
            vplayer.resetPath();
            vplayer.seek(seekTo);
            vplayer.toast('已跳到「' + chapterAt(seekTo) + '」这一步');
        } else if (vplayer.choiceOpen) {
            vplayer.toast('上次停在互动选项这里，选一个吧 (｡･ω･｡)');
        } else if (vplayer.started && !vplayer.endOpen && vplayer.t > 1 && vplayer.t < vplayer.duration() - 1) {
            vplayer.toast('已为你定位到上次看到的 ' + U.fmt(vplayer.t));
        } else {
            vplayer.resetPath();
            vplayer.seek(0);
        }
        if (!vplayer.choiceOpen) vplayer.play();
        vplayer.root.focus({ preventScroll: true });
    }
    function closeVideo() {
        if (vplayer) vplayer.pause({ auto: true });
        if (vpage.open) { if (typeof vpage.close === 'function') vpage.close(); else { vpage.removeAttribute('open'); afterClose(); } }
    }
    function afterClose() {
        if (vplayer) vplayer.pause({ auto: true });
        document.documentElement.classList.remove('modal-open');
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        drawCover();
    }
    if (vpage) {
        vpage.addEventListener('close', afterClose);
        vpage.addEventListener('click', function (e) {
            if (e.target !== vpage) return;
            var r = vpage.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeVideo();
        });
        $$('[data-close-video]').forEach(function (b) { b.addEventListener('click', closeVideo); });
    }

    function setFollow(on) {
        upState.follow = on;
        $$('[data-follow]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(on));
            b.textContent = on ? '✓ 已关注' : '+ 关注';
        });
        $$('[data-fans]').forEach(function (el) { el.textContent = (FANS + (on ? 1 : 0)).toLocaleString('en-US'); });
    }
    $$('[data-follow]').forEach(function (b) {
        b.addEventListener('click', function () {
            setFollow(!upState.follow);
            if (upState.follow && vplayer) vplayer.toast('关注成功！小电视会继续努力的');
        });
    });

    // 片尾：根据选的结局给出不同的按钮
    function endInfo(p) {
        if (p.chosen === 'A') {
            return {
                title: '感谢三连！下个视频见 (≧▽≦)',
                actions: [
                    { label: '看看另一个结局', fn: function () { p.rechoose(); } },
                    { label: upState.follow ? '✓ 已关注' : '+ 关注小电视', cls: 'pink', fn: function () { setFollow(true); p.toast('关注成功！小电视会继续努力的'); } }
                ]
            };
        }
        if (p.chosen === 'B') {
            return {
                title: '……真的不三连吗 (｡•́︿•̀｡)',
                actions: [
                    { label: '我错了，现在就三连！', cls: 'pink', fn: function () { p.rechoose(); triple(modalRow); } },
                    { label: '回到选择', fn: function () { p.rechoose(); } }
                ]
            };
        }
        return null;
    }

    // 右侧弹幕列表：跟着播放高亮当前这条，点一下跳过去
    var nowLi = null, nowCh = null, listHover = false;
    function buildDmList() {
        if (!dmListEl || !vplayer) return;
        var frag = document.createDocumentFragment();
        vplayer.danmakuList().forEach(function (m) {
            var li = document.createElement('li');
            li.className = (m.color ? 'c-' + m.color : '') + (m.mine ? ' mine' : '') + (m.jump != null ? ' jump' : '');
            var b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = '<span class="tm">' + U.fmt(m.d) + '</span><span class="tx"></span>';
            b.lastChild.textContent = m.text;
            b.addEventListener('click', function () {
                vplayer.seek(Math.max(0, m.d - .6));
                if (!vplayer.playing) vplayer.play();
            });
            li.appendChild(b);
            frag.appendChild(li);
            m.li = li;
        });
        dmListEl.innerHTML = '';
        dmListEl.appendChild(frag);
        nowLi = null;
        syncLists();
    }
    function buildChapters() {
        if (!chListEl || !vplayer) return;
        var items = film2.chapters.map(function (c) { return { t: c.t, title: c.title }; });
        if (vplayer.chosen) {
            var o = film2.choice.options.filter(function (x) { return x.id === vplayer.chosen; })[0];
            items.push({ t: film2.choice.at, title: o.title, branch: true });
        }
        chListEl.innerHTML = '';
        items.forEach(function (it) {
            var li = document.createElement('li');
            if (it.branch) li.className = 'branch';
            var b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = '<span class="tm">' + U.fmt(it.t) + '</span><span></span>';
            b.lastChild.textContent = it.title;
            b.addEventListener('click', function () {
                vplayer.seek(it.t);
                if (!vplayer.playing) vplayer.play();
            });
            li.appendChild(b);
            li._t = it.t;
            chListEl.appendChild(li);
        });
        nowCh = null;
        syncLists();
    }
    function syncLists() {
        if (!vplayer) return;
        var list = vplayer.danmakuList(), t = vplayer.t, cur = null;
        for (var i = 0; i < list.length && list[i].d <= t; i++) cur = list[i];
        var li = cur && cur.li;
        if (li !== nowLi) {
            if (nowLi) nowLi.classList.remove('now');
            nowLi = li;
            if (li) {
                li.classList.add('now');
                if (!listHover) dmListEl.scrollTop = li.offsetTop - dmListEl.clientHeight / 2;
            }
        }
        var ch = null;
        $$('li', chListEl).forEach(function (x) { if (t >= x._t - .01) ch = x; });
        if (ch !== nowCh) {
            if (nowCh) nowCh.classList.remove('now');
            nowCh = ch;
            if (ch) ch.classList.add('now');
        }
    }
    if (dmListEl) {
        dmListEl.addEventListener('pointerenter', function () { listHover = true; });
        dmListEl.addEventListener('pointerleave', function () { listHover = false; });
    }

    function initVideoPage() {
        vplayer = new BP.Player($('#vpPlayer'), film2, { send: true, volume: .75, state: upState, onEnd: endInfo });
        modalRow = bindActions($('.vp-actions', vpage), $('.vp-under', vpage), $('.vp-under [data-toast]', vpage));
        paintRows();
        // 已经三连过的人，互动选项会「认出」你
        vplayer.on('choice', function () {
            clearTimeout(autoChooseT);
            if (!isTriple()) return;
            vplayer.toast('检测到你已经三连过了，自动为你选择 (｡･ω･｡)');
            autoChooseT = setTimeout(function () { if (vplayer.choiceOpen) vplayer.choose('A'); }, 1400);
        });
        vplayer.on('choose', function (id) {
            clearTimeout(autoChooseT);
            if (id === 'A' && !isTriple()) triple(modalRow, true);
            buildChapters();
        });
        vplayer.on('dm', function () { buildDmList(); updateDmCount(); });
        vplayer.on('second', syncLists);
        vplayer.on('seek', syncLists);
        vplayer.on('play', function () {
            if (summer && summer.playing) summer.pause({ auto: true });
        });
        onTriple.push(function () { if (vplayer.choiceOpen) vplayer.choose('A'); });
        $$('[data-clear-mine]', vpage).forEach(function (b) {
            b.addEventListener('click', function () { vplayer.clearMine(); vplayer.toast('已清空你发的弹幕'); });
        });
        buildDmList();
        buildChapters();
        updateDmCount();
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
        // 年份导航：离屏幕中间最近的那一年亮起来
        var best = 0, bestD = Infinity, mid = window.innerWidth / 2;
        tlItems.forEach(function (it, i) {
            var d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - p * tlDist - mid);
            if (d < bestD) { bestD = d; best = i; }
        });
        if (best !== tlNow) {
            tlNow = best;
            tlDotBtns.forEach(function (b, i) { b.classList.toggle('on', i === best); });
        }
    }
    // 点年份：把页面滚到能让那一年停在屏幕中间的位置
    var tlItems = tlTrack ? $$('.tl-item', tlTrack) : [];
    var tlDotBtns = [], tlNow = -1;
    var tlDots = $('#tlDots');
    if (tlDots) {
        tlItems.forEach(function (it) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = $('.tl-year', it).textContent;
            b.addEventListener('click', function () {
                if (!tlDist) return;
                var p = clamp((it.offsetLeft + it.offsetWidth / 2 - window.innerWidth / 2) / tlDist, 0, 1);
                setPlaying(false);
                window.scrollTo({ top: tlPin.getBoundingClientRect().top + window.scrollY + p * tlDist, behavior: reduced ? 'auto' : 'smooth' });
            });
            tlDots.appendChild(b);
            tlDotBtns.push(b);
        });
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
    // 自动播放的倍速：1.0x → 1.5x → 2.0x → 0.5x
    var pbSpeed = $('#pbSpeed'), RATES = [1, 1.5, 2, .5], rateI = 0;
    if (pbSpeed) {
        pbSpeed.addEventListener('click', function () {
            rateI = (rateI + 1) % RATES.length;
            var r = RATES[rateI];
            SPEED = 120 * r;
            pbSpeed.textContent = (r === 1 ? '1.0' : r) + 'x';
            pbSpeed.classList.toggle('fast', r !== 1);
        });
    }
    window.addEventListener('wheel', function () { setPlaying(false); }, { passive: true });
    window.addEventListener('touchstart', function (e) { if (!pbPlay.contains(e.target)) setPlaying(false); }, { passive: true });
    window.addEventListener('keydown', function (e) {
        if (document.documentElement.classList.contains('modal-open')) return;
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
        drawCover();
    }
    var resizeTimer = 0;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 150); });
    window.addEventListener('load', function () { relayout(); setTimeout(relayout, 1000); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    relayout();
})();
