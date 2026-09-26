/* =========================================================
   film-summer.js · P1 播放器里的「名场面」
   第 12 话「最后的夏天」：黄昏的山坡，两个人，
   还有一句被烟花盖住的告白。
   每一帧都是按时间 t 现算的，所以进度条可以随便拖。
   ========================================================= */
(function () {
    'use strict';
    var BP = window.BP, U = BP.U, G = BP.G, FONT = G.FONT;
    var TAU = Math.PI * 2;
    var SIL = '#12091F';

    /* ---------------- 场景里固定的东西（用种子随机，每次都一样） ---------------- */
    var rnd = U.rng(20090626);
    function hillY(x) { return 628 - 66 * Math.exp(-Math.pow((x - 500) / 300, 2)) - 10 * Math.sin(x / 150); }

    var STARS = [];
    for (var i = 0; i < 80; i++) STARS.push({ x: rnd() * 1280, y: rnd() * 400, r: .7 + rnd() * 1.7, sp: 1.2 + rnd() * 2.6, ph: rnd() * TAU });
    var TOWN = [];
    for (i = 0; i < 46; i++) {
        var tx = 650 + rnd() * 620;
        TOWN.push({ x: tx, y: hillY(tx) - 12 - rnd() * 34, w: 3 + rnd() * 5, ph: rnd() * TAU, warm: rnd() > .4, on: rnd() });
    }
    var FLIES = [];
    for (i = 0; i < 10; i++) FLIES.push({ x: 90 + rnd() * 1100, y: 575 + rnd() * 110, ax: 20 + rnd() * 40, ay: 10 + rnd() * 20, sp: .3 + rnd() * .5, ph: rnd() * TAU });
    var GRASS = [];
    for (i = 0; i < 110; i++) GRASS.push({ x: -20 + rnd() * 1320, h: 12 + rnd() * 26, lean: rnd() * 6 - 3 });
    var CLOUDS = [
        { x: 180, y: 250, w: 380, h: 24, sp: 6 },
        { x: 760, y: 305, w: 460, h: 20, sp: 4 },
        { x: 1040, y: 196, w: 300, h: 16, sp: 8 }
    ];

    /* ---------------- 烟花 ---------------- */
    // t 升空时刻，(x, y) 炸开的位置，rise 升空用时
    var FW = [
        { t: 22.6, x: 640, y: 170, c: ['#FF6699', '#FFC2D6'], type: 'peony', n: 120, s: 1.35, rise: 1.4 },
        { t: 24.8, x: 320, y: 230, c: ['#6ED6FF'], type: 'ring', n: 72, s: .9, rise: 1.1 },
        { t: 25.4, x: 980, y: 210, c: ['#FFDE59', '#FFF3B0'], type: 'peony', n: 90, s: 1, rise: 1.15 },
        { t: 26.2, x: 780, y: 150, c: ['#FF7EAB', '#FFB3CB'], type: 'heart', n: 110, s: 1.05, rise: 1.2 },
        { t: 27.5, x: 430, y: 170, c: ['#FFD27A'], type: 'willow', n: 90, s: 1.1, rise: 1.2 },
        { t: 28.6, x: 1010, y: 260, c: ['#6ED6FF', '#FFFFFF'], type: 'peony', n: 80, s: .8, rise: 1 },
        { t: 29.3, x: 640, y: 175, c: ['#3CC8FF', '#BDEBFF'], type: 'tv', n: 150, s: 1.15, rise: 1.3 },
        { t: 31.3, x: 300, y: 200, c: ['#FF6699', '#FFDE59'], type: 'peony', n: 90, s: .95, rise: 1.1 },
        { t: 31.8, x: 930, y: 170, c: ['#FFDE59'], type: 'ring', n: 64, s: .95, rise: 1.1 },
        { t: 32.7, x: 620, y: 190, c: ['#FFD27A'], type: 'willow', n: 110, s: 1.35, rise: 1.25 }
    ];
    var LIFE = { peony: 2, ring: 1.8, willow: 3.4, heart: 2.5, tv: 2.7 };

    function heartPts(n) {
        var out = [];
        for (var i = 0; i < n; i++) {
            var a = i / n * TAU, s = Math.sin(a);
            out.push([16 * s * s * s / 17, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17]);
        }
        return out;
    }
    // 小电视的轮廓：在原始 240×214 坐标里取点，再缩放到 ±1
    function tvPts(n) {
        var shapes = [];
        function line(x1, y1, x2, y2, w) { shapes.push({ w: w, f: function (u) { return [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u]; } }); }
        function rrect(x, y, w, h, r, wt) {
            var L = 2 * (w - 2 * r) + 2 * (h - 2 * r) + TAU * r;
            shapes.push({ w: wt, f: function (u) {
                var s = u * L, arc = Math.PI * r / 2, segs = [
                    [w - 2 * r, function (d) { return [x + r + d, y]; }],
                    [arc, function (d) { var a = -Math.PI / 2 + d / r; return [x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]; }],
                    [h - 2 * r, function (d) { return [x + w, y + r + d]; }],
                    [arc, function (d) { var a = d / r; return [x + w - r + Math.cos(a) * r, y + h - r + Math.sin(a) * r]; }],
                    [w - 2 * r, function (d) { return [x + w - r - d, y + h]; }],
                    [arc, function (d) { var a = Math.PI / 2 + d / r; return [x + r + Math.cos(a) * r, y + h - r + Math.sin(a) * r]; }],
                    [h - 2 * r, function (d) { return [x, y + h - r - d]; }],
                    [arc, function (d) { var a = Math.PI + d / r; return [x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]; }]
                ];
                for (var i = 0; i < segs.length; i++) { if (s <= segs[i][0]) return segs[i][1](s); s -= segs[i][0]; }
                return [x + r, y];
            } });
        }
        rrect(20, 46, 200, 148, 36, .44);
        rrect(44, 68, 152, 104, 22, .24);
        line(72, 12, 96, 48, .06);
        line(168, 12, 144, 48, .06);
        line(87.5, 98, 87.5, 124, .045);
        line(152.5, 98, 152.5, 124, .045);
        shapes.push({ w: .07, f: function (u) { return [104 + 32 * u, 138 + 7 * Math.abs(Math.sin(u * TAU))]; } });
        var out = [], total = shapes.reduce(function (s, x) { return s + x.w; }, 0);
        shapes.forEach(function (sh) {
            var cnt = Math.max(2, Math.round(n * sh.w / total));
            for (var i = 0; i < cnt; i++) { var p = sh.f((i + .5) / cnt); out.push([(p[0] - 120) / 105, (p[1] - 110) / 105]); }
        });
        return out;
    }

    FW.forEach(function (f, k) {
        var r = U.rng(1000 + k * 17);
        f.tb = f.t + f.rise;
        f.life = LIFE[f.type];
        f.x0 = f.x + (r() - .5) * 80;
        var pts = f.type === 'heart' ? heartPts(f.n) : f.type === 'tv' ? tvPts(f.n) : null;
        if (pts) f.n = pts.length;
        f.p = [];
        for (var i = 0; i < f.n; i++) {
            var v = f.type === 'ring' ? .96 + r() * .08 : f.type === 'peony' ? Math.sqrt(1 - Math.pow(r() * 2 - 1, 2)) * .85 + .15 : .55 + r() * .5;
            f.p.push({ a: i / f.n * TAU + r() * .1, v: v, c: f.c[i % f.c.length], ph: r() * TAU, tx: pts ? pts[i][0] : 0, ty: pts ? pts[i][1] : 0 });
        }
    });

    function fwPos(f, p, tau) {
        if (f.type === 'heart' || f.type === 'tv') {
            var e = 1 - Math.exp(-3.4 * tau), R = 150 * f.s, sag = Math.max(0, tau - .5);
            return [f.x + p.tx * R * e, f.y + p.ty * R * e + 22 * sag * sag];
        }
        var willow = f.type === 'willow';
        var K = willow ? 1.1 : 1.8, V = (willow ? 230 : 300) * f.s * p.v, g = willow ? 70 : 36;
        var e2 = (1 - Math.exp(-K * tau)) / K;
        return [f.x + Math.cos(p.a) * V * e2, f.y + Math.sin(p.a) * V * e2 * (f.type === 'ring' ? .8 : 1) + .5 * g * tau * tau];
    }
    // 当前烟花把天空照得多亮、主色是什么
    function glowAmt(t) {
        var best = 0, col = '#FFFFFF', sum = 0;
        FW.forEach(function (f) {
            var tau = t - f.tb;
            if (tau < 0 || tau > 3) return;
            var a = f.s * .45 * Math.exp(-tau / .6);
            sum += a;
            if (a > best) { best = a; col = f.c[0]; }
        });
        return { a: Math.min(.6, sum), color: col };
    }

    /* ---------------- 各个图层 ---------------- */
    function dusk(t) { return U.eio(U.seg(t, 0, 23)); }

    // 低分辨率图层：天空渐变、烟花泛光、烟雾本来就是糊的，
    // 先画在小画布上再放大贴回来，比每帧画全屏渐变省很多
    var lowres = {};
    function low(name) {
        var L = lowres[name];
        if (!L) {
            L = lowres[name] = document.createElement('canvas');
            L.width = 350; L.height = 210;
            L.ctx = L.getContext('2d');
        }
        L.ctx.setTransform(1, 0, 0, 1, 0, 0);
        L.ctx.clearRect(0, 0, 350, 210);
        L.ctx.setTransform(.25, 0, 0, .25, 15, 15);   // 世界坐标 (-60,-60)~(1340,780) → 350×210
        return L;
    }
    var skyCache = { k: -1, cv: null };
    function sky(c, t) {
        var k = Math.round(dusk(t) * 48) / 48;
        if (!skyCache.cv) {
            skyCache.cv = document.createElement('canvas');
            skyCache.cv.width = 4; skyCache.cv.height = 256;
        }
        if (skyCache.k !== k) {
            skyCache.k = k;
            var sc = skyCache.cv.getContext('2d');
            var g = sc.createLinearGradient(0, 60 / 840 * 256, 0, 780 / 840 * 256);
            g.addColorStop(0, U.mix('#2A1B5C', '#0B0824', k));
            g.addColorStop(.45, U.mix('#5B2F86', '#241650', k));
            g.addColorStop(.75, U.mix('#FF6F9F', '#6A3274', k));
            g.addColorStop(1, U.mix('#FFB36B', '#A94A6A', k));
            sc.fillStyle = g;
            sc.fillRect(0, 0, 4, 256);
        }
        c.drawImage(skyCache.cv, -60, -60, 1400, 840);
    }
    function stars(c, t) {
        var vis = .3 + .7 * U.seg(t, 2, 20);
        c.fillStyle = '#fff';
        STARS.forEach(function (s) {
            c.globalAlpha = vis * (.35 + .65 * Math.pow(Math.sin(t * s.sp + s.ph) * .5 + .5, 2));
            c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
        });
        c.globalAlpha = 1;
        // 11.8 秒有一颗流星
        var k = U.seg(t, 11.8, 12.5);
        if (k > 0 && k < 1) {
            var x = 260 + 300 * k, y = 70 + 130 * k;
            var gr = c.createLinearGradient(x, y, x - 130, y - 56);
            gr.addColorStop(0, 'rgba(255,255,255,' + (1 - k * .7) + ')');
            gr.addColorStop(1, 'rgba(255,255,255,0)');
            c.strokeStyle = gr; c.lineWidth = 2.5; c.lineCap = 'round';
            c.beginPath(); c.moveTo(x, y); c.lineTo(x - 130, y - 56); c.stroke();
        }
    }
    function clouds(c, t) {
        var k = dusk(t);
        c.fillStyle = U.mix('#FFA8C5', '#4A2D6E', k);
        CLOUDS.forEach(function (cl) {
            var x = cl.x + t * cl.sp;
            c.globalAlpha = .55;
            G.rr(c, x - cl.w / 2, cl.y, cl.w, cl.h, cl.h / 2); c.fill();
            G.rr(c, x - cl.w * .22, cl.y - cl.h * .55, cl.w * .5, cl.h, cl.h / 2); c.fill();
        });
        c.globalAlpha = 1;
    }
    function sun(c, t) {
        var x = 900, r = 150, y = 470 + 170 * U.eio(U.seg(t, 0, 22));
        var fade = 1 - U.seg(t, 8, 22);
        var gl = c.createRadialGradient(x, y, r * .6, x, y, r * 2.6);
        gl.addColorStop(0, 'rgba(255,180,140,' + (.12 + .4 * fade).toFixed(3) + ')');
        gl.addColorStop(1, 'rgba(255,120,160,0)');
        c.fillStyle = gl;
        c.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
        c.save();
        G.circle(c, x, y, r);
        c.clip();
        // 太阳下半截的条纹镂空
        c.beginPath();
        c.rect(x - r, y - r, r * 2, r * 2);
        for (var i = 0; i < 5; i++) c.rect(x - r, y + 12 + i * 26, r * 2, 5 + i * 3);
        c.clip('evenodd');
        var g = c.createLinearGradient(0, y - r, 0, y + r);
        g.addColorStop(0, '#FFE08A');
        g.addColorStop(1, '#FF7FA8');
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
        c.restore();
    }
    function ridge(c, pts, color) {
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(pts[0][0], 800);
        pts.forEach(function (p) { c.lineTo(p[0], p[1]); });
        c.lineTo(pts[pts.length - 1][0], 800);
        c.closePath();
        c.fill();
    }
    function farHills(c, t) {
        var k = dusk(t);
        ridge(c, [[-60, 480], [240, 382], [430, 440], [640, 362], [860, 430], [1080, 372], [1340, 432]], U.mix('#6B3A8C', '#2A1A4E', k));
        ridge(c, [[-60, 540], [192, 412], [336, 482], [528, 348], [720, 482], [864, 426], [1056, 512], [1340, 412]], U.mix('#3A1F63', '#1A0F35', k));
    }
    function town(c, t) {
        var on = U.seg(t, 3, 10);   // 天黑了，灯一盏一盏亮起来
        TOWN.forEach(function (L) {
            if (L.on > on) return;
            c.globalAlpha = .55 + .45 * Math.sin(t * 2 + L.ph);
            c.fillStyle = L.warm ? '#FFD27A' : '#FFB36B';
            c.fillRect(L.x, L.y, L.w, 3);
        });
        c.globalAlpha = 1;
    }
    // 烟花照亮夜空：只画最亮的两朵，省一点性能
    function glow(c, t) {
        var lit = [];
        FW.forEach(function (f) {
            var tau = t - f.tb;
            if (tau < 0 || tau > 3) return;
            lit.push({ f: f, a: Math.min(.7, f.s * .55 * Math.exp(-tau / .85)) });
        });
        if (!lit.length) return;
        lit.sort(function (x, y) { return y.a - x.a; });
        var L = low('glow'), lc = L.ctx;
        lc.globalCompositeOperation = 'lighter';
        lit.slice(0, 2).forEach(function (l) {
            var f = l.f, a = l.a;
            var gr = lc.createRadialGradient(f.x, f.y, 0, f.x, f.y, 950);
            gr.addColorStop(0, U.rgba(f.c[0], a));
            gr.addColorStop(.45, U.rgba(f.c[0], a * .45));
            gr.addColorStop(1, U.rgba(f.c[0], a * .12));
            lc.fillStyle = gr;
            lc.fillRect(-60, -60, 1400, 840);
        });
        c.globalCompositeOperation = 'screen';
        c.drawImage(L, -60, -60, 1400, 840);
        c.globalCompositeOperation = 'source-over';
    }
    function rocket(c, f, t) {
        var k = (t - f.t) / f.rise;
        for (var i = 6; i >= 0; i--) {
            var e = U.eo(Math.max(0, k - i * .025));
            c.globalAlpha = (1 - i / 7) * .85;
            c.fillStyle = i ? '#FFD9A0' : '#FFFFFF';
            c.beginPath();
            c.arc(U.lerp(f.x0, f.x, e) + Math.sin((k - i * .025) * 20) * 2, U.lerp(740, f.y, e), (i ? 2 : 3.2) * f.s, 0, TAU);
            c.fill();
        }
        c.globalAlpha = 1;
    }
    function fireworks(c, t) {
        c.globalCompositeOperation = 'lighter';
        c.lineCap = 'round';
        FW.forEach(function (f) {
            if (t < f.t) return;
            if (t < f.tb) { rocket(c, f, t); return; }
            var tau = t - f.tb;
            if (tau > f.life) return;
            if (tau < .25) {
                var R = 80 * f.s, fg = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
                fg.addColorStop(0, 'rgba(255,255,255,' + (1 - tau / .25).toFixed(3) + ')');
                fg.addColorStop(1, 'rgba(255,255,255,0)');
                c.fillStyle = fg;
                c.fillRect(f.x - R, f.y - R, R * 2, R * 2);
            }
            var trail = f.type === 'willow' ? .28 : .07;
            c.lineWidth = (f.type === 'willow' ? 2.2 : 2.8) * f.s;
            var base = Math.pow(1 - tau / f.life, 1.4), late = tau > f.life * .55;
            for (var i = 0; i < f.p.length; i++) {
                var p = f.p[i], a = late ? base * (.55 + .45 * Math.sin(tau * 36 + p.ph)) : base;
                if (a <= .02) continue;
                var p1 = fwPos(f, p, tau), p0 = fwPos(f, p, Math.max(0, tau - trail));
                c.globalAlpha = a;
                c.strokeStyle = p.c;
                c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0] + .01, p1[1]); c.stroke();
            }
        });
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
    }
    // 烟雾：先把一团柔光画进小贴图，之后只缩放贴图，不再每帧新建渐变
    var puff = null;
    function puffSprite() {
        if (puff) return puff;
        puff = document.createElement('canvas');
        puff.width = puff.height = 128;
        var pc = puff.getContext('2d'), gr = pc.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(200,180,230,1)');
        gr.addColorStop(1, 'rgba(200,180,230,0)');
        pc.fillStyle = gr;
        pc.fillRect(0, 0, 128, 128);
        return puff;
    }
    function smoke(c, t) {
        var sp = puffSprite(), L = null;
        FW.forEach(function (f) {
            var age = t - f.tb - .6;
            if (age < 0 || age > 7) return;
            if (!L) L = low('smoke');
            var lc = L.ctx;
            lc.globalAlpha = .08 * f.s * (1 - age / 7) * U.seg(age, 0, .8);
            for (var i = 0; i < 3; i++) {
                var ang = i * 2.1 + f.x * .01, rad = 60 + age * 14;
                var x = f.x + Math.cos(ang) * 70 * f.s + age * 12, y = f.y + Math.sin(ang) * 50 * f.s + age * 6;
                lc.drawImage(sp, x - rad, y - rad, rad * 2, rad * 2);
            }
        });
        if (L) c.drawImage(L, -60, -60, 1400, 840);
    }
    function nearHill(c, t, g) {
        c.fillStyle = '#1E0F36';
        c.beginPath();
        c.moveTo(-60, 800);
        for (var x = -60; x <= 1340; x += 20) c.lineTo(x, hillY(x));
        c.lineTo(1340, 800);
        c.closePath();
        c.fill();
        if (g.a > .02) {
            c.globalAlpha = Math.min(.8, g.a * 1.6);
            c.strokeStyle = g.color;
            c.lineWidth = 2.5;
            c.beginPath();
            for (x = -60; x <= 1340; x += 20) c[x === -60 ? 'moveTo' : 'lineTo'](x, hillY(x));
            c.stroke();
            c.globalAlpha = 1;
        }
    }
    // 坐在山坡上的背影
    function person(c, x, y, o, g) {
        var w = o.w, h = o.h, r = o.r;
        c.save();
        c.translate(x, y);
        c.rotate(o.tilt || 0);
        var hx = o.hx, hy = -h - r * .78 + o.hy;
        c.beginPath();
        c.moveTo(-w * .55, 0);
        c.bezierCurveTo(-w * .58, -h * .55, -w * .5, -h * .92, -w * .2, -h);
        c.lineTo(w * .2, -h);
        c.bezierCurveTo(w * .5, -h * .92, w * .58, -h * .55, w * .55, 0);
        c.closePath();
        c.moveTo(hx + r, hy);
        c.arc(hx, hy, r, 0, TAU);
        c.rect(-r * .35 + hx * .5, -h - 8, r * .7, 12);
        c.fillStyle = SIL;
        c.fill();
        if (g.a > .02) {
            c.globalAlpha = Math.min(.85, g.a * 1.8);
            c.strokeStyle = g.color;
            c.lineWidth = 2;
            c.stroke();
            c.globalAlpha = 1;
        }
        c.fillStyle = SIL;
        c.beginPath();
        if (o.hair === 'boy') {
            c.moveTo(hx - r * .85, hy - r * .4);
            c.lineTo(hx - r * .6, hy - r * 1.32);
            c.lineTo(hx - r * .18, hy - r * .88);
            c.lineTo(hx + r * .12, hy - r * 1.45);
            c.lineTo(hx + r * .42, hy - r * .86);
            c.lineTo(hx + r * .88, hy - r * 1.18);
            c.lineTo(hx + r * .92, hy - r * .35);
            c.closePath();
            c.fill();
        } else {
            // 马尾被风吹着飘
            var sway = Math.sin(o.t * 1.6) * .16 + Math.sin(o.t * 2.7) * .05;
            c.save();
            c.translate(hx + r * .55, hy - r * .4);
            c.rotate(.55 + sway);
            c.moveTo(0, -5);
            c.quadraticCurveTo(r * 1.15, -2, r * 1.25, r * 1.45);
            c.quadraticCurveTo(r * .5, r * .9, 0, 6);
            c.closePath();
            c.fill();
            c.restore();
            c.beginPath();
            c.moveTo(hx + r * .45, hy - r * .62);
            c.lineTo(hx + r * .98, hy - r * 1.02);
            c.lineTo(hx + r * 1.02, hy - r * .3);
            c.closePath();
            c.fill();
        }
        c.restore();
    }
    function people(c, t, g) {
        // 男生：抬头看烟花；被问「你刚才说什么」时转过来，又慌忙转开
        var bdx = 3 * U.win(t, 27.4, 30.4, .4) - 2.5 * U.win(t, 30.6, 38, .4);
        var bdy = -3 * U.win(t, 24.1, 27.2, .3) - 2 * U.win(t, 30.8, 38, .5);
        person(c, 468, hillY(468) + 4, { w: 46, h: 54, r: 19, hx: bdx, hy: bdy, hair: 'boy', t: t }, g);
        // 女生：一开始偏头看他，最后靠在他肩上
        var lean = U.eio(U.seg(t, 33.4, 34.6));
        var gdx = -2 * U.win(t, 4.5, 14, .5) - 13 * lean;
        var gdy = -3 * U.win(t, 24.1, 30, .3) + 6 * lean;
        person(c, 530 - 5 * lean, hillY(530) + 4, { w: 40, h: 48, r: 17, hx: gdx, hy: gdy, tilt: -.16 * lean, hair: 'girl', t: t }, g);
    }
    function grass(c, t) {
        c.strokeStyle = SIL;
        c.lineWidth = 3;
        c.lineCap = 'round';
        c.beginPath();
        GRASS.forEach(function (gs) {
            var by = hillY(gs.x) + 6, bend = Math.sin(t * 1.7 + gs.x * .02) * 5 + gs.lean;
            c.moveTo(gs.x, by);
            c.quadraticCurveTo(gs.x + bend * .3, by - gs.h * .6, gs.x + bend, by - gs.h);
        });
        c.stroke();
    }
    function fireflies(c, t) {
        var on = U.seg(t, 2, 6);
        if (!on) return;
        c.globalCompositeOperation = 'lighter';
        FLIES.forEach(function (f) {
            var x = f.x + Math.sin(t * f.sp + f.ph) * f.ax, y = f.y + Math.sin(t * f.sp * 1.7 + f.ph * 2) * f.ay;
            var b = on * Math.pow(Math.sin(t * 2.2 * f.sp + f.ph) * .5 + .5, 3);
            if (b < .02) return;
            var gr = c.createRadialGradient(x, y, 0, x, y, 14);
            gr.addColorStop(0, 'rgba(230,255,140,' + b.toFixed(3) + ')');
            gr.addColorStop(1, 'rgba(230,255,140,0)');
            c.fillStyle = gr;
            c.fillRect(x - 14, y - 14, 28, 28);
        });
        c.globalCompositeOperation = 'source-over';
    }
    function titleCard(c, t) {
        var a = U.win(t, .8, 4.9, .6);
        if (a <= 0) return;
        c.globalAlpha = a;
        G.text(c, '第 12 话', 1150, 116, { size: 22, font: FONT.mono, weight: 700, fill: '#FFD1E0' });
        c.fillStyle = '#FF6699';
        c.fillRect(1104, 150, 3, 320 * U.eo(U.seg(t, .8, 2)));
        Array.from('最后的夏天').forEach(function (ch, i) {
            G.text(c, ch, 1150, 176 + i * 64, { size: 56, font: FONT.display, weight: 400, fill: '#FFFFFF', shadow: 3, shadowColor: 'rgba(20,8,40,.45)' });
        });
        c.globalAlpha = 1;
    }
    function endCard(c, t) {
        var a = U.seg(t, 35.9, 36.6);
        if (a <= 0) return;
        c.globalAlpha = a * (1 - U.seg(t, 37.4, 38));
        G.text(c, '未完待续', 1110, 632, { size: 48, font: FONT.display, weight: 400, fill: '#FFFFFF' });
        G.text(c, 'TO BE CONTINUED', 1110, 674, { size: 15, font: FONT.mono, weight: 700, fill: '#FFB3CB' });
        c.globalAlpha = 1;
    }

    function render(c, t) {
        var g = glowAmt(t);
        // 镜头：慢慢推近，烟花炸开时一震，然后拉远看满天烟花
        var zoom = 1 + .05 * U.eio(U.seg(t, 0, 21)) - .05 * U.eio(U.seg(t, 24.2, 32));
        var sx = 0, sy = 0;
        if (t > 24 && t < 24.8) {
            var k = 1 - U.seg(t, 24, 24.8);
            sx = U.shake(t * 3, 1) * 12 * k;
            sy = U.shake(t * 3, 2) * 9 * k;
        }
        c.save();
        c.translate(520 + sx, 540 + sy);
        c.scale(zoom, zoom);
        c.translate(-520, -540);
        sky(c, t);
        stars(c, t);
        clouds(c, t);
        sun(c, t);
        farHills(c, t);
        town(c, t);
        glow(c, t);
        fireworks(c, t);
        smoke(c, t);
        nearHill(c, t, g);
        people(c, t, g);
        grass(c, t);
        fireflies(c, t);
        c.restore();

        if (t >= 24 && t < 24.4) {
            c.fillStyle = 'rgba(255,255,255,' + (.5 * (1 - U.seg(t, 24, 24.4))).toFixed(3) + ')';
            c.fillRect(0, 0, 1280, 720);
        }
        titleCard(c, t);
        endCard(c, t);
        var black = Math.max(1 - U.seg(t, 0, 1.2), U.seg(t, 37.2, 38));
        if (black > 0) {
            c.fillStyle = 'rgba(0,0,0,' + black.toFixed(3) + ')';
            c.fillRect(0, 0, 1280, 720);
        }
    }

    /* ---------------- 字幕 ---------------- */
    var SUBS = [
        [4.5, 8, '「……喂。」', { cls: 'g' }],
        [8.5, 13.6, '「明年夏天，我们还能一起来看烟花吗？」', { cls: 'g' }],
        [14.2, 17.6, '「……笨蛋，当然啊。」', { cls: 'b' }],
        [21.3, 23.55, '「其实，我一直想跟你说……」', { cls: 'b' }],
        [23.6, 24, '「我喜欢——」', { cls: 'b' }],
        [24, 24.4, '「我喜欢——」', { cls: 'b cut' }],
        [24.45, 26.4, '（烟花声）', { cls: 'sfx' }],
        [27.2, 30.2, '「……诶？你刚才说什么？」', { cls: 'g' }],
        [30.6, 33.3, '「没、没什么！……烟花，真好看啊。」', { cls: 'b' }],
        [33.8, 36.4, '「……嗯。我也是。」', { cls: 'g whisper' }]
    ];

    /* ---------------- 弹幕：和剧情一起起伏 ---------------- */
    var DM = [
        [.3, '来了来了'], [.6, '第12话！！', 'p'], [.9, '前排'], [1.2, '空降 00:21', 'y bottom'], [1.6, '终于更新了'],
        [2, '等了一周'], [2.3, '这个夕阳绝了', 'b'], [2.8, '作画经费在燃烧'], [3.1, 'BGM 一响我就想哭'], [3.6, '二刷来了'],
        [4, '这集是神回预定', 'y'], [4.4, '开头就是名场面既视感'], [4.9, '喂——'], [5.2, '喂（小声）', 'p'], [5.6, '他们坐得好近'],
        [6, '萤火虫！', 'b'], [6.5, '空气都是甜的'], [7, '字幕组辛苦了'], [7.4, '这个构图我可以'], [8.2, '来了来了要说了'],
        [8.9, '明年夏天……'], [9.3, '别立 flag 啊！！', 'y'], [9.7, '这句话好危险'], [10.1, '刀子预警', 'p'], [10.6, '编剧你别乱来'],
        [11, '明年夏天（战术后仰）'], [11.6, '我不听我不听'], [12, '流星！！快许愿', 'b'], [12.4, '看到流星了吗'], [13, '女主好温柔'],
        [14.4, '笨蛋（宠溺）', 'p'], [14.8, '啊啊啊啊'], [15.2, '当然啊！！', 'y'], [15.6, '甜死我了'], [16, '磕到了磕到了', 'p'],
        [16.5, '这声笨蛋我能听一百遍'], [17, '嘴角疯狂上扬'], [17.6, '我宣布这是今年最甜'], [18.4, '等等，BGM 停了'], [18.8, '要来了', 'b'],
        [19, '前方高能', 'y top big'], [19.2, '高能预警！！', 'y'], [19.5, '全体起立'], [19.8, '深呼吸'], [20.2, '我已经准备好了', 'p'],
        [20.6, '（紧张）'], [21, '空降成功', 'b'], [21.6, '说啊！！', 'y'], [22, '快说快说', 'p'], [22.3, '要表白了？？'],
        [22.6, '我不敢看了'], [22.9, '（捂眼）'], [23.2, '啊啊啊啊他要说了', 'p'], [23.5, '来了来了来了'],
        [24.05, '啊啊啊啊啊啊啊啊', 'y big'], [24.15, '烟花你等一下！！', 'p big'], [24.25, '没听见！！！'], [24.35, '名场面！！', 'y top'],
        [24.5, '我哭死', 'p'], [24.6, '全体起立！！'], [24.8, '喜欢——什么啊！！', 'b'], [25, '截图了截图了'], [25.2, '这烟花是故意的吧', 'y'],
        [25.4, '编剧出来挨打', 'p'], [25.6, '我听到了！是喜欢你！', 'b'], [25.8, '！！！！！！'], [26, '烟花：我来得正是时候'], [26.3, '这就是青春吧'],
        [26.6, '作画爆炸'], [26.9, '每一帧都是壁纸', 'b'], [27.5, '心形烟花！！', 'p'], [27.7, '爱心！！是爱心！', 'p big'], [27.9, '你刚才说什么（装傻）'],
        [28.2, '她肯定听到了', 'y'], [28.5, '诶？？？'], [28.8, '女主你是故意的吧'], [29.2, '脸红了脸红了', 'p'], [29.6, '这个表情管理'],
        [30, '我替他着急'], [30.8, '小电视烟花！！', 'b big'], [31, 'B 站你好会', 'b'], [31.2, '居然是小电视', 'y'], [31.5, '官方玩梗最为致命'],
        [31.8, '没、没什么（逃）', 'p'], [32.1, '怂了怂了'], [32.4, '你小子！！', 'y'], [32.8, '烟花真好看（指你）', 'p'], [33.2, '这句我能笑一年'],
        [33.9, '……嗯？'], [34.2, '她听到了！！！', 'y big'], [34.4, '我也是？？？？', 'p'], [34.6, '原来她听到了！！', 'b'], [34.8, '双向奔赴！！', 'p'],
        [35, '啊啊啊啊我死了'], [35.2, '编剧我错了你是神', 'y'], [35.5, '这集封神', 'y top'], [35.8, '未完待续？？'], [36, '等一周我会死的'],
        [36.3, '下集预告呢！！', 'p'], [36.6, '三刷打卡', 'b'], [36.9, '给我狠狠地磕'], [37.2, '每年夏天都来重温'], [37.5, '再来一遍', 'y']
    ];
    var FILL = ['好看', 'hhh', '绝了', '泪目', '打卡', '妙啊', '好家伙', '2333', '好美', '这作画', '真好', '青春啊', '好甜', '一键三连了', '哭了'];
    var fr = U.rng(38);
    for (i = 0; i < 22; i++) DM.push([.5 + fr() * 36.5, FILL[Math.floor(fr() * FILL.length)], fr() > .8 ? 'b' : '']);

    /* ---------------- 配乐：王道进行 IV–V–iii–vi ---------------- */
    function score() {
        var S = new BP.Score();
        var bpm = 84, beat = 60 / bpm, bar = beat * 4, T0 = 4;
        var CH = [
            ['F2', ['F3', 'C4', 'E4', 'A4', 'C5', 'E5']],
            ['G2', ['G3', 'D4', 'G4', 'B4', 'D5', 'G5']],
            ['E2', ['E3', 'B3', 'D4', 'G4', 'B4', 'D5']],
            ['A2', ['A3', 'E4', 'G4', 'C5', 'E5', 'A5']]
        ];
        var ARP = [0, 2, 3, 4, 5, 4, 3, 2];
        function arpBar(t, ch, v) {
            for (var i = 0; i < 8; i++) S.note(t + i * beat / 2, 'keys', ch[1][ARP[i]], { v: v * (i === 0 ? 1.2 : 1), d: .5 });
        }
        var b, t, ch;
        // 前奏：轻轻的琶音
        for (b = 0; b < 4; b++) {
            t = T0 + b * bar; ch = CH[b];
            arpBar(t, ch, .045);
            S.note(t, 'bass', ch[0], { v: .09, dur: bar * .95 });
        }
        S.melody(T0, bpm, 'A4:2 C5:2 B4:2 D5:2 G4:2 B4:2 C5:2 E5:2', 'bell', { v: .03 });
        // 第二遍：加上铺底
        for (b = 4; b < 6; b++) {
            t = T0 + b * bar; ch = CH[b - 4];
            arpBar(t, ch, .055);
            S.note(t, 'bass', ch[0], { v: .11, dur: bar * .95 });
            S.at(t, 'pad', { fs: ch[1].slice(0, 4).map(BP.Score.freq), v: .01, dur: bar - .2, a: .8 });
        }
        S.melody(T0 + 4 * bar, bpm, 'A4:1 C5:1 E5:2 B4:1 D5:1 G5:2', 'bell', { v: .035 });
        // 告白前：音乐停住，只剩虫鸣，然后一声升空的哨音
        S.at(22.9, 'riser', { dur: 1.1, v: .07 });
        // 高潮：烟花炸开，整首歌一起进来
        for (b = 7; b < 11; b++) {
            t = T0 + b * bar; ch = CH[(b - 7) % 4];
            arpBar(t, ch, .065);
            S.note(t, 'bass', ch[0], { v: .18, dur: bar * .95 });
            S.at(t, 'pad', { fs: ch[1].slice(0, 5).map(BP.Score.freq), v: .012, dur: bar - .1, a: .12 });
        }
        S.at(24, 'crash', { v: .09 });
        S.melody(24, bpm, 'C5:.5 E5:.5 A5:1.5 G5:.5 F5:.5 E5:.5 D5:.5 G5:.5 B5:1.5 A5:.5 G5:.5 D5:.5 E5:.5 G5:.5 B5:1 A5:.5 G5:.5 E5:1 C5:.5 E5:.5 A5:2 G5:.5 E5:.5', 'lead', { v: .065 });
        // 尾声：一个 F 大七和弦慢慢散掉
        t = T0 + 11 * bar;
        S.note(t, 'bass', 'F2', { v: .12, dur: 1.6 });
        ['F3', 'C4', 'E4', 'A4', 'C5', 'E5'].forEach(function (n, i) { S.note(t + i * .12, 'keys', n, { v: .05, d: .7 }); });
        S.note(t, 'lead', 'E5', { v: .05, dur: 1.4 });
        // 烟花：升空哨音 + 爆炸 + 柳树烟花的噼啪声
        FW.forEach(function (f) {
            S.at(f.t, 'whistle', { dur: f.rise, v: .022 * f.s });
            S.at(f.tb, 'boom', { v: .3 * f.s, big: f.s > 1.2 });
            if (f.type === 'willow') S.at(f.tb + .7, 'crackle', { dur: 1.6, v: .045 });
        });
        // 夏夜：虫鸣和风
        var r = U.rng(7), x;
        for (x = .4; x < 21; x += .7 + r() * .9) S.at(x, 'chirp', { v: .022 });
        for (x = 33.6; x < 37.4; x += .7 + r() * .9) S.at(x, 'chirp', { v: .022 });
        [0, 3.6, 7.2, 10.8, 14.4, 18, 21.2, 33.4].forEach(function (w) { S.at(w, 'wind', { v: .045 }); });
        // 片头一个轻轻的铃音，开声音的人马上能听到点什么
        S.note(.5, 'bell', 'E5', { v: .035, d: 1.2 });
        S.note(1.1, 'bell', 'A5', { v: .03, d: 1.4 });
        return S.done();
    }

    BP.films.summer = {
        id: 'summer',
        title: '第 12 话「最后的夏天」',
        alt: '动画短片：黄昏的山坡上，两个人并肩坐着看烟花，一句告白被烟花声盖住了。',
        duration: 38,
        poster: 31.3,
        subStyle: 'anime',
        dmDur: 7.5,
        chapters: [{ t: 0, title: '黄昏' }, { t: 18.6, title: '告白' }, { t: 24, title: '烟花' }, { t: 33.6, title: '余韵' }],
        energy: [19],
        subs: SUBS,
        danmaku: DM,
        score: score,
        render: render
    };
})();
