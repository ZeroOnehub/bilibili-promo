/* =========================================================
   player.js · 能「真的点开看」的 B 站播放器
   - 画面：canvas 按时间实时绘制，每支片子提供 render(ctx, t)
   - 弹幕、字幕、高能预警、音乐音效都挂在同一条时间轴上，
     所以暂停、拖动、倍速、循环、互动分支全都对得上
   - 声音：Web Audio 现场合成，没有任何音视频文件
   ========================================================= */
(function () {
    'use strict';

    var BP = window.BP = window.BP || {};
    BP.films = BP.films || {};
    BP.all = [];

    /* ---------------- 小工具 ---------------- */
    var U = BP.U = {
        clamp: function (v, a, b) { return Math.min(b, Math.max(a, v)); },
        lerp: function (a, b, k) { return a + (b - a) * k; },
        // t 落在 [a, b] 里的进度（0~1）
        seg: function (t, a, b) {
            if (b <= a) return t >= b ? 1 : 0;
            return Math.min(1, Math.max(0, (t - a) / (b - a)));
        },
        // 在 [a, b] 里为 1，两头各用 f 秒淡入淡出
        win: function (t, a, b, f) { f = f || .3; return Math.min(U.seg(t, a, a + f), 1 - U.seg(t, b - f, b)); },
        eo: function (k) { return 1 - Math.pow(1 - k, 3); },
        ei: function (k) { return k * k * k; },
        eio: function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
        back: function (k) { var c = 1.70158, x = k - 1; return 1 + (c + 1) * x * x * x + c * x * x; },
        elastic: function (k) {
            if (k <= 0) return 0;
            if (k >= 1) return 1;
            return Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1;
        },
        // 带种子的随机数：同一个种子每次结果都一样，画面才能随便拖
        rng: function (seed) {
            return function () {
                seed = seed + 0x6D2B79F5 | 0;
                var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        },
        fmt: function (sec) {
            sec = Math.max(0, Math.floor(sec + 1e-6));
            return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
        },
        // 手持镜头的抖动（-1~1）
        shake: function (t, s) {
            return Math.sin(t * 13.1 + s) * .5 + Math.sin(t * 7.3 + s * 1.7) * .3 + Math.sin(t * 23.7 + s * .3) * .2;
        },
        hex: function (h) {
            h = h.replace('#', '');
            return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        },
        mix: function (a, b, k) {
            var x = U.hex(a), y = U.hex(b);
            return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * k) + ',' + Math.round(x[1] + (y[1] - x[1]) * k) + ',' + Math.round(x[2] + (y[2] - x[2]) * k) + ')';
        },
        rgba: function (h, a) { var x = U.hex(h); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }
    };

    function lowerBound(arr, v, key) {
        var lo = 0, hi = arr.length;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (arr[mid][key] < v) lo = mid + 1; else hi = mid; }
        return lo;
    }
    function upperBound(arr, v, key) {
        var lo = 0, hi = arr.length;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (arr[mid][key] <= v) lo = mid + 1; else hi = mid; }
        return lo;
    }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    /* ---------------- 画图小工具（和网页同一套贴纸风） ---------------- */
    var FONT = {
        display: '"ZCOOL QingKe HuangYou", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        body: '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        num: '"Archivo Black", "Arial Black", "Helvetica Neue", sans-serif',
        mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'
    };
    var patterns = typeof WeakMap === 'function' ? new WeakMap() : null;
    var layers = { map: {}, order: [] };

    var G = BP.G = {
        INK: '#18191C', PINK: '#FF6699', BLUE: '#00AEEC', YELLOW: '#FFD23F', PAPER: '#F6F4EF',
        FONT: FONT,
        rr: function (c, x, y, w, h, r) {
            r = Math.max(0, Math.min(r, w / 2, h / 2));
            c.beginPath();
            c.moveTo(x + r, y);
            c.arcTo(x + w, y, x + w, y + h, r);
            c.arcTo(x + w, y + h, x, y + h, r);
            c.arcTo(x, y + h, x, y, r);
            c.arcTo(x, y, x + w, y, r);
            c.closePath();
        },
        circle: function (c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); },
        // 贴纸：先画硬投影，再填色、描粗边
        sticker: function (c, x, y, w, h, r, fill, o) {
            o = o || {};
            var sh = o.shadow == null ? 6 : o.shadow;
            if (sh) { G.rr(c, x + sh, y + sh, w, h, r); c.fillStyle = o.shadowColor || G.INK; c.fill(); }
            G.rr(c, x, y, w, h, r);
            c.fillStyle = fill; c.fill();
            if (o.lw !== 0) { c.lineJoin = 'round'; c.lineWidth = o.lw || 4; c.strokeStyle = o.stroke || G.INK; c.stroke(); }
        },
        font: function (size, weight, fam) { return (weight || 900) + ' ' + size + 'px ' + (fam || FONT.body); },
        // 文字：可选描边、硬投影
        text: function (c, s, x, y, o) {
            o = o || {};
            c.font = G.font(o.size || 32, o.weight, o.font);
            c.textAlign = o.align || 'center';
            c.textBaseline = o.base || 'middle';
            c.lineJoin = 'round';
            if (o.shadow) {
                c.fillStyle = o.shadowColor || G.INK;
                if (o.stroke) { c.lineWidth = o.lw || 6; c.strokeStyle = o.shadowColor || G.INK; c.strokeText(s, x + o.shadow, y + o.shadow); }
                c.fillText(s, x + o.shadow, y + o.shadow);
            }
            if (o.stroke) { c.lineWidth = o.lw || 6; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
            c.fillStyle = o.fill || G.INK;
            c.fillText(s, x, y);
        },
        star: function (c, x, y, r, n, inner, rot) {
            n = n || 5; inner = inner || .5; rot = rot || -Math.PI / 2;
            c.beginPath();
            for (var i = 0; i < n * 2; i++) {
                var a = rot + i * Math.PI / n, rr = i % 2 ? r * inner : r;
                c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
            }
            c.closePath();
        },
        heart: function (c, x, y, s) {
            c.beginPath();
            c.moveTo(x, y + s * .35);
            c.bezierCurveTo(x - s * 1.1, y - s * .35, x - s * .45, y - s * 1.05, x, y - s * .45);
            c.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * 1.1, y - s * .35, x, y + s * .35);
            c.closePath();
        },
        // 不会动的背景只画一次，缓存成贴图，之后每帧直接贴。
        // 贴图分辨率只看画布大小（不跟镜头推拉走），并且封顶，免得占太多内存
        layer: function (c, key, x, y, w, h, draw) {
            var s = Math.min(1.25, Math.max(.1, Math.round(c.canvas.width / 1280 * 8) / 8));
            var id = key + '@' + s, L = layers.map[id];
            if (!L) {
                L = document.createElement('canvas');
                L.width = Math.max(1, Math.ceil(w * s));
                L.height = Math.max(1, Math.ceil(h * s));
                var lc = L.getContext('2d');
                lc.scale(s, s);
                lc.translate(-x, -y);
                draw(lc);
                layers.map[id] = L;
                layers.order.push(id);
                if (layers.order.length > 10) delete layers.map[layers.order.shift()];
            }
            c.drawImage(L, x, y, w, h);
        },
        // 网页背景同款的圆点纸
        dots: function (c, x, y, w, h, gap, color) {
            var key = gap + color, map = patterns && patterns.get(c);
            if (!map) { map = {}; if (patterns) patterns.set(c, map); }
            if (!map[key]) {
                var off = document.createElement('canvas');
                off.width = off.height = gap;
                var oc = off.getContext('2d');
                oc.fillStyle = color;
                oc.beginPath(); oc.arc(gap / 2, gap / 2, Math.max(1, gap / 16), 0, Math.PI * 2); oc.fill();
                map[key] = c.createPattern(off, 'repeat');
            }
            c.fillStyle = map[key];
            c.fillRect(x, y, w, h);
        }
    };

    /* ---------------- 合成器：所有声音都是现场算出来的 ---------------- */
    var Synth = BP.Synth = (function () {
        var AC = window.AudioContext || window.webkitAudioContext;
        var ctx = null, out = null, verbIn = null, noiseBuf = null;

        function init() {
            if (ctx || !AC) return ctx;
            try { ctx = new AC(); } catch (e) { ctx = null; return null; }
            var comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 4;
            comp.attack.value = .003; comp.release.value = .25;
            out = ctx.createGain(); out.gain.value = .8;
            out.connect(comp); comp.connect(ctx.destination);

            var sr = ctx.sampleRate;
            noiseBuf = ctx.createBuffer(1, sr * 2, sr);
            var nd = noiseBuf.getChannelData(0);
            for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

            // 混响：一段衰减的噪声当作房间的回声
            var verb = ctx.createConvolver();
            var ir = ctx.createBuffer(2, Math.floor(sr * 2.4), sr);
            for (var ch = 0; ch < 2; ch++) {
                var d = ir.getChannelData(ch);
                for (var j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 2.6);
            }
            verb.buffer = ir;
            verbIn = ctx.createGain();
            var verbOut = ctx.createGain(); verbOut.gain.value = .3;
            verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(out);
            return ctx;
        }
        function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

        // 每个播放器一条总线；暂停或拖动时整条换掉，已经排好的声音就一起静音了
        function Bus(vol) {
            this.dry = ctx.createGain(); this.wet = ctx.createGain();
            this.dry.gain.value = vol; this.wet.gain.value = vol;
            this.dry.connect(out); this.wet.connect(verbIn);
        }
        Bus.prototype.vol = function (v) {
            var t = ctx.currentTime;
            this.dry.gain.setTargetAtTime(v, t, .03);
            this.wet.gain.setTargetAtTime(v, t, .03);
        };
        Bus.prototype.kill = function () {
            var t = ctx.currentTime, dry = this.dry, wet = this.wet;
            [dry, wet].forEach(function (g) {
                g.gain.cancelScheduledValues(t);
                g.gain.setValueAtTime(g.gain.value, t);
                g.gain.linearRampToValueAtTime(0, t + .05);
            });
            setTimeout(function () { try { dry.disconnect(); wet.disconnect(); } catch (e) { /* 已断开 */ } }, 300);
        };

        // 通用音色：几个振荡器（泛音）→（可选）滤波 → 包络 → 总线
        function tone(b, t, o) {
            var a = o.a || .005, peak = o.v || .1, hold = o.hold || 0, rel = o.rel || .15;
            var endT = hold ? t + a + hold + rel * 5 : t + a + (o.decay || .3) * 6;
            var g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(peak, t + a);
            if (hold) { g.gain.setValueAtTime(peak, t + a + hold); g.gain.setTargetAtTime(0, t + a + hold, rel); }
            else g.gain.setTargetAtTime(0, t + a, o.decay || .3);
            var head = g;
            if (o.lp || o.bp) {
                var f = ctx.createBiquadFilter();
                f.type = o.bp ? 'bandpass' : 'lowpass';
                f.frequency.setValueAtTime(o.bp || o.lp, t);
                f.Q.value = o.q || .8;
                f.connect(g); head = f;
            }
            var lfoGain = null;
            if (o.vib) {
                var lfo = ctx.createOscillator();
                lfo.frequency.value = o.vib;
                lfoGain = ctx.createGain(); lfoGain.gain.value = o.vibDepth || o.f * .012;
                lfo.connect(lfoGain); lfo.start(t); lfo.stop(endT);
            }
            (o.parts || [[1, 1]]).forEach(function (p) {
                var osc = ctx.createOscillator();
                osc.type = p[3] || o.type || 'triangle';
                osc.frequency.setValueAtTime(o.f * p[0], t);
                if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2 * p[0], t + (o.glide || .1));
                if (o.f3) osc.frequency.exponentialRampToValueAtTime(o.f3 * p[0], t + (o.glide3 || .4));
                if (p[2]) osc.detune.value = p[2];
                if (lfoGain) lfoGain.connect(osc.frequency);
                var pg = ctx.createGain(); pg.gain.value = p[1];
                osc.connect(pg); pg.connect(head);
                osc.start(t); osc.stop(endT);
            });
            g.connect(b.dry);
            if (o.wet) { var s = ctx.createGain(); s.gain.value = o.wet; g.connect(s); s.connect(b.wet); }
        }
        // 噪声：鼓、烟花、风、沙沙声
        function hiss(b, t, o) {
            var a = o.a || .002, v = o.v || .1;
            var len = o.hold ? a + o.hold + (o.rel || .1) * 5 : a + (o.decay || .05) * 6;
            var src = ctx.createBufferSource();
            src.buffer = noiseBuf; src.loop = true;
            var f = ctx.createBiquadFilter();
            f.type = o.type || 'bandpass';
            f.frequency.setValueAtTime(o.f || 1000, t);
            if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.sweep || len));
            f.Q.value = o.q || 1;
            var g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(v, t + a);
            if (o.hold) { g.gain.setValueAtTime(v, t + a + o.hold); g.gain.setTargetAtTime(0, t + a + o.hold, o.rel || .1); }
            else g.gain.setTargetAtTime(0, t + a, o.decay || .05);
            src.connect(f); f.connect(g); g.connect(b.dry);
            if (o.wet) { var s = ctx.createGain(); s.gain.value = o.wet; g.connect(s); s.connect(b.wet); }
            src.start(t, Math.random() * 1.5);
            src.stop(t + len + .05);
        }

        var I = {
            // —— 乐器 ——
            keys: function (b, t, p) { tone(b, t, { f: p.f, v: p.v || .07, a: .004, decay: p.d || .55, lp: p.lp || 2600, wet: .35, parts: [[1, 1, 0, 'sine'], [2, .22, 2, 'sine'], [3, .06, 0, 'triangle']] }); },
            pluck: function (b, t, p) { tone(b, t, { f: p.f, v: p.v || .09, a: .003, decay: p.d || .26, lp: p.lp || 3400, wet: p.wet == null ? .22 : p.wet, parts: [[1, 1, 0, 'triangle'], [2, .3, 3, 'sine'], [3, .1, 0, 'sine']] }); },
            bell: function (b, t, p) { tone(b, t, { f: p.f, v: p.v || .06, a: .002, decay: p.d || .5, wet: .45, parts: [[1, 1, 0, 'sine'], [2.76, .16, 0, 'sine'], [5.4, .05, 0, 'sine']] }); },
            lead: function (b, t, p) { tone(b, t, { f: p.f, v: p.v || .07, a: .03, hold: p.dur || .3, rel: .12, lp: p.lp || 2400, wet: .35, vib: 5.2, vibDepth: p.f * .01, parts: [[1, 1, 0, 'triangle'], [2, .15, 4, 'sine']] }); },
            whistleLead: function (b, t, p) { tone(b, t, { f: p.f, v: p.v || .05, a: .02, hold: p.dur || .2, rel: .06, wet: .25, vib: 6, vibDepth: p.f * .008, parts: [[1, 1, 0, 'sine']] }); },
            pad: function (b, t, p) {
                p.fs.forEach(function (f) {
                    tone(b, t, { f: f, v: p.v || .014, a: p.a || .5, hold: p.dur || 2, rel: p.rel || .5, lp: p.lp || 1300, wet: .5, parts: [[1, 1, -8, 'sawtooth'], [1, 1, 8, 'sawtooth']] });
                });
            },
            bass: function (b, t, p) { tone(b, t, { f: p.f, v: p.v || .16, a: .008, hold: p.dur || .35, rel: .08, lp: 600, parts: [[1, 1, 0, 'triangle'], [1, .6, 0, 'sine']] }); },
            // —— 鼓 ——
            kick: function (b, t, p) { tone(b, t, { f: 150, f2: 42, glide: .12, v: p.v || .42, a: .002, decay: .09, parts: [[1, 1, 0, 'sine']] }); },
            hat: function (b, t, p) { hiss(b, t, { type: 'highpass', f: 7500, v: p.v || .04, decay: .018 }); },
            shaker: function (b, t, p) { hiss(b, t, { type: 'highpass', f: 5000, v: p.v || .028, a: .012, decay: .028 }); },
            clap: function (b, t, p) {
                var v = p.v || .13;
                [0, .011, .022].forEach(function (d, i) { hiss(b, t + d, { type: 'bandpass', f: 1400, q: .9, v: v * (i === 2 ? 1 : .6), decay: i === 2 ? .07 : .01, wet: .2 }); });
            },
            snare: function (b, t, p) {
                hiss(b, t, { type: 'bandpass', f: 2200, q: .7, v: p.v || .11, decay: .06, wet: .15 });
                tone(b, t, { f: 190, f2: 150, glide: .05, v: (p.v || .11) * .6, decay: .04, parts: [[1, 1, 0, 'triangle']] });
            },
            crash: function (b, t, p) { hiss(b, t, { type: 'highpass', f: 4200, v: p.v || .08, decay: .55, wet: .4 }); },
            roll: function (b, t, p) {
                var d = p.dur || 2, n = Math.floor(d / .045);
                for (var i = 0; i < n; i++) {
                    var k = i / n;
                    hiss(b, t + i * .045, { type: 'bandpass', f: 2400, q: .8, v: (p.v || .09) * (.2 + .8 * k * k), decay: .022 });
                }
            },
            // —— 音效 ——
            riser: function (b, t, p) {
                var d = p.dur || 1;
                hiss(b, t, { type: 'bandpass', f: 400, f2: 6000, sweep: d, q: 2, v: p.v || .07, a: d * .95, hold: .01, rel: .04 });
                tone(b, t, { f: 220, f2: 880, glide: d, v: (p.v || .07) * .3, a: d * .9, hold: .01, rel: .04, lp: 1800, parts: [[1, 1, 0, 'sawtooth']] });
            },
            whistle: function (b, t, p) {
                var d = p.dur || 1.2;
                tone(b, t, { f: 520, f2: 1900, glide: d, v: p.v || .025, a: d * .6, hold: d * .3, rel: .04, vib: 11, vibDepth: 40, parts: [[1, 1, 0, 'sine']] });
                hiss(b, t, { type: 'bandpass', f: 2500, q: 3, v: (p.v || .025) * .8, a: d * .5, hold: d * .4, rel: .04 });
            },
            boom: function (b, t, p) {
                var v = p.v || .3;
                hiss(b, t, { type: 'lowpass', f: 1400, f2: 120, sweep: 1.4, v: v, decay: .5, wet: .6 });
                tone(b, t, { f: 95, f2: 32, glide: .45, v: v * 1.1, a: .003, decay: .22, parts: [[1, 1, 0, 'sine']] });
                if (p.big) hiss(b, t + .32, { type: 'lowpass', f: 500, v: v * .35, a: .01, decay: .5, wet: .8 });
            },
            crackle: function (b, t, p) {
                var d = p.dur || 1.4;
                for (var i = 0; i < 26; i++) hiss(b, t + Math.random() * d, { type: 'highpass', f: 2500 + Math.random() * 3000, v: (p.v || .05) * (.4 + Math.random() * .6), decay: .006, wet: .3 });
            },
            chirp: function (b, t, p) { for (var i = 0; i < 3; i++) tone(b, t + i * .055, { f: 4300, v: p.v || .01, a: .004, hold: .018, rel: .008, parts: [[1, 1, 0, 'sine']] }); },
            wind: function (b, t, p) { hiss(b, t, { type: 'lowpass', f: 380, q: .5, v: p.v || .02, a: 1.6, hold: 1.2, rel: .6 }); },
            blip: function (b, t, p) { tone(b, t, { f: p.f || 520, v: p.v || .03, a: .003, hold: .035, rel: .015, lp: 2600, wet: .08, parts: [[1, 1, 0, p.w || 'square']] }); },
            meow: function (b, t, p) {
                var s = p.s || 1;
                tone(b, t, { f: 480 * s, f2: 900 * s, glide: .12, f3: 560 * s, glide3: .5, v: p.v || .06, a: .03, hold: .32, rel: .08, bp: 1400, q: 2.5, vib: 7, vibDepth: 18, parts: [[1, 1, 0, 'sawtooth'], [2, .3, 0, 'triangle']] });
            },
            coin: function (b, t, p) {
                tone(b, t, { f: 988, v: p.v || .045, a: .002, hold: .07, rel: .01, lp: 5000, parts: [[1, 1, 0, 'square']] });
                tone(b, t + .075, { f: 1319, v: p.v || .045, a: .002, decay: .2, lp: 5000, wet: .2, parts: [[1, 1, 0, 'square']] });
            },
            ding: function (b, t, p) { tone(b, t, { f: p.f || 1568, v: p.v || .05, a: .002, decay: .45, wet: .35, parts: [[1, 1, 0, 'sine'], [2, .25, 0, 'sine'], [3, .08, 0, 'sine']] }); },
            pop: function (b, t, p) { tone(b, t, { f: p.f || 320, f2: (p.f || 320) * 2.8, glide: .07, v: p.v || .08, a: .002, decay: .05, parts: [[1, 1, 0, 'sine']] }); },
            whoosh: function (b, t, p) { var d = p.dur || .45; hiss(b, t, { type: 'bandpass', f: 350, f2: 2600, sweep: d * .6, q: 1.2, v: p.v || .07, a: d * .45, hold: .01, rel: d * .15 }); },
            stamp: function (b, t, p) {
                hiss(b, t, { type: 'lowpass', f: 700, v: p.v || .35, decay: .06 });
                tone(b, t, { f: 110, f2: 45, glide: .15, v: (p.v || .35) * .9, decay: .1, parts: [[1, 1, 0, 'sine']] });
            },
            click: function (b, t, p) { hiss(b, t, { type: 'highpass', f: 2200, v: p.v || .1, decay: .004 }); },
            key: function (b, t, p) { hiss(b, t, { type: 'bandpass', f: 2600 + Math.random() * 1400, q: 2, v: (p.v || .05) * (.6 + Math.random() * .5), decay: .008 }); },
            tick: function (b, t, p) { tone(b, t, { f: p.f || 1900, v: p.v || .035, a: .001, decay: .012, parts: [[1, 1, 0, 'sine']] }); },
            heart: function (b, t, p) {
                var v = p.v || .28;
                [0, .2].forEach(function (d, i) { tone(b, t + d, { f: 70, f2: 45, glide: .1, v: v * (i ? .7 : 1), a: .004, decay: .08, parts: [[1, 1, 0, 'sine']] }); });
            },
            scratch: function (b, t, p) {
                hiss(b, t, { type: 'bandpass', f: 1800, f2: 350, sweep: .3, q: 2, v: p.v || .15, a: .01, decay: .09 });
                tone(b, t, { f: 420, f2: 140, glide: .28, v: (p.v || .15) * .5, a: .005, decay: .1, lp: 1500, parts: [[1, 1, 0, 'sawtooth']] });
            },
            // 喜剧里的「失败长号」
            trombone: function (b, t, p) {
                var v = p.v || .08;
                [[196, .5], [185, .5], [174.6, .5], [164.8, 1.5]].forEach(function (n, i) {
                    tone(b, t + i * .55, { f: n[0], v: v, a: .04, hold: n[1] - .1, rel: .12, lp: 1100, vib: i === 3 ? 6 : 0, vibDepth: 6, parts: [[1, 1, 0, 'sawtooth'], [1, .5, 6, 'sawtooth']] });
                });
            },
            boing: function (b, t, p) { tone(b, t, { f: 220, f2: 660, glide: .18, v: p.v || .07, a: .005, decay: .12, vib: 18, vibDepth: 30, parts: [[1, 1, 0, 'triangle']] }); },
            thud: function (b, t, p) {
                tone(b, t, { f: 120, f2: 55, glide: .1, v: p.v || .22, a: .002, decay: .07, parts: [[1, 1, 0, 'sine']] });
                hiss(b, t, { type: 'lowpass', f: 400, v: (p.v || .22) * .4, decay: .04 });
            },
            shutter: function (b, t, p) {
                hiss(b, t, { type: 'highpass', f: 1800, v: p.v || .1, decay: .012 });
                hiss(b, t + .07, { type: 'highpass', f: 2600, v: (p.v || .1) * .8, decay: .02 });
            },
            cheer: function (b, t, p) {
                var d = p.dur || 2;
                for (var i = 0; i < 70; i++) {
                    var x = Math.random() * d;
                    hiss(b, t + x, { type: 'bandpass', f: 900 + Math.random() * 1600, q: 1.5, v: (p.v || .028) * (1 - x / d * .6), decay: .012 });
                }
            },
            noise: function (b, t, p) { hiss(b, t, { type: 'bandpass', f: 3000, q: .4, v: p.v || .035, a: .02, hold: p.dur || .5, rel: .05 }); },
            slurp: function (b, t, p) { hiss(b, t, { type: 'bandpass', f: 600, f2: 1800, sweep: .35, q: 4, v: p.v || .05, a: .05, hold: .2, rel: .05 }); },
            yawn: function (b, t, p) { tone(b, t, { f: 520, f2: 700, glide: .25, f3: 260, glide3: 1.1, v: p.v || .035, a: .08, hold: .9, rel: .15, vib: 5, vibDepth: 8, lp: 1600, parts: [[1, 1, 0, 'triangle'], [2, .2, 0, 'sine']] }); },
            recbeep: function (b, t, p) { tone(b, t, { f: 1000, v: p.v || .035, a: .002, hold: .1, rel: .01, parts: [[1, 1, 0, 'sine']] }); },
            sniff: function (b, t, p) { [0, .18].forEach(function (d) { hiss(b, t + d, { type: 'highpass', f: 1800, v: p.v || .035, a: .05, hold: .04, rel: .03 }); }); }
        };

        return {
            ok: !!AC,
            init: init,
            resume: resume,
            ctx: function () { return ctx; },
            Bus: Bus,
            play: function (bus, fn, t, p) { var f = I[fn]; if (f) f(bus, t, p || {}); }
        };
    })();

    /* ---------------- 乐谱：把音符、鼓点、音效排到时间轴上 ---------------- */
    var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function Score() { this.ev = []; }
    Score.midi = function (s) {
        if (typeof s === 'number') return s;
        var m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
        return NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
    };
    Score.freq = function (s) { return 440 * Math.pow(2, (Score.midi(s) - 69) / 12); };
    Score.prototype = {
        at: function (t, fn, p) { this.ev.push({ t: t, fn: fn, p: p || {} }); return this; },
        note: function (t, fn, n, p) { p = Object.assign({}, p); p.f = Score.freq(n); return this.at(t, fn, p); },
        // 鼓点：每个字符是一个十六分音符，x 重、o 轻、. 空
        beat: function (t0, bpm, bars, parts, vol) {
            var s16 = 60 / bpm / 4;
            for (var bar = 0; bar < bars; bar++) {
                for (var k in parts) {
                    var pat = parts[k];
                    for (var i = 0; i < pat.length; i++) {
                        if (pat[i] === '.') continue;
                        var p = {};
                        if (pat[i] === 'o') p.v = { kick: .25, hat: .022, shaker: .016, clap: .07, snare: .06 }[k];
                        if (vol != null) p.v = (p.v || { kick: .42, hat: .04, shaker: .028, clap: .13, snare: .11 }[k]) * vol;
                        this.at(t0 + (bar * pat.length + i) * s16, k, p);
                    }
                }
            }
            return this;
        },
        // 旋律：'E5:1 F5:.5 r:.5'，冒号后面是拍数，r 是休止
        melody: function (t0, bpm, str, fn, p) {
            var beat = 60 / bpm, t = t0, self = this;
            str.trim().split(/\s+/).forEach(function (tok) {
                var parts = tok.split(':'), len = parseFloat(parts[1] || '1') * beat;
                if (parts[0] !== 'r') self.note(t, fn, parts[0], Object.assign({ dur: len * .85 }, p));
                t += len;
            });
            return t;
        },
        strum: function (t, notes, fn, p, gap) {
            var self = this;
            notes.forEach(function (n, i) { self.note(t + i * (gap == null ? .018 : gap), fn, n, p); });
            return this;
        },
        // 逐字配「哔哔」说话声（字幕打字机节奏一致）
        say: function (t0, text, p) {
            p = p || {};
            var cps = p.cps || 12, base = p.base || 520, self = this;
            var scale = [0, 2, 4, 7, 9, 12];
            Array.from(text).forEach(function (ch, i) {
                if (/[\s，。！？、…—,.!?（）()「」：:~～“”"']/.test(ch)) return;
                var st = scale[ch.charCodeAt(0) % scale.length] + (p.shift || 0);
                self.at(t0 + i / cps, 'blip', { f: base * Math.pow(2, st / 12), v: p.v, w: p.w });
            });
            return this;
        },
        done: function () { return this.ev.sort(function (a, b) { return a.t - b.t; }); }
    };
    BP.Score = Score;

    /* ---------------- 全局弹幕开关（页面上所有「弹」按钮联动） ---------------- */
    BP.dmOn = function () { return !document.body.classList.contains('dm-off'); };
    BP.setDm = function (on) {
        document.body.classList.toggle('dm-off', !on);
        Array.prototype.forEach.call(document.querySelectorAll('[data-dm-toggle]'), function (b) {
            b.setAttribute('aria-pressed', String(on));
            b.title = on ? '关闭弹幕' : '打开弹幕';
        });
    };
    BP.toggleDm = function () { BP.setDm(!BP.dmOn()); };
    document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-dm-toggle]');
        if (b) BP.toggleDm();
    });

    // 把片子的某一帧画到任意 canvas 上（封面、进度条预览图都用它）
    BP.still = function (canvas, film, t, state) {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var cw = canvas.clientWidth || canvas.width;
        var w = Math.max(16, Math.round(cw * dpr)), h = Math.round(w * 9 / 16);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        var c = canvas.getContext('2d');
        c.setTransform(w / 1280, 0, 0, w / 1280, 0, 0);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        film.render(c, t, state || { still: true });
    };

    /* ---------------- 播放器 ---------------- */
    var ICON = {
        play: '<svg class="i-play" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
        pause: '<svg class="i-pause" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
        vol: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path class="w1" d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path class="w2" d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/><path class="x" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
        full: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
    };
    var JUMP = /空降\s*(\d{1,2})[:：](\d{2})/;
    var STYLE_COLOR = { p: 'pink', b: 'blue', y: 'yellow' };

    // 弹幕数据：t 片内时间，style 用空格分隔：p/b/y 颜色，top/bottom 位置，big 大号
    function mkDm(t, text, style) {
        var s = ' ' + (style || '') + ' ';
        var m = { ft: t, text: text, style: style || '', color: '', mode: 'scroll', big: / big /.test(s) };
        for (var k in STYLE_COLOR) if (s.indexOf(' ' + k + ' ') > -1) m.color = STYLE_COLOR[k];
        if (/ top /.test(s)) m.mode = 'top';
        else if (/ bottom /.test(s)) m.mode = 'bottom';
        var j = JUMP.exec(text);
        if (j) m.jump = +j[1] * 60 + +j[2];
        return m;
    }

    var measureCtx = null;
    function measure(text, font) {
        if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
        measureCtx.font = font;
        return measureCtx.measureText(text).width;
    }

    function Player(mount, film, opts) {
        var self = this;
        this.film = film;
        this.o = Object.assign({ loop: false, send: false, volume: .7, muted: false }, opts || {});
        this.handlers = {};
        this.state = this.o.state || {};
        this.t = 0;
        this.playing = false;
        this.rate = 1;
        this.volume = this.o.volume;
        this.muted = this.o.muted;
        this.posterMode = film.poster != null;
        this.trunk = { from: 0, to: film.choice ? film.choice.at : film.duration };
        this.path = [this.trunk];
        this.chosen = null;
        this.events = film.score ? film.score() : [];
        this.dmDur = film.dmDur || 8;
        this.maxDur = Math.max(this.dmDur, 4);
        this._stamp = 0;
        this._act = [];
        this.chs = [];
        this._loopB = function (now) { self._loop(now); };
        this._build(mount);
        this._loadMine();
        this._initDm();
        this._buildSegs();
        this._bind();
        this._resize();
        BP.all.push(this);
    }

    Player.prototype.on = function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; };
    Player.prototype.emit = function (ev, data) {
        var self = this;
        (this.handlers[ev] || []).forEach(function (fn) { fn.call(self, data); });
    };

    Player.prototype._build = function (mount) {
        var f = this.film;
        var root = this.root = document.createElement('div');
        root.className = 'bp' + (f.subStyle ? ' sub-' + f.subStyle : '');
        root.tabIndex = 0;
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', '视频播放器：' + f.title + '。空格播放暂停，左右方向键快退快进，D 开关弹幕，M 静音，F 全屏');
        root.innerHTML = [
            '<div class="bp-screen">',
            '<canvas class="bp-canvas" role="img" aria-label="' + esc(f.alt || f.title) + '"></canvas>',
            '<div class="bp-dm" aria-hidden="true"></div>',
            '<div class="bp-sub" aria-hidden="true"><span></span></div>',
            '<div class="bp-banner" aria-hidden="true">⚠ 前方高能预警</div>',
            '<div class="bp-toast" role="status" aria-live="polite"></div>',
            '<button class="bp-big" type="button" aria-label="播放">' + ICON.play + '</button>',
            '<button class="bp-unmute" type="button" hidden>🔇 点击开启声音</button>',
            '<div class="bp-choice" hidden><p class="bp-choice-q"></p><div class="bp-choice-opts"></div></div>',
            '<div class="bp-end" hidden><p class="bp-end-t"></p><div class="bp-end-acts"></div></div>',
            '</div>',
            '<div class="bp-ctrl">',
            '<button class="bp-btn bp-play" type="button" aria-label="播放">' + ICON.play + ICON.pause + '</button>',
            '<span class="bp-time"><span class="bp-cur">00:00</span><i>/</i><span class="bp-dur">00:00</span></span>',
            '<div class="bp-bar" role="slider" tabindex="0" aria-label="播放进度" aria-valuemin="0">',
            '<svg class="bp-heat" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path/></svg>',
            '<div class="bp-segs"></div>',
            '<svg class="bp-knob" aria-hidden="true"><use href="#tv"/></svg>',
            '<div class="bp-tip" aria-hidden="true"><canvas></canvas><span></span></div>',
            '</div>',
            '<div class="bp-pop bp-rate-wrap"><button class="bp-btn bp-rate" type="button" aria-haspopup="true" aria-expanded="false" aria-label="播放倍速">倍速</button>',
            '<div class="bp-menu" role="menu">' + [2, 1.5, 1.25, 1, .75, .5].map(function (r) {
                return '<button type="button" role="menuitemradio" data-rate="' + r + '" aria-checked="' + (r === 1) + '">' + (r === 1 ? '1.0x' : r + 'x') + '</button>';
            }).join('') + '</div></div>',
            '<button class="dm-toggle bp-dmt" type="button" data-dm-toggle aria-pressed="' + BP.dmOn() + '" title="' + (BP.dmOn() ? '关闭弹幕' : '打开弹幕') + '">弹</button>',
            '<div class="bp-vol"><button class="bp-btn bp-mute" type="button" aria-label="静音">' + ICON.vol + '</button>',
            '<input class="bp-vol-range" type="range" min="0" max="100" step="1" aria-label="音量"></div>',
            '<button class="bp-btn bp-full" type="button" aria-label="全屏">' + ICON.full + '</button>',
            '</div>'
        ].join('');

        if (this.o.send) {
            var form = document.createElement('form');
            form.className = 'bp-send';
            form.autocomplete = 'off';
            form.innerHTML = [
                '<span class="bp-send-at" title="弹幕会贴在这个时间点上">00:00</span>',
                '<input maxlength="30" enterkeyhint="send" aria-label="发一条弹幕" placeholder="' + esc(this.o.placeholder || '发个友善的弹幕见证当下') + '">',
                '<div class="bp-colors" role="radiogroup" aria-label="弹幕颜色">',
                '<button type="button" role="radio" aria-checked="true" data-c="" style="--c:#fff" aria-label="白色"></button>',
                '<button type="button" role="radio" aria-checked="false" data-c="p" style="--c:#FF7EAB" aria-label="粉色"></button>',
                '<button type="button" role="radio" aria-checked="false" data-c="b" style="--c:#6ED6FF" aria-label="蓝色"></button>',
                '<button type="button" role="radio" aria-checked="false" data-c="y" style="--c:#FFDE59" aria-label="黄色"></button>',
                '</div>',
                '<button class="bp-mode" type="button" data-mode="" title="弹幕位置：滚动 / 顶部 / 底部">滚动</button>',
                '<button class="bp-send-btn" type="submit">发送</button>'
            ].join('');
            root.appendChild(form);
            this.form = form;
        }
        mount.appendChild(root);

        var q = function (s) { return root.querySelector(s); };
        this.screen = q('.bp-screen');
        this.canvas = q('.bp-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.dmLayer = q('.bp-dm');
        this.subEl = q('.bp-sub');
        this.subSpan = q('.bp-sub span');
        this.banner = q('.bp-banner');
        this.toastEl = q('.bp-toast');
        this.bigBtn = q('.bp-big');
        this.unmuteBtn = q('.bp-unmute');
        this.choiceEl = q('.bp-choice');
        this.choiceQ = q('.bp-choice-q');
        this.choiceOpts = q('.bp-choice-opts');
        this.endEl = q('.bp-end');
        this.endT = q('.bp-end-t');
        this.endActs = q('.bp-end-acts');
        this.playBtn = q('.bp-play');
        this.curEl = q('.bp-cur');
        this.durEl = q('.bp-dur');
        this.bar = q('.bp-bar');
        this.heat = q('.bp-heat path');
        this.segsEl = q('.bp-segs');
        this.knob = q('.bp-knob');
        this.tip = q('.bp-tip');
        this.tipCanvas = q('.bp-tip canvas');
        this.tipText = q('.bp-tip span');
        this.rateWrap = q('.bp-rate-wrap');
        this.rateBtn = q('.bp-rate');
        this.muteBtn = q('.bp-mute');
        this.volRange = q('.bp-vol-range');
        this.fullBtn = q('.bp-full');
        this.sendAt = q('.bp-send-at');
        this.volRange.value = Math.round(this.volume * 100);
        this._volIcon();
    };

    Player.prototype._bind = function () {
        var self = this, root = this.root, bar = this.bar;

        this.screen.addEventListener('click', function (e) {
            var j = e.target.closest('.bdm.jump');
            if (j && j._m) { self._jump(j._m); return; }
            if (e.target.closest('button, .bp-choice, .bp-end')) return;
            self.toggle();
        });
        this.bigBtn.addEventListener('click', function () { self.play(); });
        this.playBtn.addEventListener('click', function () { self.toggle(); });
        this.unmuteBtn.addEventListener('click', function () { self.setMuted(false); });

        // 进度条：拖动、点击、悬停预览
        var dragging = false, wasPlaying = false, tipRaf = 0, tipX = 0;
        bar.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            dragging = true;
            wasPlaying = self.playing;
            if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId);
            bar.classList.add('dragging');
            if (self.playing) self.pause({ silent: true });
            self.seek(self._displayAt(e.clientX));
            showTip(e.clientX);
        });
        bar.addEventListener('pointermove', function (e) {
            if (dragging) self.seek(self._displayAt(e.clientX), { quiet: true });
            if (dragging || e.pointerType === 'mouse') showTip(e.clientX);
        });
        function endDrag() {
            if (!dragging) return;
            dragging = false;
            bar.classList.remove('dragging');
            if (wasPlaying) self.play();
            else self.bigBtn.hidden = !!(self.choiceOpen || self.endOpen);
        }
        bar.addEventListener('pointerup', endDrag);
        bar.addEventListener('pointercancel', endDrag);
        function showTip(x) {
            tipX = x;
            if (tipRaf) return;
            tipRaf = requestAnimationFrame(function () { tipRaf = 0; self._tip(tipX); });
        }
        bar.addEventListener('keydown', function (e) {
            var k = e.key;
            if (k === 'Home') { e.preventDefault(); e.stopPropagation(); self.seek(0); }
            else if (k === 'End') { e.preventDefault(); e.stopPropagation(); self.seek(self.duration() - .5); }
        });

        // 倍速菜单
        var closeRate = function () { self.rateWrap.classList.remove('open'); self.rateBtn.setAttribute('aria-expanded', 'false'); };
        this.rateBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var open = !self.rateWrap.classList.contains('open');
            self.rateWrap.classList.toggle('open', open);
            self.rateBtn.setAttribute('aria-expanded', String(open));
        });
        this.rateWrap.querySelector('.bp-menu').addEventListener('click', function (e) {
            var b = e.target.closest('[data-rate]');
            if (!b) return;
            self.setRate(parseFloat(b.getAttribute('data-rate')));
            closeRate();
        });
        document.addEventListener('click', function (e) { if (!self.rateWrap.contains(e.target)) closeRate(); });

        this.muteBtn.addEventListener('click', function () { self.setMuted(!self.muted); });
        this.volRange.addEventListener('input', function () { self.setVolume(this.value / 100); });
        this.fullBtn.addEventListener('click', function () { self.toggleFullscreen(); });

        // 空降弹幕：鼠标放上去就停住（B 站也是这样），点一下跳转
        this.dmLayer.addEventListener('pointerover', function (e) {
            var el = e.target.closest('.bdm.jump');
            if (!el || !el._m || el._m.frozen) return;
            el._m.frozen = true;
            el._m.fp = U.clamp((self.t - el._m.d) / el._m.dur, 0, 1);
        });
        this.dmLayer.addEventListener('pointerout', function (e) {
            var el = e.target.closest('.bdm.jump');
            if (!el || !el._m || el.contains(e.relatedTarget)) return;
            var m = el._m;
            m.frozen = false;
            m.d = self.t - m.fp * m.dur;
            self.dm.sort(function (a, b) { return a.d - b.d; });
        });

        // 键盘快捷键（和 B 站网页版基本一致）
        root.addEventListener('keydown', function (e) {
            if (e.target.closest('input, textarea, select')) { if (e.key === 'Escape') e.target.blur(); return; }
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            var k = e.key, handled = true;
            if (k === ' ' || k === 'k' || k === 'K') {
                if (k === ' ' && e.target.closest('button')) handled = false;
                else self.toggle();
            }
            else if (k === 'ArrowRight') { self.seek(self.t + 5); self.toast('快进 5 秒 → ' + U.fmt(self.t)); }
            else if (k === 'ArrowLeft') { self.seek(self.t - 5); self.toast('快退 5 秒 → ' + U.fmt(self.t)); }
            else if (k === 'ArrowUp') { self.setVolume(self.volume + .1); self.toast('音量 ' + Math.round(self.volume * 100) + '%'); }
            else if (k === 'ArrowDown') { self.setVolume(self.volume - .1); self.toast('音量 ' + Math.round(self.volume * 100) + '%'); }
            else if (k === 'm' || k === 'M') self.setMuted(!self.muted);
            else if (k === 'd' || k === 'D') { BP.toggleDm(); self.toast(BP.dmOn() ? '弹幕已开启' : '弹幕已关闭'); }
            else if (k === 'f' || k === 'F') self.toggleFullscreen();
            else handled = false;
            if (handled) { e.preventDefault(); e.stopPropagation(); }
        });

        // 发弹幕
        if (this.form) {
            var input = this.form.querySelector('input');
            var color = '', mode = '';
            var MODES = [['', '滚动'], ['top', '顶部'], ['bottom', '底部']];
            this.form.querySelector('.bp-colors').addEventListener('click', function (e) {
                var b = e.target.closest('[data-c]');
                if (!b) return;
                color = b.getAttribute('data-c');
                Array.prototype.forEach.call(this.children, function (x) { x.setAttribute('aria-checked', String(x === b)); });
            });
            var modeBtn = this.form.querySelector('.bp-mode');
            modeBtn.addEventListener('click', function () {
                var i = (MODES.map(function (m) { return m[0]; }).indexOf(mode) + 1) % MODES.length;
                mode = MODES[i][0];
                modeBtn.textContent = MODES[i][1];
                modeBtn.setAttribute('data-mode', mode);
            });
            this.form.addEventListener('submit', function (e) {
                e.preventDefault();
                var text = input.value.trim();
                if (!text) { input.focus(); input.placeholder = '先写点什么再发送吧～'; return; }
                if (!BP.dmOn()) BP.setDm(true);
                self.send(text, [color, mode].join(' ').trim());
                input.value = '';
            });
        }

        // 全屏：原生全屏不支持时（比如 iPhone）退回「网页全屏」
        var fsChange = function () {
            var fs = document.fullscreenElement === root || document.webkitFullscreenElement === root;
            root.classList.toggle('bp-fs', fs);
            self.fullBtn.setAttribute('aria-label', fs ? '退出全屏' : '全屏');
        };
        document.addEventListener('fullscreenchange', fsChange);
        document.addEventListener('webkitfullscreenchange', fsChange);
        var idleT = 0;
        root.addEventListener('pointermove', function () {
            root.classList.remove('idle');
            clearTimeout(idleT);
            idleT = setTimeout(function () { if (self.playing) root.classList.add('idle'); }, 2600);
        });

        if ('ResizeObserver' in window) new ResizeObserver(function () { self._resize(); }).observe(this.screen);
        else window.addEventListener('resize', function () { self._resize(); });
    };

    /* ---------- 时间轴：显示时间 ↔ 片内时间（互动视频会拼接不同分支） ---------- */
    Player.prototype.duration = function () {
        return this.path.reduce(function (s, p) { return s + p.to - p.from; }, 0);
    };
    Player.prototype._segIndex = function (d) {
        var off = 0;
        for (var i = 0; i < this.path.length; i++) {
            off += this.path[i].to - this.path[i].from;
            if (d < off) return i;
        }
        return this.path.length - 1;
    };
    Player.prototype.filmTime = function (d) {
        if (d == null) d = this.t;
        var off = 0;
        for (var i = 0; i < this.path.length; i++) {
            var p = this.path[i], len = p.to - p.from;
            if (d < off + len || i === this.path.length - 1) return p.from + U.clamp(d - off, 0, len - 1e-3);
            off += len;
        }
        return 0;
    };
    Player.prototype.displayTime = function (f) {
        var off = 0;
        for (var i = 0; i < this.path.length; i++) {
            var p = this.path[i];
            if (f >= p.from && f < p.to) return off + (f - p.from);
            off += p.to - p.from;
        }
        return null;
    };

    /* ---------- 播放控制 ---------- */
    Player.prototype.play = function (o) {
        o = o || {};
        if (this.playing) return;
        if (!o.auto) this.userPaused = false;
        if (this.choiceOpen) return;
        this.posterMode = false;
        if (this.t >= this.duration() - .02) {
            if (this.film.choice && !this.chosen) { this.render(); this._showChoice(); return; }
            this.resetPath();
            this.t = 0;
        }
        this._hideEnd();
        this.playing = true;
        this.root.classList.add('is-playing');
        this.playBtn.setAttribute('aria-label', '暂停');
        this.bigBtn.hidden = true;
        this._last = 0;
        if (!this.muted) BP.all.forEach(function (p) { if (p !== this && p.playing && !p.muted) p.pause({ auto: true }); }, this);
        this._audioStart();
        this._unmuteHint();
        cancelAnimationFrame(this._raf);
        this._raf = requestAnimationFrame(this._loopB);
        this.emit('play', o);
    };
    Player.prototype.pause = function (o) {
        o = o || {};
        if (!this.playing) return;
        this.playing = false;
        if (!o.auto && !o.silent) this.userPaused = true;
        cancelAnimationFrame(this._raf);
        this._raf = 0;
        this._audioStop();
        this.root.classList.remove('is-playing', 'idle');
        this.playBtn.setAttribute('aria-label', '播放');
        this.bigBtn.hidden = !!(o.silent || this.choiceOpen || this.endOpen);
        this._unmuteHint();
        this.emit('pause', o);
    };
    Player.prototype.toggle = function () {
        if (this.choiceOpen) return;
        if (this.playing) this.pause(); else this.play();
    };
    Player.prototype.seek = function (d, o) {
        o = o || {};
        this.posterMode = false;
        var dur = this.duration();
        this.t = U.clamp(d, 0, dur);
        if (this.t < dur - .05) {
            this._hideEnd();
            if (this.choiceOpen) { this.choiceOpen = false; this.choiceEl.hidden = true; this.root.classList.remove('at-choice'); }
        }
        if (!this.playing) this.bigBtn.hidden = !!(this.choiceOpen || this.endOpen || this.bar.classList.contains('dragging'));
        if (this.playing) this._audioStart();
        this.render();
        if (!o.quiet) this.emit('seek', this.t);
    };
    Player.prototype.setRate = function (r) {
        this.rate = r;
        Array.prototype.forEach.call(this.rateWrap.querySelectorAll('[data-rate]'), function (b) {
            b.setAttribute('aria-checked', String(parseFloat(b.getAttribute('data-rate')) === r));
        });
        this.rateBtn.textContent = r === 1 ? '倍速' : r + 'x';
        if (this.playing) this._audioStart();
        this.toast('已切换到 ' + (r === 1 ? '1.0' : r) + ' 倍速');
    };
    Player.prototype.setVolume = function (v) {
        this.volume = U.clamp(Math.round(v * 100) / 100, 0, 1);
        this.volRange.value = Math.round(this.volume * 100);
        if (this.volume > 0 && this.muted) { this.setMuted(false); return; }
        if (this.bus) this.bus.vol(this.volume);
        this._volIcon();
    };
    Player.prototype.setMuted = function (m) {
        this.muted = m;
        this.soundTouched = true;
        if (!m && this.volume === 0) { this.volume = .5; this.volRange.value = 50; }
        if (m) this._audioStop();
        else if (this.playing) {
            BP.all.forEach(function (p) { if (p !== this && p.playing && !p.muted) p.pause({ auto: true }); }, this);
            this._audioStart();
        }
        this._volIcon();
        this._unmuteHint();
        this.emit('mute', m);
    };
    Player.prototype._volIcon = function () {
        var off = this.muted || this.volume === 0;
        this.root.classList.toggle('is-muted', off);
        this.root.classList.toggle('vol-low', !off && this.volume < .45);
        this.muteBtn.setAttribute('aria-label', off ? '取消静音' : '静音');
    };
    Player.prototype._unmuteHint = function () {
        this.unmuteBtn.hidden = !(this.playing && this.muted && !this.soundTouched && Synth.ok);
    };
    Player.prototype.toggleFullscreen = function () {
        var root = this.root, d = document;
        if (root.classList.contains('bp-webfull')) {
            root.classList.remove('bp-webfull', 'bp-fs');
            document.documentElement.classList.remove('bp-lock');
            return;
        }
        if (d.fullscreenElement === root || d.webkitFullscreenElement === root) {
            (d.exitFullscreen || d.webkitExitFullscreen).call(d);
            return;
        }
        var req = root.requestFullscreen || root.webkitRequestFullscreen;
        var web = function () {
            root.classList.add('bp-webfull', 'bp-fs');
            document.documentElement.classList.add('bp-lock');
        };
        if (!req) { web(); return; }
        try {
            var r = req.call(root);
            if (r && r.catch) r.catch(web);
        } catch (e) { web(); }
    };

    Player.prototype._loop = function (now) {
        this._raf = 0;
        if (!this.playing) return;
        var dt = this._last ? Math.min(.1, (now - this._last) / 1000) : 0;
        this._last = now;
        var prevSeg = this._segIndex(this.t);
        var d = this.t + dt * this.rate;
        var end = this.duration();
        if (d >= end) {
            if (this.film.choice && !this.chosen) {
                this.t = end; this.render();
                this.pause({ silent: true });
                this._showChoice();
                return;
            }
            if (this.o.loop) {
                this.t = 0;
                this._audioStart();
                this.emit('loop');
            } else {
                this.t = end; this.render();
                this.pause({ silent: true });
                this._showEnd();
                return;
            }
        } else {
            this.t = d;
            if (this._segIndex(d) !== prevSeg) this._audioStart();
        }
        this.render();
        this._audioTick();
        this._raf = requestAnimationFrame(this._loopB);
    };

    /* ---------- 声音调度：提前 0.3 秒把要响的音排进 Web Audio ---------- */
    Player.prototype._audioStart = function () {
        this._audioStop();
        if (this.muted || !this.playing || !this.events.length || !Synth.ok) return;
        if (!Synth.init()) return;
        Synth.resume();
        this.bus = new Synth.Bus(this.volume);
        this.evi = lowerBound(this.events, this.filmTime() - .01, 't');
    };
    Player.prototype._audioStop = function () {
        if (this.bus) { this.bus.kill(); this.bus = null; }
    };
    Player.prototype._audioTick = function () {
        if (!this.bus) return;
        var ctx = Synth.ctx();
        if (!ctx || ctx.state !== 'running') return;
        var f = this.filmTime(), seg = this.path[this._segIndex(this.t)];
        var horizon = Math.min(f + .3 * this.rate, seg.to);
        var now = ctx.currentTime;
        while (this.evi < this.events.length && this.events[this.evi].t < horizon) {
            var e = this.events[this.evi++];
            if (e.t < f - .06) continue;
            try { Synth.play(this.bus, e.fn, now + Math.max(0, (e.t - f) / this.rate), e.p); } catch (err) { /* 个别浏览器不支持的节点，跳过这个音 */ }
        }
    };

    /* ---------- 画面 ---------- */
    Player.prototype._resize = function () {
        var w = this.screen.clientWidth, h = this.screen.clientHeight;
        if (w < 2 || h < 2) return;
        // 画面保持 16:9 居中（全屏时多出来的地方留黑边）
        var cw = Math.min(w, h * 16 / 9), chh = cw * 9 / 16;
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var s = this.canvas.style;
        s.width = cw + 'px'; s.height = chh + 'px';
        s.left = (w - cw) / 2 + 'px'; s.top = (h - chh) / 2 + 'px';
        var pw = Math.round(cw * dpr), ph = Math.round(chh * dpr);
        if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
        this.k = pw / 1280;
        this.sw = w; this.sh = h;
        this.fs = U.clamp(w / 38, 12, 27);
        this.laneH = Math.round(this.fs * 1.42);
        this.dmLayer.style.setProperty('--fs', this.fs.toFixed(1) + 'px');
        this.subEl.style.setProperty('--sfs', U.clamp(w / 34, 13, 30).toFixed(1) + 'px');
        this._layoutDm();
        this._measureSegs();
        this.render();
    };
    Player.prototype.relayout = function () { this._resize(); };

    Player.prototype.render = function () {
        if (!this.k) return;
        var c = this.ctx;
        var f = this.posterMode ? this.film.poster : this.filmTime();
        c.setTransform(this.k, 0, 0, this.k, 0, 0);
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
        this.film.render(c, f, this.state);
        this.root.classList.toggle('poster', !!this.posterMode);
        if (!this.posterMode) {
            this._drawDm(this.t);
            this._drawSub(f);
        }
        this._drawBanner(f);
        this._drawUI();
    };

    Player.prototype._drawSub = function (f) {
        var subs = this.film.subs || [], s = null;
        for (var i = 0; i < subs.length; i++) if (f >= subs[i][0] && f < subs[i][1]) { s = subs[i]; break; }
        var text = '', cls = '';
        if (s) {
            var o = s[3] || {};
            text = s[2];
            cls = o.cls || '';
            if (o.cps) text = Array.from(text).slice(0, Math.max(1, Math.ceil((f - s[0]) * o.cps))).join('');
        }
        if (text !== this._subText || cls !== this._subCls) {
            this._subText = text; this._subCls = cls;
            this.subSpan.textContent = text;
            this.subEl.className = 'bp-sub' + (text ? ' on' : '') + (cls ? ' ' + cls : '');
        }
    };
    Player.prototype._drawBanner = function (f) {
        var on = !this.posterMode && (this.film.energy || []).some(function (e) { return f >= e && f < e + 2.4; });
        if (on !== this._bannerOn) { this._bannerOn = on; this.banner.classList.toggle('show', on); }
    };

    /* ---------- 进度条：章节分段 + 高能曲线 + 悬停预览 ---------- */
    Player.prototype._buildSegs = function () {
        var self = this, chs = [];
        var chapters = this.film.chapters || [{ t: 0, title: '' }];
        var off = 0;
        this.path.forEach(function (p) {
            var list = chapters.filter(function (c) { return c.t >= p.from && c.t < p.to; });
            if (!list.length || list[0].t > p.from) list.unshift({ t: p.from, title: p.title || (chs.length ? chs[chs.length - 1].title : '') });
            list.forEach(function (c, i) {
                var next = i + 1 < list.length ? list[i + 1].t : p.to;
                chs.push({ a: off + c.t - p.from, b: off + next - p.from, title: c.title, branch: !!p.title });
            });
            off += p.to - p.from;
        });
        this.segsEl.innerHTML = '';
        chs.forEach(function (ch) {
            var el = document.createElement('div');
            el.className = 'bp-seg' + (ch.branch ? ' branch' : '');
            el.style.flex = Math.max(ch.b - ch.a, .01) + ' 1 0';
            var fill = document.createElement('i');
            el.appendChild(fill);
            self.segsEl.appendChild(el);
            ch.el = el; ch.fill = fill; ch.k = -1;
        });
        if (this.film.choice && !this.chosen) {
            var qm = document.createElement('span');
            qm.className = 'bp-q';
            qm.title = '互动视频：结局由你选';
            qm.textContent = '?';
            this.segsEl.appendChild(qm);
        }
        this.chs = chs;
        this._sec = -1;
        this._measureSegs();
    };
    Player.prototype._measureSegs = function () {
        this.chs.forEach(function (ch) { ch.x = ch.el.offsetLeft; ch.w = ch.el.offsetWidth; });
    };
    Player.prototype._chIndex = function (d) {
        var idx = 0;
        for (var i = 0; i < this.chs.length; i++) if (d >= this.chs[i].a - 1e-6) idx = i;
        return idx;
    };
    Player.prototype._displayAt = function (clientX) {
        var chs = this.chs;
        for (var i = 0; i < chs.length; i++) {
            var r = chs[i].el.getBoundingClientRect();
            if (clientX <= r.right + 1 || i === chs.length - 1) {
                var k = r.width ? U.clamp((clientX - r.left) / r.width, 0, 1) : 0;
                return chs[i].a + k * (chs[i].b - chs[i].a);
            }
        }
        return 0;
    };
    Player.prototype._tip = function (clientX) {
        var d = this._displayAt(clientX), br = this.bar.getBoundingClientRect();
        var ch = this.chs[this._chIndex(d)];
        this.tipText.textContent = U.fmt(d) + (ch && ch.title ? ' · ' + ch.title : '');
        this.tip.style.left = U.clamp(clientX - br.left, 84, br.width - 84) + 'px';
        BP.still(this.tipCanvas, this.film, this.filmTime(d), this.state);
    };
    Player.prototype._buildHeat = function () {
        var N = 120, dur = this.duration() || 1, h = [], i;
        for (i = 0; i < N; i++) h[i] = 0;
        this.dm.forEach(function (m) {
            var j = Math.floor(m.d / dur * N);
            if (j >= 0 && j < N) h[j] += m.mode === 'scroll' ? 1 : 2;
        });
        var sm = [], max = .001;
        for (i = 0; i < N; i++) {
            var s = 0, ws = 0;
            for (var k = -4; k <= 4; k++) {
                var j = i + k;
                if (j < 0 || j >= N) continue;
                var w = Math.exp(-k * k / 6);
                s += h[j] * w; ws += w;
            }
            sm[i] = s / ws;
            if (sm[i] > max) max = sm[i];
        }
        var pts = sm.map(function (v, i) { return (i / (N - 1) * 1000).toFixed(1) + ' ' + (40 - (.06 + .94 * v / max) * 36).toFixed(1); });
        this.heat.setAttribute('d', 'M0 40 L' + pts.join(' L') + ' L1000 40Z');
    };
    Player.prototype._drawUI = function () {
        var d = this.t, dur = this.duration(), sec = Math.floor(d + 1e-6);
        if (sec !== this._sec || dur !== this._dur) {
            this._sec = sec; this._dur = dur;
            this.curEl.textContent = U.fmt(d);
            this.durEl.textContent = U.fmt(dur);
            this.bar.setAttribute('aria-valuemax', String(Math.floor(dur)));
            this.bar.setAttribute('aria-valuenow', String(sec));
            this.bar.setAttribute('aria-valuetext', U.fmt(d) + ' / ' + U.fmt(dur));
            if (this.sendAt) this.sendAt.textContent = U.fmt(d);
            this.emit('second', sec);
        }
        for (var i = 0; i < this.chs.length; i++) {
            var ch = this.chs[i], k = U.seg(d, ch.a, ch.b);
            if (ch.k !== k) { ch.k = k; ch.fill.style.transform = 'scaleX(' + k + ')'; }
        }
        var cur = this.chs[this._chIndex(d)];
        if (cur && cur.w != null) this.knob.style.transform = 'translate(' + (cur.x + U.seg(d, cur.a, cur.b) * cur.w).toFixed(1) + 'px,-55%)';
    };

    /* ---------- 弹幕 ---------- */
    Player.prototype._loadMine = function () {
        this.mine = [];
        try { this.mine = JSON.parse(localStorage.getItem('bp-dm-' + this.film.id) || '[]') || []; } catch (e) { this.mine = []; }
    };
    Player.prototype._saveMine = function () {
        try { localStorage.setItem('bp-dm-' + this.film.id, JSON.stringify(this.mine.slice(-60))); } catch (e) { /* 隐身模式存不了就算了 */ }
    };
    Player.prototype._initDm = function () {
        var self = this;
        this.all = (this.film.danmaku || []).map(function (a) { return mkDm(a[0], a[1], a[2]); });
        this.mine.forEach(function (x) {
            var m = mkDm(x.t, x.text, x.s);
            m.mine = true;
            self.all.push(m);
        });
        this._mapDm();
    };
    Player.prototype._mapDm = function () {
        var self = this, out = [];
        this.all.forEach(function (m) {
            var d = self.displayTime(m.ft);
            if (d != null) { m.d = d; out.push(m); }
        });
        out.sort(function (a, b) { return a.d - b.d; });
        this.dm = out;
        this._layoutDm();
        this._buildHeat();
        this.emit('dm', out);
    };
    // 给每条弹幕分配轨道：同一条轨道上后一条既不能压住前一条，也不能在屏幕里追上它
    Player.prototype._layoutDm = function () {
        var W = this.sw, H = this.sh, lh = this.laneH;
        if (!W || !this.dm) return;
        var font = '700 ' + this.fs + 'px ' + FONT.body, fontBig = '700 ' + (this.fs * 1.3) + 'px ' + FONT.body;
        var nL = Math.max(1, Math.floor((H * (this.film.dmArea || .75) - 4) / lh));
        var nF = Math.max(1, Math.floor(H * .3 / lh));
        var lanes = [], rows = { top: [], bottom: [] }, DUR = this.dmDur;
        var fits = function (a, b) {
            var va = (W + a.w) / a.dur, vb = (W + b.w) / b.dur, dt = b.d - a.d;
            if (va * dt < a.w + 28) return false;
            var remain = a.d + a.dur - b.d;
            return !(remain > 0 && vb * remain > W);
        };
        this.dm.forEach(function (m) {
            m.w = measure(m.text, m.big ? fontBig : font) + (m.mine ? 26 : 0) + (m.jump != null ? 30 : 0);
            if (m.mode === 'scroll') {
                m.dur = DUR;
                var pick = -1, bestI = 0, best = Infinity;
                for (var i = 0; i < nL; i++) {
                    var last = lanes[i];
                    if (!last || fits(last, m)) { pick = i; break; }
                    var free = last.d + last.dur * (last.w + 28) / (W + last.w);
                    if (free < best) { best = free; bestI = i; }
                }
                // 轨道全满时像 B 站一样丢掉这条（自己发的除外）
                m.lane = pick >= 0 ? pick : m.mine ? bestI : -1;
                if (m.lane >= 0) lanes[m.lane] = m;
            } else {
                m.dur = 4;
                var rr = rows[m.mode], r = 0;
                while (r < nF && rr[r] > m.d) r++;
                if (r >= nF) r = m.mine ? 0 : -1;
                if (r >= 0) rr[r] = m.d + 4;
                m.lane = r;
            }
        });
    };
    Player.prototype._dmEl = function (m) {
        var el = document.createElement('span');
        el.className = 'bdm' + (m.color ? ' c-' + m.color : '') + (m.mode !== 'scroll' ? ' fixed' : '') +
            (m.big ? ' big' : '') + (m.mine ? ' mine' : '') + (m.jump != null ? ' jump' : '');
        el.textContent = m.text;
        if (m.jump != null) { el.title = '点一下空降到 ' + U.fmt(m.jump); el._m = m; }
        return el;
    };
    Player.prototype._drawDm = function (d) {
        var list = this.dm, W = this.sw, H = this.sh, lh = this.laneH;
        if (!list || !W) return;
        var lo = lowerBound(list, d - this.maxDur, 'd'), hi = upperBound(list, d, 'd');
        var stamp = ++this._stamp, act = this._act;
        for (var i = lo; i < hi; i++) {
            var m = list[i], p = (d - m.d) / m.dur;
            if (m.lane < 0 || (!m.frozen && (p < 0 || p >= 1))) continue;
            if (!m.el) m.el = this._dmEl(m);
            if (m.el.parentNode !== this.dmLayer) { this.dmLayer.appendChild(m.el); act.push(m); }
            m.seen = stamp;
            if (m.frozen) continue;
            var x, y;
            if (m.mode === 'scroll') { x = W - (W + m.w) * p; y = 4 + m.lane * lh; }
            else {
                x = (W - m.w) / 2;
                y = m.mode === 'top' ? 4 + m.lane * lh : H * .8 - (m.lane + 1) * lh;
                m.el.style.opacity = p > .9 ? ((1 - p) / .1).toFixed(2) : '1';
            }
            m.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        }
        var keep = [];
        for (var j = 0; j < act.length; j++) {
            var a = act[j];
            if (a.seen === stamp || a.frozen) keep.push(a);
            else if (a.el && a.el.parentNode) a.el.parentNode.removeChild(a.el);
        }
        this._act = keep;
    };
    Player.prototype._jump = function (m) {
        m.frozen = false;
        this.seek(m.jump);
        this.toast('空降成功！已跳到 ' + U.fmt(m.jump));
        if (!this.playing) this.play();
    };
    Player.prototype.send = function (text, style) {
        text = String(text || '').trim().slice(0, 30);
        if (!text) return null;
        var f = this.filmTime() + .05;
        var m = mkDm(f, text, style);
        m.mine = true;
        this.all.push(m);
        this.mine.push({ t: Math.round(f * 100) / 100, text: text, s: style || '' });
        this._saveMine();
        this.posterMode = false;
        this._mapDm();
        this.render();
        this.toast('弹幕已发送 · 它会一直留在 ' + U.fmt(this.t) + ' 这一秒');
        this.emit('send', m);
        return m;
    };
    Player.prototype.clearMine = function () {
        this.all = this.all.filter(function (m) {
            if (m.mine && m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el);
            return !m.mine;
        });
        this.mine = [];
        this._saveMine();
        this._mapDm();
        this.render();
    };
    Player.prototype.danmakuList = function () { return this.dm || []; };

    /* ---------- 互动视频：选项 / 结局 ---------- */
    Player.prototype._showChoice = function () {
        var ch = this.film.choice, self = this;
        if (!ch) return;
        this.choiceOpen = true;
        this.bigBtn.hidden = true;
        this.choiceQ.textContent = ch.q;
        this.choiceOpts.innerHTML = '';
        ch.options.forEach(function (o) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'bp-opt ' + (o.cls || '');
            b.innerHTML = '<span class="bp-opt-ico" aria-hidden="true">' + o.icon + '</span><span class="bp-opt-t">' + esc(o.label) + '</span>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '');
            b.addEventListener('click', function (e) { e.stopPropagation(); self.choose(o.id); });
            self.choiceOpts.appendChild(b);
        });
        this.choiceEl.hidden = false;
        this.root.classList.add('at-choice');
        this.emit('choice');
        if (this.root.contains(document.activeElement)) {
            var first = this.choiceOpts.querySelector('button');
            if (first) first.focus({ preventScroll: true });
        }
    };
    Player.prototype.choose = function (id) {
        var ch = this.film.choice;
        var o = ch && ch.options.filter(function (x) { return x.id === id; })[0];
        if (!o) return;
        this.chosen = id;
        this.path = [this.trunk, { from: o.from, to: o.to, title: o.title }];
        this.choiceOpen = false;
        this.choiceEl.hidden = true;
        this.root.classList.remove('at-choice');
        this._mapDm();
        this._buildSegs();
        this._hideEnd();
        this.t = this.trunk.to - this.trunk.from;
        this.emit('choose', id);
        this.play();
    };
    Player.prototype.resetPath = function () {
        if (!this.film.choice || !this.chosen) return;
        this.chosen = null;
        this.path = [this.trunk];
        this._mapDm();
        this._buildSegs();
    };
    Player.prototype.rechoose = function () {
        this.pause({ silent: true });
        this.resetPath();
        this._hideEnd();
        this.t = this.duration();
        this.render();
        this._showChoice();
    };
    Player.prototype._showEnd = function () {
        var self = this;
        var info = this.o.onEnd ? this.o.onEnd(this) : null;
        this.endOpen = true;
        this.bigBtn.hidden = true;
        this.endT.textContent = (info && info.title) || '播放结束';
        this.endActs.innerHTML = '';
        [{ label: '↺ 重播', fn: function () { self.replay(); } }].concat((info && info.actions) || []).forEach(function (a) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'bp-end-btn ' + (a.cls || '');
            b.textContent = a.label;
            b.addEventListener('click', function (e) { e.stopPropagation(); a.fn(); });
            self.endActs.appendChild(b);
        });
        this.endEl.hidden = false;
        this.emit('ended', this.chosen);
    };
    Player.prototype._hideEnd = function () {
        if (!this.endOpen) return;
        this.endOpen = false;
        this.endEl.hidden = true;
    };
    Player.prototype.replay = function () {
        this._hideEnd();
        this.resetPath();
        this.seek(0);
        this.play();
    };

    Player.prototype.toast = function (msg) {
        var el = this.toastEl;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(this._toastT);
        this._toastT = setTimeout(function () { el.classList.remove('show'); }, 2000);
    };

    BP.Player = Player;

    // 字体加载完后重新量一次弹幕宽度、重画
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { BP.all.forEach(function (p) { p.relayout(); }); });
})();
