/* =========================================================
   film-upload.js · P3 那张视频卡片「真的能点开看」
   【新人UP】第一次投稿，紧张到手抖，求三连！
   主角是 B 站的小电视：平时都是它给大家放视频，
   这次它自己当 UP 主，按「拍 → 剪 → 投 → 被看见」走一遍，
   最后是 B 站的互动视频：一键三连，还是下次一定？
   ========================================================= */
(function () {
    'use strict';
    var BP = window.BP, U = BP.U, G = BP.G, FONT = G.FONT;
    var INK = G.INK, PINK = G.PINK, BLUE = G.BLUE, YELLOW = G.YELLOW;
    var TAU = Math.PI * 2;
    var DESK = 578;

    function ellipse(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, TAU); }
    function pad2(n) { return String(n).padStart(2, '0'); }
    // 眨眼：每隔 period 秒眨一下
    function blink(t, period, off) {
        var p = (t + (off || 0)) % (period || 3.6);
        return p < .14 ? Math.sin(p / .14 * Math.PI) : 0;
    }
    // 落地、惊吓时的压扁回弹
    function bounce(t, times, amt) {
        var s = 0;
        times.forEach(function (bt) {
            var k = t - bt;
            if (k >= 0 && k < .6) s += (amt || .18) * Math.exp(-k * 7) * Math.cos(k * 26);
        });
        return s;
    }

    /* =========================================================
       角色：小电视（坐标沿用开场那只大电视的 240×214 画法）
       ========================================================= */
    var EYES = [[87.5, 112], [152.5, 112]];

    function tv(c, x, y, s, o) {
        o = o || {};
        var t = o.t || 0;
        c.save();
        c.translate(x, y);
        if (o.tilt) c.rotate(o.tilt);
        var sq = o.squash || 0;
        c.scale(s * (1 + sq * .6), s * (1 - sq));
        c.translate(-120, -206);
        c.lineCap = 'round';
        c.lineJoin = 'round';

        // 天线
        var aw = o.ant == null ? Math.sin(t * 3) * .05 : o.ant;
        c.strokeStyle = INK;
        c.lineWidth = 12;
        c.beginPath();
        antenna(c, 96, 48, -24, -36, aw);
        antenna(c, 144, 48, 24, -36, -aw);
        c.stroke();
        // 脚
        c.fillStyle = INK;
        G.rr(c, 62, 186, 28, 20, 7); c.fill();
        G.rr(c, 150, 186, 28, 20, 7); c.fill();
        // 硬投影 + 身体
        if (o.shadow !== false) { G.rr(c, 27, 54, 200, 148, 36); c.fillStyle = INK; c.fill(); }
        G.rr(c, 20, 46, 200, 148, 36);
        c.fillStyle = o.color || BLUE; c.fill();
        c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
        // 屏幕 + 表情
        G.rr(c, 44, 68, 152, 104, 22);
        c.fillStyle = o.screen || '#fff'; c.fill();
        c.save();
        c.clip();
        if (o.noise != null) screenNoise(c, o.noise);
        face(c, o, t);
        c.restore();
        G.rr(c, 44, 68, 152, 104, 22);
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();

        if (o.sweat) sweat(c, t);
        if (o.face === 'joycry') tears(c, t);
        if (o.armL != null) arm(c, 24, 134, -1, o.armL, null, t);
        if (o.armR != null) arm(c, 216, 134, 1, o.armR, o.hold, t);
        c.restore();
    }
    function antenna(c, bx, by, dx, dy, a) {
        var ca = Math.cos(a), sa = Math.sin(a);
        c.moveTo(bx, by);
        c.lineTo(bx + dx * ca - dy * sa, by + dx * sa + dy * ca);
    }
    function screenNoise(c, t) {
        var r = U.rng(Math.floor(t * 18) + 7);
        for (var i = 0; i < 26; i++) {
            c.fillStyle = r() > .5 ? 'rgba(24,25,28,.28)' : 'rgba(255,255,255,.6)';
            c.fillRect(44, 68 + r() * 104, 152, 1 + r() * 4);
        }
    }
    function face(c, o, t) {
        var f = o.face || 'smile';
        var lx = (o.look ? o.look[0] : 0) * 7, ly = (o.look ? o.look[1] : 0) * 5;
        var bl = o.blink || 0;
        var blush = o.blush == null ? 1 : o.blush;
        if (f === 'puppy' || f === 'love') blush = Math.max(blush, 1.5);
        if (blush > 0 && f !== 'sad') {
            c.globalAlpha = Math.min(1, .5 * blush);
            c.fillStyle = PINK;
            ellipse(c, 68 + lx * .3, 142, 13, 7); c.fill();
            ellipse(c, 172 + lx * .3, 142, 13, 7); c.fill();
            c.globalAlpha = 1;
        }
        c.fillStyle = INK; c.strokeStyle = INK;
        c.lineCap = 'round'; c.lineJoin = 'round';
        var jit = f === 'nervous' ? Math.sin(t * 47) * 1.3 : 0;
        switch (f) {
            case 'nervous': eyesN(c, lx + jit, ly, bl, 11, 20); mouthWavy(c); break;
            case 'happy': eyesHappy(c, lx, ly); mouthOpen(c, lx, 16); break;
            case 'shock': eyesShock(c, lx, ly); ellipse(c, 120 + lx * .4, 148, 8, 10); c.fill(); break;
            case 'joycry': eyesHappy(c, 0, 0); mouthOpen(c, 0, 19); break;
            case 'tired': eyesTired(c, lx, ly); mouthFlat(c, 8); break;
            case 'yawn': eyesClosed(c); ellipse(c, 120, 146, 12, 17); c.fill(); break;
            case 'sparkle': eyesStar(c, t); mouthOpen(c, lx, 17); break;
            case 'puppy': eyesPuppy(c, lx, ly); mouthW(c, lx); break;
            case 'sad': eyesSad(c); mouthFrown(c); break;
            case 'focus': eyesN(c, lx, ly, .45, 15, 26); brows(c, 1); mouthFlat(c, 7); break;
            case 'squeeze': eyesSqueeze(c); mouthOpen(c, 0, 17); break;
            case 'love':
                EYES.forEach(function (e) { G.heart(c, e[0] + lx, e[1] + 3 + ly, 15); c.fillStyle = PINK; c.fill(); c.lineWidth = 3; c.stroke(); });
                c.fillStyle = INK; mouthW(c, lx); break;
            case 'blank': EYES.forEach(function (e) { G.circle(c, e[0], e[1] + 4, 4.5); c.fill(); }); mouthFlat(c, 6); break;
            default: eyesN(c, lx, ly, bl); mouthW(c, lx);
        }
    }
    function eyesN(c, lx, ly, bl, w, h) {
        w = w || 15; h = h || 28;
        var hh = Math.max(3, h * (1 - .88 * (bl || 0)));
        EYES.forEach(function (e) { G.rr(c, e[0] - w / 2 + lx, e[1] - hh / 2 + ly, w, hh, Math.min(w, hh) / 2); c.fill(); });
    }
    function eyesHappy(c, lx, ly) {
        c.lineWidth = 6;
        EYES.forEach(function (e) {
            c.beginPath();
            c.moveTo(e[0] - 10 + lx, e[1] + 6 + ly);
            c.quadraticCurveTo(e[0] + lx, e[1] - 12 + ly, e[0] + 10 + lx, e[1] + 6 + ly);
            c.stroke();
        });
    }
    function eyesClosed(c) {
        c.lineWidth = 5;
        EYES.forEach(function (e) { c.beginPath(); c.moveTo(e[0] - 10, e[1] + 2); c.quadraticCurveTo(e[0], e[1] + 8, e[0] + 10, e[1] + 2); c.stroke(); });
    }
    function eyesShock(c, lx, ly) {
        EYES.forEach(function (e) {
            c.fillStyle = '#fff'; G.circle(c, e[0], e[1], 14); c.fill();
            c.lineWidth = 4.5; c.stroke();
            c.fillStyle = INK; G.circle(c, e[0] + lx * .5, e[1] + ly * .6, 5); c.fill();
        });
    }
    function eyesStar(c, t) {
        EYES.forEach(function (e, i) {
            G.star(c, e[0], e[1], 18, 4, .42, t * 2 + i);
            c.fillStyle = YELLOW; c.fill();
            c.lineWidth = 3.5; c.strokeStyle = INK; c.stroke();
        });
        c.fillStyle = INK;
    }
    function eyesPuppy(c, lx, ly) {
        EYES.forEach(function (e) {
            var x = e[0] + lx * .4, y = e[1] + ly * .4;
            c.fillStyle = INK; G.circle(c, x, y, 17); c.fill();
            c.fillStyle = '#fff'; G.circle(c, x - 6, y - 6, 6); c.fill();
            G.circle(c, x + 6, y + 6, 3); c.fill();
        });
        c.fillStyle = INK;
    }
    function eyesTired(c, lx, ly) {
        EYES.forEach(function (e) {
            G.rr(c, e[0] - 7.5 + lx, e[1] + 1 + ly, 15, 12, 6); c.fill();
            c.lineWidth = 4; c.beginPath(); c.moveTo(e[0] - 11 + lx, e[1] + 1 + ly); c.lineTo(e[0] + 11 + lx, e[1] + 1 + ly); c.stroke();
            c.strokeStyle = '#9C8FC8'; c.lineWidth = 3.5;
            c.beginPath(); c.moveTo(e[0] - 10, e[1] + 21); c.quadraticCurveTo(e[0], e[1] + 27, e[0] + 10, e[1] + 21); c.stroke();
            c.strokeStyle = INK;
        });
    }
    function eyesSad(c) {
        EYES.forEach(function (e) { G.circle(c, e[0], e[1] + 5, 5); c.fill(); });
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(75, 102); c.lineTo(96, 93);
        c.moveTo(165, 102); c.lineTo(144, 93);
        c.stroke();
    }
    function eyesSqueeze(c) {
        c.lineWidth = 5.5;
        c.beginPath();
        c.moveTo(80, 101); c.lineTo(95, 112); c.lineTo(80, 123);
        c.moveTo(160, 101); c.lineTo(145, 112); c.lineTo(160, 123);
        c.stroke();
    }
    function brows(c) {
        c.lineWidth = 4.5;
        c.beginPath();
        c.moveTo(76, 88); c.lineTo(97, 95);
        c.moveTo(164, 88); c.lineTo(143, 95);
        c.stroke();
    }
    function mouthW(c, lx) {
        var x = lx * .4;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(104 + x, 140);
        c.quadraticCurveTo(112 + x, 150, 120 + x, 140);
        c.quadraticCurveTo(128 + x, 150, 136 + x, 140);
        c.stroke();
    }
    function mouthOpen(c, lx, w) {
        var x = 120 + lx * .4;
        c.beginPath();
        c.moveTo(x - w, 136);
        c.quadraticCurveTo(x, 136 + w * 1.7, x + w, 136);
        c.closePath();
        c.fill();
        c.save();
        c.clip();
        c.fillStyle = '#FF8FB3';
        ellipse(c, x, 136 + w * 1.05, w * .6, w * .4); c.fill();
        c.restore();
    }
    function mouthWavy(c) {
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(100, 146);
        for (var i = 1; i <= 8; i++) c.lineTo(100 + i * 5, 146 + (i % 2 ? -4 : 0));
        c.stroke();
    }
    function mouthFlat(c, w) { c.lineWidth = 5; c.beginPath(); c.moveTo(120 - w, 146); c.lineTo(120 + w, 146); c.stroke(); }
    function mouthFrown(c) { c.lineWidth = 5; c.beginPath(); c.moveTo(106, 152); c.quadraticCurveTo(120, 140, 134, 152); c.stroke(); }
    function sweat(c, t) {
        var dy = (t * 1.4 % 1) * 8;
        c.beginPath();
        c.moveTo(208, 56 + dy);
        c.bezierCurveTo(219, 71 + dy, 219, 84 + dy, 208, 84 + dy);
        c.bezierCurveTo(197, 84 + dy, 197, 71 + dy, 208, 56 + dy);
        c.fillStyle = '#9FE3FF'; c.fill();
        c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    }
    // 感动到喷泉式流泪
    function tears(c, t) {
        [[87, -1], [153, 1]].forEach(function (e) {
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(e[0], 120);
            c.quadraticCurveTo(e[0] + e[1] * 70, 60, e[0] + e[1] * 115, 190);
            c.strokeStyle = INK; c.lineWidth = 15; c.stroke();
            c.strokeStyle = '#9FE3FF'; c.lineWidth = 9; c.stroke();
            for (var i = 0; i < 5; i++) {
                var p = (t * 1.8 + i / 5) % 1;
                var x = e[0] + e[1] * (115 * p + 30 * p * p), y = 120 - 110 * p + 190 * p * p;
                G.circle(c, x, y, 6 - p * 2);
                c.fillStyle = '#9FE3FF'; c.fill();
                c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
            }
        });
    }
    function arm(c, sx, sy, side, a, hold, t) {
        var L = 54, hx = sx + side * Math.sin(a) * L, hy = sy + Math.cos(a) * L;
        c.strokeStyle = INK; c.lineWidth = 10; c.lineCap = 'round';
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); c.stroke();
        if (hold === 'phone') phone(c, hx + side * 4, hy - 26, side);
        if (hold === 'sign') sign(c, hx, hy, t);
        c.fillStyle = '#fff';
        G.circle(c, hx, hy, 12); c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    }
    function phone(c, x, y, side) {
        c.save();
        c.translate(x, y);
        c.rotate(side * .1);
        G.rr(c, -19, -34, 38, 64, 9); c.fillStyle = INK; c.fill();
        G.rr(c, -14, -28, 28, 50, 5); c.fillStyle = '#6ED6FF'; c.fill();
        c.fillStyle = '#FF3B5C'; G.circle(c, 0, -21, 3.5); c.fill();
        c.restore();
    }
    function sign(c, hx, hy, t) {
        c.strokeStyle = INK; c.lineWidth = 6;
        c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy - 46); c.stroke();
        c.save();
        c.translate(hx, hy - 78);
        c.rotate(Math.sin(t * 3) * .06);
        G.sticker(c, -80, -34, 160, 64, 12, '#fff', { lw: 5, shadow: 5 });
        G.text(c, '点个赞？', 0, -1, { size: 28, weight: 900 });
        c.restore();
    }

    /* =========================================================
       角色：橘猫
       ========================================================= */
    var CAT = { body: '#FFA24C', dark: '#E0762B', light: '#FFE1C2', pink: '#FF8FB3' };

    function cat(c, x, y, s, o) {
        o = o || {};
        c.save();
        c.translate(x, y);
        c.scale(s * (o.flip ? -1 : 1), s);
        c.lineJoin = 'round'; c.lineCap = 'round';
        if (o.pose === 'walk') catWalk(c, o);
        else if (o.pose === 'loaf') catLoaf(c, o);
        else catSit(c, o);
        c.restore();
    }
    function tail(c, x, y, rot, pts) {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.beginPath();
        c.moveTo(0, 0);
        c.bezierCurveTo(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
        c.lineWidth = 18; c.strokeStyle = INK; c.stroke();
        c.lineWidth = 9; c.strokeStyle = CAT.body; c.stroke();
        c.restore();
    }
    function catSit(c, o) {
        var t = o.t || 0;
        tail(c, 32, -16, Math.sin(t * 2.2) * .25, [46, 6, 58, -30, 40, -62]);
        ellipse(c, 0, -48, 44, 50);
        c.fillStyle = CAT.body; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        ellipse(c, 0, -36, 24, 30); c.fillStyle = CAT.light; c.fill();
        [-17, 17].forEach(function (px) {
            ellipse(c, px, -6, 12, 8);
            c.fillStyle = CAT.light; c.fill();
            c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
        });
        catHead(c, 0, -112, o);
    }
    function catWalk(c, o) {
        var t = o.t || 0, ph = o.walk || 0, bob = Math.sin(ph * 2) * 2;
        tail(c, -54, -60, -.3 + Math.sin(t * 5) * .2, [-30, -10, -40, -50, -20, -74]);
        [[-38, 0], [-18, Math.PI], [24, Math.PI], [44, 0]].forEach(function (l) {
            var lift = Math.max(0, Math.sin(ph + l[1])) * 10;
            G.rr(c, l[0] - 8, -42 - lift, 16, 42, 8);
            c.fillStyle = CAT.body; c.fill();
            c.lineWidth = 4.5; c.strokeStyle = INK; c.stroke();
        });
        ellipse(c, 0, -58 + bob, 62, 32);
        c.fillStyle = CAT.body; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        c.strokeStyle = CAT.dark; c.lineWidth = 5;
        c.beginPath();
        [-22, 0, 22].forEach(function (sx) { c.moveTo(sx, -88 + bob); c.lineTo(sx - 4, -74 + bob); });
        c.stroke();
        catHead(c, 60, -92 + bob, o);
    }
    function catLoaf(c, o) {
        var t = o.t || 0, br = Math.sin(t * 2) * 2;
        ellipse(c, 12, -32 - br * .5, 64, 32 + br);
        c.fillStyle = CAT.body; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        c.beginPath();
        c.moveTo(68, -14); c.quadraticCurveTo(50, 10, -10, 2);
        c.lineWidth = 17; c.strokeStyle = INK; c.stroke();
        c.lineWidth = 8; c.strokeStyle = CAT.body; c.stroke();
        catHead(c, -40, -44, { eyes: 'closed' });
    }
    function catHead(c, x, y, o) {
        [-1, 1].forEach(function (d) {
            c.beginPath();
            c.moveTo(x + d * 36, y - 10); c.lineTo(x + d * 30, y - 50); c.lineTo(x + d * 8, y - 34);
            c.closePath();
            c.fillStyle = CAT.body; c.fill();
            c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
            c.beginPath();
            c.moveTo(x + d * 30, y - 18); c.lineTo(x + d * 27, y - 40); c.lineTo(x + d * 14, y - 31);
            c.closePath();
            c.fillStyle = CAT.pink; c.fill();
        });
        ellipse(c, x, y, 42, 36);
        c.fillStyle = CAT.body; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        c.strokeStyle = CAT.dark; c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x - 12, y - 33); c.lineTo(x - 9, y - 22);
        c.moveTo(x, y - 36); c.lineTo(x, y - 23);
        c.moveTo(x + 12, y - 33); c.lineTo(x + 9, y - 22);
        c.stroke();
        c.globalAlpha = .5; c.fillStyle = CAT.pink;
        ellipse(c, x - 26, y + 10, 8, 5); c.fill();
        ellipse(c, x + 26, y + 10, 8, 5); c.fill();
        c.globalAlpha = 1;
        c.fillStyle = INK; c.strokeStyle = INK;
        var lx = (o.lx || 0) * 3;
        if (o.eyes === 'closed') {
            c.lineWidth = 4.5;
            [-1, 1].forEach(function (d) { c.beginPath(); c.moveTo(x + d * 16 - 7, y + 1); c.quadraticCurveTo(x + d * 16, y - 7, x + d * 16 + 7, y + 1); c.stroke(); });
        } else {
            var bl = o.blink || 0;
            [-1, 1].forEach(function (d) { ellipse(c, x + d * 16 + lx, y - 1, 5.5, 7.5 * (1 - bl * .85)); c.fill(); });
            if (bl < .5) {
                c.fillStyle = '#fff';
                [-1, 1].forEach(function (d) { G.circle(c, x + d * 16 + lx - 2, y - 4, 2); c.fill(); });
            }
        }
        c.fillStyle = CAT.pink;
        c.beginPath(); c.moveTo(x - 5, y + 8); c.lineTo(x + 5, y + 8); c.lineTo(x, y + 13); c.closePath(); c.fill();
        c.strokeStyle = INK; c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x - 9, y + 16); c.quadraticCurveTo(x - 4.5, y + 21, x, y + 15); c.quadraticCurveTo(x + 4.5, y + 21, x + 9, y + 16);
        c.stroke();
        c.lineWidth = 2.5;
        c.beginPath();
        [-1, 1].forEach(function (d) {
            c.moveTo(x + d * 30, y + 8); c.lineTo(x + d * 54, y + 3);
            c.moveTo(x + d * 30, y + 14); c.lineTo(x + d * 54, y + 16);
        });
        c.stroke();
    }

    /* =========================================================
       场景道具
       ========================================================= */
    // 镜头：缩放 + 手抖
    function cam(c, t, z, cx, cy, amp) {
        amp = amp || 0;
        c.translate(640 + U.shake(t, 1.3) * amp, 360 + U.shake(t * 1.1, 4.1) * amp);
        c.rotate(U.shake(t * .8, 2.2) * amp * .0016);
        c.scale(z, z);
        c.translate(-cx, -cy);
    }
    // opt.poster / opt.props：要不要画墙上的海报、桌上的杯子和绿植
    function room(c, t, mood, opt) {
        opt = opt || {};
        // 墙面、圆点、书桌都不会动，缓存成一张贴图
        G.layer(c, 'room-' + mood, -80, -80, 1440, 880, function (lc) {
            lc.fillStyle = mood === 'dusk' ? '#FCE6D6' : '#FBEFD9';
            lc.fillRect(-80, -80, 1440, 880);
            G.dots(lc, -80, -80, 1440, 680, 28, 'rgba(24,25,28,.08)');
            desk(lc);
        });
        windowPane(c, t, mood);
        if (opt.poster !== false) poster(c, t);
        lamp(c);
        if (opt.props !== false) { mug(c, t); plant(c, t); }
    }
    function windowPane(c, t, mood) {
        var x = 110, y = 88, w = 330, h = 262;
        G.sticker(c, x - 14, y - 14, w + 28, h + 28, 18, '#fff', { lw: 5, shadow: 6 });
        c.save();
        G.rr(c, x, y, w, h, 8);
        c.clip();
        var g = c.createLinearGradient(0, y, 0, y + h);
        if (mood === 'dusk') { g.addColorStop(0, '#FF8FB3'); g.addColorStop(1, '#FFD27A'); }
        else { g.addColorStop(0, '#7FD3FF'); g.addColorStop(1, '#D9F3FD'); }
        c.fillStyle = g;
        c.fillRect(x, y, w, h);
        if (mood === 'dusk') { c.fillStyle = '#FFE08A'; G.circle(c, x + w * .7, y + h * .78, 50); c.fill(); }
        c.fillStyle = '#fff';
        [[0, 80, 90], [170, 170, 70]].forEach(function (cl) {
            var cx = x - 100 + ((t * 16 + cl[0]) % (w + 200));
            G.rr(c, cx, y + cl[1] - 22, cl[2] * 1.6, 30, 15); c.fill();
            G.rr(c, cx + cl[2] * .3, y + cl[1] - 40, cl[2] * .8, 30, 15); c.fill();
        });
        c.restore();
        c.strokeStyle = INK; c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h);
        c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2);
        c.stroke();
        G.rr(c, x, y, w, h, 8); c.stroke();
        curtain(c, x - 34, y - 30, 64, h + 64, t, 1);
        curtain(c, x + w - 30, y - 30, 64, h + 64, t + 1.5, -1);
    }
    function curtain(c, x, y, w, h, t, dir) {
        var sw = Math.sin(t * 1.2) * 4 * dir;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + w, y);
        c.quadraticCurveTo(x + w * .78 + sw, y + h * .55, x + w * .8 + sw, y + h);
        for (var i = 0; i < 4; i++) c.quadraticCurveTo(x + w * (.7 - i * .2) + sw, y + h + (i % 2 ? -10 : 10), x + w * (.6 - i * .2) + sw, y + h);
        c.quadraticCurveTo(x + w * .1, y + h * .55, x, y);
        c.closePath();
        c.fillStyle = '#FFB3CB'; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x + w * .35, y + 10); c.quadraticCurveTo(x + w * .3 + sw, y + h * .6, x + w * .32 + sw, y + h - 8);
        c.moveTo(x + w * .65, y + 10); c.quadraticCurveTo(x + w * .6 + sw, y + h * .6, x + w * .62 + sw, y + h - 8);
        c.stroke();
    }
    function poster(c, t) {
        c.save();
        c.translate(1000, 226);
        c.rotate(.05);
        G.sticker(c, -105, -130, 210, 262, 14, PINK, { lw: 5, shadow: 6 });
        tv(c, 0, 18, .5, { t: t, face: 'happy', shadow: false });
        G.text(c, 'bilibili', 0, 62, { size: 34, font: FONT.num, weight: 400, fill: '#fff', stroke: INK, lw: 6 });
        G.text(c, '(゜-゜)つロ 干杯', 0, 104, { size: 20, weight: 900, fill: YELLOW });
        c.fillStyle = 'rgba(255,210,63,.85)';
        [[-88, -126, -.5], [88, -126, .5]].forEach(function (p) {
            c.save(); c.translate(p[0], p[1]); c.rotate(p[2]); c.fillRect(-26, -9, 52, 18); c.restore();
        });
        c.restore();
    }
    function desk(c) {
        c.fillStyle = '#E3A55B';
        c.fillRect(-80, DESK + 16, 1440, 200);
        c.fillStyle = 'rgba(24,25,28,.12)';
        c.fillRect(-80, DESK + 16, 1440, 14);
        G.rr(c, -80, DESK - 12, 1440, 30, 6);
        c.fillStyle = '#F4C27A'; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        G.rr(c, 840, DESK + 54, 300, 96, 12);
        c.lineWidth = 4; c.stroke();
        G.rr(c, 960, DESK + 92, 60, 14, 7); c.fillStyle = INK; c.fill();
    }
    function lamp(c) {
        var x = 290;
        c.strokeStyle = INK; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, DESK - 16); c.lineTo(x - 22, DESK - 120); c.lineTo(x + 34, DESK - 186); c.stroke();
        G.rr(c, x - 46, DESK - 26, 92, 18, 9); c.fillStyle = INK; c.fill();
        c.save();
        c.translate(x + 40, DESK - 190);
        c.rotate(.55);
        G.sticker(c, -36, -24, 72, 46, 12, YELLOW, { lw: 5, shadow: 4 });
        c.restore();
    }
    function mug(c, t) {
        var x = 1010, y = DESK - 12;
        c.strokeStyle = INK; c.lineWidth = 6;
        c.beginPath(); c.arc(x + 32, y - 34, 16, -Math.PI / 2, Math.PI / 2); c.stroke();
        G.sticker(c, x - 30, y - 66, 62, 66, 12, '#fff', { lw: 5, shadow: 4 });
        c.fillStyle = PINK; c.fillRect(x - 27, y - 44, 56, 12);
        c.strokeStyle = 'rgba(24,25,28,.35)'; c.lineWidth = 4; c.lineCap = 'round';
        for (var i = 0; i < 2; i++) {
            var sx = x - 8 + i * 18, ph = t * 2 + i * 1.7;
            c.beginPath();
            c.moveTo(sx, y - 76);
            c.bezierCurveTo(sx + Math.sin(ph) * 10, y - 96, sx - Math.sin(ph) * 10, y - 112, sx, y - 128);
            c.stroke();
        }
    }
    function plant(c, t) {
        var x = 1170, y = DESK - 12;
        [[-.6, 70], [-.15, 88], [.35, 80], [.8, 64]].forEach(function (l, i) {
            c.save();
            c.translate(x, y - 58);
            c.rotate(l[0] + Math.sin(t * 1.6 + i) * .05);
            ellipse(c, 0, -l[1] / 2, 18, l[1] / 2);
            c.fillStyle = '#7BD88F'; c.fill();
            c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
            c.restore();
        });
        c.beginPath();
        c.moveTo(x - 40, y - 64); c.lineTo(x + 40, y - 64); c.lineTo(x + 30, y); c.lineTo(x - 30, y);
        c.closePath();
        c.fillStyle = PINK; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    }
    // 取景器叠层：REC、时间码、四角框
    function rec(c, t) {
        c.save();
        c.lineCap = 'round';
        var m = 30, L = 50;
        [[m, m, 1, 1], [1280 - m, m, -1, 1], [m, 720 - m, 1, -1], [1280 - m, 720 - m, -1, -1]].forEach(function (p) {
            c.beginPath();
            c.moveTo(p[0], p[1] + p[3] * L); c.lineTo(p[0], p[1]); c.lineTo(p[0] + p[2] * L, p[1]);
            c.strokeStyle = INK; c.lineWidth = 9; c.stroke();
            c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
        });
        if (Math.floor(t * 2) % 2 === 0) {
            G.circle(c, 72, 66, 11);
            c.fillStyle = '#FF3B5C'; c.fill();
            c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
        }
        G.text(c, 'REC', 92, 67, { size: 28, font: FONT.mono, weight: 700, fill: '#fff', stroke: INK, lw: 6, align: 'left' });
        var s = Math.floor(t);
        G.text(c, '00:' + pad2(Math.floor(s / 60)) + ':' + pad2(s % 60) + ':' + pad2(Math.floor(t * 30) % 30), 1206, 67, { size: 26, font: FONT.mono, weight: 700, fill: '#fff', stroke: INK, lw: 6, align: 'right' });
        c.restore();
    }
    // 开机：光圈从黑屏里打开
    function iris(c, k) {
        c.save();
        c.beginPath();
        c.rect(0, 0, 1280, 720);
        c.arc(640, 360, Math.max(1, k * 820), 0, TAU);
        c.fillStyle = '#000';
        c.fill('evenodd');
        c.restore();
    }
    function sunburst(c, t, cx, cy, c1, c2, speed) {
        c.fillStyle = c1;
        c.fillRect(-80, -80, 1440, 880);
        c.save();
        c.translate(cx, cy);
        c.rotate(t * speed);
        c.fillStyle = c2;
        for (var i = 0; i < 16; i++) {
            c.beginPath();
            c.moveTo(0, 0);
            c.arc(0, 0, 1700, i * TAU / 16, (i + .5) * TAU / 16);
            c.closePath();
            c.fill();
        }
        c.restore();
    }
    function bubble(c, x, y, text, k, size) {
        if (k <= 0) return;
        size = size || 44;
        c.save();
        c.translate(x, y);
        c.scale(k, k);
        c.font = G.font(size, 900);
        var w = c.measureText(text).width + 44;
        G.sticker(c, -w / 2, -size * .9, w, size * 1.8, size * .6, '#fff', { lw: 5, shadow: 5 });
        c.beginPath();
        c.moveTo(-18, size * .88); c.lineTo(-34, size * 1.5); c.lineTo(6, size * .88);
        c.fillStyle = '#fff'; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        c.fillRect(-16, size * .8, 20, 6);
        G.text(c, text, 0, 2, { size: size, weight: 900 });
        c.restore();
    }
    function zzz(c, x, y, t) {
        for (var i = 0; i < 3; i++) {
            var p = (t * .5 + i / 3) % 1;
            c.globalAlpha = Math.sin(p * Math.PI);
            G.text(c, 'z', x + p * 40 + i * 6, y - p * 70, { size: 24 + p * 18, font: FONT.num, weight: 400, fill: '#fff', stroke: INK, lw: 5 });
        }
        c.globalAlpha = 1;
    }
    var CONF_COL = [PINK, BLUE, YELLOW, '#7BD88F', '#fff'];
    function confetti(c, t, t0, n) {
        var r = U.rng(Math.round(t0 * 10)), el = t - t0;
        for (var i = 0; i < (n || 46); i++) {
            var x0 = r() * 1280, vy = 180 + r() * 240, sw = r() * TAU, rs = (r() - .5) * 10, col = CONF_COL[i % 5], delay = r() * .5;
            var e = el - delay;
            if (e < 0) continue;
            var y = -30 + e * vy;
            if (y > 760) continue;
            c.save();
            c.translate(x0 + Math.sin(e * 2.4 + sw) * 36, y);
            c.rotate(e * rs);
            c.scale(1, Math.cos(e * 6 + sw));
            c.fillStyle = col;
            c.fillRect(-8, -5, 16, 10);
            c.lineWidth = 2; c.strokeStyle = INK;
            c.strokeRect(-8, -5, 16, 10);
            c.restore();
        }
    }
    function coins(c, t, t0, t1) {
        var r = U.rng(99);
        for (var i = 0; i < 28; i++) {
            var x0 = 40 + r() * 1200, delay = r() * (t1 - t0 - 1), vy = 260 + r() * 200, sp = 3 + r() * 5;
            var e = t - t0 - delay;
            if (e < 0) continue;
            var y = -50 + e * vy;
            if (y > 780) continue;
            var w = Math.abs(Math.cos(e * sp)) * 26 + 4;
            ellipse(c, x0 + 5, y + 5, w, 26); c.fillStyle = INK; c.fill();
            ellipse(c, x0, y, w, 26); c.fillStyle = YELLOW; c.fill();
            c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
            if (w > 16) G.text(c, '币', x0, y + 1, { size: 24, weight: 900 });
        }
    }

    // 三连的三个图标
    function thumbsUp(c) {
        c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 4.5; c.lineJoin = 'round';
        G.rr(c, -34, -4, 16, 38, 5); c.fill(); c.stroke();
        c.beginPath();
        c.moveTo(-14, 34); c.lineTo(22, 34);
        c.quadraticCurveTo(32, 34, 33, 24); c.lineTo(36, 2);
        c.quadraticCurveTo(36, -8, 26, -8); c.lineTo(8, -8); c.lineTo(12, -26);
        c.quadraticCurveTo(12, -40, 0, -38); c.lineTo(-14, -4);
        c.closePath(); c.fill(); c.stroke();
    }
    function iconSticker(c, x, y, r, kind) {
        if (r <= 1) return;
        var col = kind === 'like' ? PINK : kind === 'coin' ? YELLOW : BLUE;
        G.circle(c, x + 6, y + 6, r); c.fillStyle = INK; c.fill();
        G.circle(c, x, y, r); c.fillStyle = col; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        c.save();
        c.translate(x, y);
        c.scale(r / 62, r / 62);
        if (kind === 'like') thumbsUp(c);
        else if (kind === 'coin') {
            G.circle(c, 0, 0, 36); c.fillStyle = '#FFE58A'; c.fill();
            c.lineWidth = 4.5; c.strokeStyle = INK; c.stroke();
            G.text(c, '币', 0, 2, { size: 38, weight: 900 });
        } else {
            G.star(c, 0, 2, 38, 5, .48);
            c.fillStyle = '#fff'; c.fill();
            c.lineWidth = 4.5; c.strokeStyle = INK; c.stroke();
        }
        c.restore();
    }
    var ICONS = [{ x: 300, y: 430, kind: 'like' }, { x: 640, y: 262, kind: 'coin' }, { x: 980, y: 430, kind: 'fav' }];

    /* =========================================================
       各段落
       ========================================================= */
    // 00:00 开场：镜头怼脸、手抖
    function sceneIntro(c, t) {
        var zk = U.eio(U.seg(t, 3, 3.5));
        c.save();
        cam(c, t, U.lerp(3, 1, zk), 640, U.lerp(438, 360, zk), 9);
        room(c, t, 'day');
        var face = t < 1.5 ? 'shock' : t < 3.5 ? 'nervous' : t < 6 ? 'happy' : t < 9.1 ? 'smile' : 'sparkle';
        var o = { t: t, face: face, blink: blink(t, 3.4, .8), sweat: t > 1.5 && t < 6, armL: .3, armR: .3 };
        if (t >= 3.5 && t < 6) { o.armR = 2.4 + Math.sin(t * 10) * .35; }
        else if (t >= 6.1 && t < 9.1) { o.look = [-1, -.4]; o.blush = 1.7; }
        else if (t >= 9.1) { o.armL = o.armR = 2.5 + Math.sin(t * 7) * .12; }
        o.squash = bounce(t, [3.55, 9.1, 9.7, 10.3]);
        var jy = t > 9.1 && t < 10.9 ? -Math.abs(Math.sin((t - 9.1) * 5.2)) * 34 : 0;
        tv(c, 640, DESK + jy, 1.6, o);
        c.restore();
        rec(c, t);
        if (t < .9) iris(c, U.eo(U.seg(t, .3, .9)));
    }

    // 01 拍：拿起手机，来了一只猫
    function catOnTv(t, tvx, tvs, sq) { return { x: tvx, y: DESK - 160 * tvs * (1 - (sq || 0)) + 10 }; }
    function sceneShoot(c, t, noRec) {
        if (t >= 19.5 && t < 22) { phonePOV(c, t); return; }
        var amp = 8 * (1 - U.seg(t, 12, 24)) + 1.5;
        c.save();
        cam(c, t, 1, 640, 360, amp);
        room(c, t, 'day');
        var tvx = U.lerp(640, 560, U.eio(U.seg(t, 12, 12.9))), tvs = 1.5;
        var o = { t: t, face: 'smile', blink: blink(t, 3.1), armL: .3, armR: .3 };
        if (t >= 13.4 && t < 16) { o.face = 'focus'; o.armR = 1.95; o.hold = 'phone'; o.look = [Math.sin((t - 13.4) * 2.4), -.2]; }
        else if (t >= 16 && t < 17.2) { o.face = 'shock'; o.look = [1, 0]; o.armR = 1.95; o.hold = 'phone'; }
        else if (t >= 17.2 && t < 19.5) { o.face = 'happy'; o.look = [1, .2]; o.armR = 2.05; o.hold = 'phone'; }
        else if (t >= 22 && t < 23) { o.face = 'shock'; o.look = [.4, -1]; }
        else if (t >= 23) { o.face = t < 24.6 ? 'nervous' : 'smile'; o.look = [0, -1]; o.sweat = t < 24.6; o.blush = t < 24.6 ? .6 : 1.6; }
        o.squash = bounce(t, [22.9], .2);
        tv(c, tvx, DESK, tvs, o);
        if (t >= 16.1 && t < 17.3) bubble(c, tvx + 150, DESK - 300, '！', U.back(U.seg(t, 16.1, 16.35)), 40);
        if (t >= 16) {
            var k, co = { t: t };
            var cx, cy = DESK, cs = .95;
            if (t < 18) { cx = U.lerp(1440, 990, U.eo(U.seg(t, 16, 18))); co.pose = 'walk'; co.walk = t * 9; co.flip = true; }
            else if (t < 22) { cx = 990; co.blink = blink(t, 2.3); co.lx = -1; }
            else if (t < 22.9) {
                k = U.seg(t, 22, 22.9);
                var top = catOnTv(t, tvx, tvs, 0);
                cx = U.lerp(990, top.x, U.eio(k));
                cy = U.lerp(DESK, top.y, U.eio(k)) - Math.sin(k * Math.PI) * 170;
                cs = U.lerp(.95, .85, k);
            } else {
                var p = catOnTv(t, tvx, tvs, o.squash);
                cx = p.x; cy = p.y; cs = .85; co.eyes = t > 23.6 ? 'closed' : 'open';
            }
            cat(c, cx, cy, cs, co);
            if (t > 23.6 && t < 26.7) bubble(c, tvx + 120, DESK - 400, '♥', U.back(U.seg(t, 23.6, 23.9)), 34);
        }
        c.restore();
        if (!noRec) rec(c, t);
    }
    // 手机取景：给猫猫拍特写
    function phonePOV(c, t) {
        c.save();
        cam(c, t, 2.1, 990, DESK - 118, 4);
        room(c, t, 'day');
        cat(c, 990, DESK, .95, { t: t, blink: blink(t, 1.9, .6), lx: -.5, eyes: t > 20.9 && t < 21.4 ? 'closed' : 'open' });
        c.restore();
        c.save();
        c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(427, 0); c.lineTo(427, 720); c.moveTo(853, 0); c.lineTo(853, 720);
        c.moveTo(0, 240); c.lineTo(1280, 240); c.moveTo(0, 480); c.lineTo(1280, 480);
        c.stroke();
        var fk = 1 + .25 * (1 - U.eo(U.seg(t, 19.6, 19.95)));
        c.translate(640, 330); c.scale(fk, fk);
        c.strokeStyle = YELLOW; c.lineWidth = 5; c.lineCap = 'round';
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) {
            c.beginPath();
            c.moveTo(d[0] * 150, d[1] * 110 - d[1] * 30); c.lineTo(d[0] * 150, d[1] * 110); c.lineTo(d[0] * 150 - d[0] * 30, d[1] * 110);
            c.stroke();
        });
        c.restore();
        G.circle(c, 1190, 360, 44); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill();
        c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
        G.circle(c, 1190, 360, 30); c.fillStyle = '#FF3B5C'; c.fill();
        G.text(c, '1.0x', 1190, 470, { size: 22, font: FONT.mono, weight: 700, fill: '#fff', stroke: INK, lw: 5 });
        G.text(c, '4K · 60', 90, 56, { size: 22, font: FONT.mono, weight: 700, fill: '#fff', stroke: INK, lw: 5, align: 'left' });
        bubble(c, 870, 170, '喵～', U.back(U.seg(t, 20.15, 20.45)) * (1 - U.seg(t, 21.3, 21.5)), 52);
        if (t > 21 && t < 21.35) {
            c.fillStyle = 'rgba(255,255,255,' + (1 - U.seg(t, 21, 21.35)).toFixed(3) + ')';
            c.fillRect(0, 0, 1280, 720);
        }
    }

    // 02 剪：深夜剪辑
    function panel(c, x, y, w, h, label) {
        G.rr(c, x, y, w, h, 12);
        c.fillStyle = '#1F2024'; c.fill();
        if (label) G.text(c, label, x + 16, y + 22, { size: 18, weight: 700, fill: '#8A8F97', align: 'left' });
    }
    function miniTvIcon(c, x, y) {
        G.rr(c, x - 18, y - 13, 36, 26, 7); c.fillStyle = BLUE; c.fill();
        c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
        G.rr(c, x - 12, y - 8, 24, 16, 4); c.fillStyle = '#fff'; c.fill();
        c.fillStyle = INK; c.fillRect(x - 6, y - 4, 3, 6); c.fillRect(x + 3, y - 4, 3, 6);
    }
    function miniCatIcon(c, x, y) {
        c.fillStyle = CAT.body; c.strokeStyle = INK; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(x - 14, y - 4); c.lineTo(x - 12, y - 18); c.lineTo(x - 3, y - 10); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x + 14, y - 4); c.lineTo(x + 12, y - 18); c.lineTo(x + 3, y - 10); c.closePath(); c.fill(); c.stroke();
        ellipse(c, x, y, 16, 13); c.fill(); c.stroke();
        c.fillStyle = INK; G.circle(c, x - 6, y - 1, 2); c.fill(); G.circle(c, x + 6, y - 1, 2); c.fill();
    }
    function clock(c, x, y, r, t) {
        var mins = 22 * 60 + 300 * U.eio(U.seg(t, 27.4, 36.6)) + Math.max(0, t - 36.6) * 1.5;
        var h = Math.floor(mins / 60) % 24, m = Math.floor(mins % 60);
        G.circle(c, x + 5, y + 5, r); c.fillStyle = '#0E0F12'; c.fill();
        G.circle(c, x, y, r); c.fillStyle = '#fff'; c.fill();
        c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
        c.fillStyle = INK;
        for (var i = 0; i < 12; i++) {
            var a = i / 12 * TAU;
            G.circle(c, x + Math.sin(a) * (r - 12), y - Math.cos(a) * (r - 12), i % 3 ? 2.5 : 4.5); c.fill();
        }
        var ha = ((h % 12) + mins % 60 / 60) / 12 * TAU, ma = (mins % 60) / 60 * TAU;
        c.lineCap = 'round';
        c.lineWidth = 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(ha) * r * .5, y - Math.cos(ha) * r * .5); c.stroke();
        c.lineWidth = 4.5; c.strokeStyle = PINK; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(ma) * r * .78, y - Math.cos(ma) * r * .78); c.stroke();
        G.circle(c, x, y, 6); c.fillStyle = INK; c.fill();
        var late = h < 5;
        G.text(c, (late ? '凌晨 ' : '') + pad2(h) + ':' + pad2(m), x, y + r + 34, { size: 26, font: FONT.mono, weight: 700, fill: late ? '#FF7EAB' : '#E3E5E7' });
    }
    function sceneEdit(c, t) {
        G.layer(c, 'edit-bg', 0, 0, 1280, 720, function (lc) {
            lc.fillStyle = '#2B2140';
            lc.fillRect(0, 0, 1280, 720);
            G.dots(lc, 0, 0, 1280, 720, 28, 'rgba(255,255,255,.06)');
        });
        G.sticker(c, 56, 40, 1168, 640, 20, '#26272C', { lw: 5, shadow: 9, shadowColor: '#0E0B18' });
        c.save();
        G.rr(c, 56, 40, 1168, 640, 20);
        c.clip();
        c.fillStyle = '#1B1C20';
        c.fillRect(56, 40, 1168, 46);
        c.restore();
        [PINK, YELLOW, BLUE].forEach(function (col, i) { G.circle(c, 88 + i * 24, 63, 7); c.fillStyle = col; c.fill(); });
        G.text(c, '必剪 · 我的第一个视频', 640, 64, { size: 20, weight: 700, fill: '#C9CCD0' });

        // 预览窗：循环播着刚拍的素材
        var px = 396, py = 104, pw = 488, ph = 274;
        c.save();
        G.rr(c, px, py, pw, ph, 10);
        c.clip();
        c.translate(px, py);
        c.scale(pw / 1280, ph / 720);
        sceneShoot(c, 22.4 + ((t - 26) * .9) % 3.4, true);
        c.restore();
        G.rr(c, px, py, pw, ph, 10); c.lineWidth = 4; c.strokeStyle = '#0E0F12'; c.stroke();

        // 左：素材 + 摄像头里的 UP 主本人
        panel(c, 78, 104, 300, 274, '素材');
        for (var i = 0; i < 6; i++) {
            var tx = 96 + (i % 3) * 92, ty = 142 + Math.floor(i / 3) * 48;
            G.rr(c, tx, ty, 82, 40, 6); c.fillStyle = ['#3A4D7A', '#7A3A5C', '#7A6A2A'][i % 3]; c.fill();
            if (i % 2) miniCatIcon(c, tx + 41, ty + 21); else miniTvIcon(c, tx + 41, ty + 20);
        }
        var cx = 94, cy = 244, cw = 268, ch = 120;
        c.save();
        G.rr(c, cx, cy, cw, ch, 10);
        c.clip();
        c.fillStyle = '#FBEFD9'; c.fillRect(cx, cy, cw, ch);
        var face = t < 31 ? 'focus' : t < 36.4 ? 'tired' : t < 37.3 ? 'yawn' : 'shock';
        tv(c, cx + cw / 2, cy + 170, 1.05, { t: t, face: face, blink: face === 'tired' ? .3 : blink(t, 2.8), shadow: false, blush: face === 'tired' ? 0 : .8, squash: bounce(t, [37.3]) });
        c.restore();
        G.rr(c, cx, cy, cw, ch, 10); c.lineWidth = 3; c.strokeStyle = '#0E0F12'; c.stroke();
        G.text(c, '● 摄像头', cx + 10, cy + 16, { size: 14, weight: 700, fill: '#FF3B5C', align: 'left' });

        // 右：时钟 + 续命咖啡
        panel(c, 902, 104, 300, 274, '');
        clock(c, 1052, 196, 66, t);
        [30, 33.2, 36].forEach(function (at, i) {
            if (t < at) return;
            var k = U.back(U.seg(t, at, at + .35));
            c.save();
            c.translate(978 + i * 74, 344);
            c.scale(k, k);
            G.sticker(c, -18, -20, 36, 38, 7, '#fff', { lw: 3.5, shadow: 3 });
            c.fillStyle = '#8A5A3B'; c.fillRect(-15, -17, 30, 8);
            c.lineWidth = 3.5; c.strokeStyle = INK;
            c.beginPath(); c.arc(20, -2, 8, -Math.PI / 2, Math.PI / 2); c.stroke();
            c.restore();
        });

        // 时间线
        panel(c, 78, 398, 1124, 262, '');
        var x0 = 196, x1 = 1180;
        c.fillStyle = '#55585F';
        for (i = 0; i <= 24; i++) c.fillRect(x0 + i * (x1 - x0) / 24, 408, 2, i % 4 ? 8 : 14);
        ['视频', '字幕', '音乐'].forEach(function (s, i) {
            var y = 440 + i * 70;
            G.rr(c, 94, y, 88, 52, 8); c.fillStyle = '#2E3035'; c.fill();
            G.text(c, s, 138, y + 27, { size: 20, weight: 700, fill: '#C9CCD0' });
        });
        var COL = [BLUE, PINK, YELLOW, BLUE, PINK];
        for (i = 0; i < 5; i++) {
            var at = 27.8 + i * .45;
            if (t < at) continue;
            var yb = (1 - U.back(U.seg(t, at, at + .35))) * -70;
            var x = x0 + i * 196;
            G.sticker(c, x, 440 + yb, 188, 52, 8, COL[i], { lw: 3, shadow: 3 });
            if (i % 2) miniCatIcon(c, x + 30, 467 + yb); else miniTvIcon(c, x + 30, 466 + yb);
            G.text(c, ['开场', '猫猫', '拍摄', '坐上来', '结尾'][i], x + 58, 467 + yb, { size: 18, weight: 800, fill: i % 3 === 2 ? INK : '#fff', align: 'left' });
        }
        [['大家好！', 31.3, 0, 150], ['猫猫！', 31.8, 2, 130], ['求三连', 32.3, 4, 150]].forEach(function (s) {
            if (t < s[1]) return;
            var k = U.back(U.seg(t, s[1], s[1] + .3));
            var x = x0 + s[2] * 196 + 10;
            c.save();
            c.translate(x + s[3] / 2, 536);
            c.scale(k, k);
            G.sticker(c, -s[3] / 2, -24, s[3], 48, 8, '#fff', { lw: 3, shadow: 3 });
            G.text(c, s[0], 0, 1, { size: 20, weight: 900 });
            c.restore();
        });
        if (t > 33.2) {
            var ww = (x1 - x0) * U.eo(U.seg(t, 33.2, 34.6));
            c.fillStyle = '#7BD88F';
            for (x = 0; x < ww; x += 7) {
                var hh = 8 + 34 * Math.abs(Math.sin(x * .07) * Math.sin(x * .023 + 1));
                c.fillRect(x0 + x, 606 - hh / 2, 4, hh);
            }
        }
        var phx = x0 + ((Math.max(0, t - 27.4) * 170) % (x1 - x0));
        c.fillStyle = PINK;
        c.fillRect(phx - 2, 408, 4, 238);
        miniTvIcon(c, phx, 404);
    }

    // 03 投：填标题、选分区、点投稿、等审核
    var TITLE = '【新人UP】第一次投稿，紧张到手抖，求三连！';
    var CURSOR = [[40.7, 900, 720], [43.6, 610, 294], [44.05, 610, 294], [44.55, 760, 392], [45.85, 975, 598], [99, 975, 598]];
    function cursorAt(t) {
        for (var i = 0; i < CURSOR.length - 1; i++) {
            var a = CURSOR[i], b = CURSOR[i + 1];
            if (t < b[0]) { var k = U.eio(U.seg(t, a[0], b[0])); return [U.lerp(a[1], b[1], k), U.lerp(a[2], b[2], k)]; }
        }
        return [CURSOR[CURSOR.length - 1][1], CURSOR[CURSOR.length - 1][2]];
    }
    function cursor(c, x, y, down) {
        c.save();
        c.translate(x, y);
        c.scale(down ? 1.25 : 1.4, down ? 1.25 : 1.4);
        c.beginPath();
        c.moveTo(0, 0); c.lineTo(0, 30); c.lineTo(8, 23); c.lineTo(14, 36); c.lineTo(20, 33); c.lineTo(14, 21); c.lineTo(24, 21);
        c.closePath();
        c.fillStyle = '#fff'; c.fill();
        c.lineWidth = 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
        c.restore();
    }
    function chip(c, x, y, text, fill, size) {
        c.font = G.font(size || 22, 900);
        var w = c.measureText(text).width + 34;
        G.sticker(c, x, y, w, 46, 23, fill, { lw: 3.5, shadow: 3 });
        G.text(c, text, x + w / 2, y + 24, { size: size || 22, weight: 900, fill: fill === PINK ? '#fff' : INK });
        return w;
    }
    function sceneUpload(c, t) {
        var sh = t > 50.4 && t < 50.9 ? (1 - U.seg(t, 50.4, 50.9)) * 12 : 0;
        c.save();
        c.translate(U.shake(t * 3, 1) * sh, U.shake(t * 3, 2) * sh);
        G.layer(c, 'upload-bg', -60, -60, 1400, 840, function (lc) {
            lc.fillStyle = G.PAPER;
            lc.fillRect(-60, -60, 1400, 840);
            G.dots(lc, -60, -60, 1400, 840, 26, 'rgba(24,25,28,.13)');
        });
        G.sticker(c, 130, 48, 1020, 614, 22, '#fff', { lw: 5, shadow: 10 });
        c.save();
        G.rr(c, 130, 48, 1020, 614, 22);
        c.clip();
        c.fillStyle = PINK; c.fillRect(130, 48, 1020, 72);
        c.fillStyle = INK; c.fillRect(130, 118, 1020, 5);
        c.restore();
        G.text(c, '创作中心 · 投稿', 170, 86, { size: 34, font: FONT.display, weight: 400, fill: '#fff', align: 'left' });
        tv(c, 1096, 110, .26, { t: t, face: 'smile', shadow: false });

        G.text(c, '封面', 170, 158, { size: 20, weight: 900, fill: '#61666D', align: 'left' });
        c.save();
        G.rr(c, 170, 174, 360, 203, 12);
        c.clip();
        c.translate(170, 174);
        c.scale(360 / 1280, 203 / 720);
        coverArt(c, 0);
        c.restore();
        G.rr(c, 170, 174, 360, 203, 12); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();

        G.text(c, '标题', 570, 158, { size: 20, weight: 900, fill: '#61666D', align: 'left' });
        G.rr(c, 570, 174, 540, 58, 10);
        c.fillStyle = G.PAPER; c.fill();
        c.lineWidth = 3.5; c.strokeStyle = t > 41.3 && t < 44 ? BLUE : INK; c.stroke();
        var n = Math.floor(U.seg(t, 41.6, 43.8) * Array.from(TITLE).length);
        var typed = Array.from(TITLE).slice(0, n).join('');
        c.save();
        G.rr(c, 572, 176, 536, 54, 9); c.clip();
        G.text(c, typed, 586, 204, { size: 21, weight: 800, align: 'left' });
        c.font = G.font(21, 800);
        if (t > 41.3 && t < 44 && Math.floor(t * 3) % 2 === 0) { c.fillStyle = BLUE; c.fillRect(588 + c.measureText(typed).width, 190, 3, 28); }
        c.restore();
        G.text(c, n + '/80', 1100, 246, { size: 14, font: FONT.mono, weight: 700, fill: '#9499A0', align: 'right' });

        G.text(c, '分区', 570, 280, { size: 20, weight: 900, fill: '#61666D', align: 'left' });
        var zx = 570;
        ['生活', '动物圈', '知识', '游戏'].forEach(function (z, i) {
            zx += chip(c, zx, 296, z, i === 0 && t >= 43.9 ? PINK : '#fff') + 12;
        });
        G.text(c, '标签', 570, 376, { size: 20, weight: 900, fill: '#61666D', align: 'left' });
        var tx = 570;
        ['#新人UP', '#小电视', '#猫猫', '#第一次投稿'].forEach(function (tag, i) {
            var at = 44.6 + i * .2;
            if (t < at) return;
            var k = U.back(U.seg(t, at, at + .3));
            c.save();
            c.translate(tx, 392 + 23);
            c.scale(k, k);
            var w = chip(c, 0, -23, tag, YELLOW, 20);
            c.restore();
            tx += w + 10;
        });
        G.text(c, '简介：第一次当 UP 主，请多关照 (｡･ω･｡)', 570, 492, { size: 19, weight: 700, fill: '#9499A0', align: 'left' });

        var down = t >= 46.2 && t < 46.45;
        G.sticker(c, 840, 562 + (down ? 4 : 0), 270, 70, 35, PINK, { lw: 5, shadow: down ? 2 : 6 });
        G.text(c, '立即投稿', 975, 598 + (down ? 4 : 0), { size: 30, weight: 900, fill: '#fff' });

        if (t < 46.35) {
            var cp = cursorAt(t);
            cursor(c, cp[0], cp[1], (t > 43.85 && t < 44) || down);
        }
        if (t >= 46.3) uploadModal(c, t);
        c.restore();

        if (t >= 48.3 && t < 50.6) {
            var rise = U.eo(U.seg(t, 48.3, 48.8));
            tv(c, 640 + Math.sin(t * 40) * 3, 1000 - rise * 190, 2.1, { t: t, face: 'nervous', sweat: true, blink: blink(t, 2.2) });
        }
        if (t >= 50.6) {
            var up = U.back(U.seg(t, 50.6, 51));
            tv(c, 640, 1060 - up * 350, 1.6, { t: t, face: 'happy', armL: 2.6 + Math.sin(t * 9) * .2, armR: 2.6 - Math.sin(t * 9) * .2, squash: bounce(t, [51]) });
            confetti(c, t, 50.45, 30);
        }
    }
    function uploadModal(c, t) {
        var k = U.eo(U.seg(t, 46.3, 46.6));
        c.fillStyle = 'rgba(24,25,28,' + (.45 * k).toFixed(3) + ')';
        c.fillRect(-60, -60, 1400, 840);
        c.save();
        c.translate(640, 330);
        var sc = .8 + .2 * U.back(k);
        c.scale(sc, sc);
        c.globalAlpha = k;
        G.sticker(c, -270, -130, 540, 260, 22, '#fff', { lw: 5, shadow: 8 });
        if (t < 48.3) {
            var p = U.eio(U.seg(t, 46.5, 48.2));
            G.text(c, '上传中……', 0, -72, { size: 36, font: FONT.display, weight: 400 });
            G.rr(c, -210, -12, 420, 38, 19); c.fillStyle = '#EDEBE5'; c.fill();
            c.save();
            G.rr(c, -210, -12, 420, 38, 19); c.clip();
            c.fillStyle = PINK; c.fillRect(-210, -12, 420 * p, 38);
            c.fillStyle = 'rgba(255,255,255,.25)';
            for (var i = -2; i < 16; i++) { var sx = -210 + i * 30 + (t * 60) % 30; c.beginPath(); c.moveTo(sx, -12); c.lineTo(sx + 14, -12); c.lineTo(sx - 4, 26); c.lineTo(sx - 18, 26); c.closePath(); c.fill(); }
            c.restore();
            G.rr(c, -210, -12, 420, 38, 19); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
            tv(c, -210 + 420 * p, -16, .2, { t: t, face: 'happy', shadow: false });
            G.text(c, Math.floor(p * 100) + '%', 0, 74, { size: 42, font: FONT.num, weight: 400 });
        } else {
            G.text(c, '审核中……', 0, -66, { size: 36, font: FONT.display, weight: 400 });
            c.lineWidth = 9; c.lineCap = 'round'; c.strokeStyle = PINK;
            c.beginPath(); c.arc(0, 8, 30, t * 6, t * 6 + 4.2); c.stroke();
            G.text(c, '别紧张，马上就好', 0, 84, { size: 22, weight: 800, fill: '#61666D' });
        }
        c.restore();
        if (t >= 50.4) {
            var ks = U.seg(t, 50.4, 50.62);
            var s2 = U.lerp(2.4, 1, U.eo(ks));
            c.save();
            c.translate(700, 356);
            c.rotate(-.2);
            c.scale(s2, s2);
            c.globalAlpha = Math.min(1, ks * 2.5);
            G.rr(c, -176, -62, 352, 124, 18); c.lineWidth = 10; c.strokeStyle = PINK; c.stroke();
            G.rr(c, -160, -46, 320, 92, 10); c.lineWidth = 3; c.stroke();
            G.text(c, '审核通过 ✓', 0, 4, { size: 54, weight: 900, fill: PINK });
            c.restore();
        }
    }

    // 04 被看见：播放量从 0 涨到 1.2 万
    function views(t) {
        if (t < 55.5) return 0;
        if (t < 57.2) return 1;
        if (t < 60.5) return Math.round(12 * Math.pow(12036 / 12, U.ei(U.seg(t, 57.2, 60.5))));
        return 12036 + Math.floor((t - 60.5) * 23);
    }
    var NOTIFS = [
        [58, '💬', '新评论：好可爱！已关注', '#fff'],
        [58.8, '🪙', '有人给你投了 2 个硬币', '#fff'],
        [59.6, '⭐', '你的视频被收藏了', '#fff'],
        [60.4, '🔥', '你的视频上热门啦！', YELLOW]
    ];
    function sceneSeen(c, t) {
        c.save();
        room(c, t, 'dusk', { poster: false, props: false });
        cat(c, 150, DESK, .85, { t: t, pose: 'loaf' });
        zzz(c, 96, DESK - 120, t);
        var face = t < 55.5 ? 'nervous' : t < 58.4 ? 'shock' : t < 60.5 ? 'happy' : 'joycry';
        var o = { t: t, face: face, look: t < 60.5 ? [.9, -.3] : [0, 0], sweat: t < 55.5, blink: blink(t, 2.9), armL: .3, armR: .3, squash: bounce(t, [55.5, 60.5], .22) };
        if (t > 60.5) { o.armL = 2.4 + Math.sin(t * 9) * .3; o.armR = 2.4 - Math.sin(t * 9) * .3; }
        tv(c, 420, DESK, 1.35, o);
        c.restore();

        var k = U.back(U.seg(t, 52.8, 53.3));
        c.save();
        c.translate(910, 222);
        c.scale(k, k);
        c.rotate(-.02);
        G.sticker(c, -270, -122, 540, 244, 22, '#fff', { lw: 5, shadow: 8 });
        G.text(c, '▶ 播放量', -232, -80, { size: 24, weight: 900, fill: '#61666D', align: 'left' });
        var n = views(t);
        G.text(c, n.toLocaleString('en-US'), 0, 6, { size: 92, font: FONT.num, weight: 400, fill: n > 999 ? PINK : INK });
        G.text(c, '弹幕 ' + Math.round(n * 386 / 12036) + '　·　点赞 ' + Math.round(n * 2333 / 12036), 0, 84, { size: 22, weight: 800, fill: '#61666D' });
        if (t > 60.5) {
            var kb = U.back(U.seg(t, 60.5, 60.9));
            c.save();
            c.translate(236, -112);
            c.rotate(.2 + Math.sin(t * 4) * .05);
            c.scale(kb, kb);
            G.star(c, 0, 0, 74, 12, .78);
            c.fillStyle = YELLOW; c.fill();
            c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
            G.text(c, '1.2万!', 0, 2, { size: 30, weight: 900 });
            c.restore();
        }
        c.restore();

        NOTIFS.forEach(function (nt, i) {
            if (t < nt[0]) return;
            var kx = U.eo(U.seg(t, nt[0], nt[0] + .35));
            var x = 660 + (1 - kx) * 720, y = 384 + i * 68;
            G.sticker(c, x, y, 500, 56, 14, nt[3], { lw: 4, shadow: 5 });
            G.text(c, nt[1], x + 34, y + 29, { size: 26, weight: 400 });
            G.text(c, nt[2], x + 64, y + 29, { size: 22, weight: 800, align: 'left' });
        });
        var r = U.rng(5);
        for (var i = 0; i < 10; i++) {
            var st = 58 + i * .6, hx = 690 + r() * 460;
            var p = (t - st) / 2.6;
            if (p < 0 || p > 1) continue;
            c.globalAlpha = 1 - p;
            G.heart(c, hx + Math.sin(p * 9 + i) * 16, 360 - p * 300, 22);
            c.fillStyle = PINK; c.fill();
            c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
            c.globalAlpha = 1;
        }
        if (t > 60.5) confetti(c, t, 60.5);
    }

    // 求三连
    function sceneAsk(c, t) {
        sunburst(c, t, 640, 440, '#FFE58A', YELLOW, .12);
        var face = t < 69.6 ? 'smile' : t < 72 ? 'puppy' : 'sparkle';
        var o = { t: t, face: face, blush: 1.5, look: t < 69.6 ? [0, .7] : [0, 0], blink: blink(t, 2.6), armL: .3, armR: .3, squash: bounce(t, [66.3, 72], .2) };
        if (t > 72) { o.armL = 1.15 + Math.sin(t * 5) * .08; o.armR = 1.15 - Math.sin(t * 5) * .08; }
        tv(c, 640, 690, 1.45, o);
        ICONS.forEach(function (ic, i) {
            var at = 72 + i * .3;
            if (t < at) return;
            iconSticker(c, ic.x, ic.y + Math.sin(t * 3 + i) * 9, 62 * U.back(U.seg(t, at, at + .4)), ic.kind);
        });
        if (t >= 72) {
            var kt = U.back(U.seg(t, 72, 72.35));
            c.save();
            c.translate(640, 118);
            c.scale(kt, kt);
            c.rotate(-.04);
            G.text(c, '一键三连？！', 0, 0, { size: 104, font: FONT.display, weight: 400, fill: '#fff', stroke: INK, lw: 12, shadow: 8, shadowColor: PINK });
            c.restore();
        }
        var intro = U.seg(t, 66, 66.6);
        if (intro < 1) {
            // 圆形转场：从上一个场景里「开」出来
            c.save();
            c.beginPath();
            c.rect(0, 0, 1280, 720);
            c.arc(640, 400, Math.max(1, U.eio(intro) * 900), 0, TAU);
            c.clip('evenodd');
            sceneSeen(c, 65.99);
            c.restore();
        }
    }

    // 结局 A：一键三连
    function sceneThanks(c, t) {
        sunburst(c, t, 640, 440, '#FF8FB3', PINK, .3);
        var o = { t: t, face: t < 81.5 ? 'joycry' : 'sparkle', blush: 1.4, armL: 2.4 + Math.sin(t * 8) * .3, armR: 2.4 - Math.sin(t * 8) * .3, squash: bounce(t, [77, 82.9], .2) };
        var jump = t > 77 && t < 81 ? -Math.abs(Math.sin((t - 77) * 4.5)) * 26 : 0;
        tv(c, 640, 690 + jump, 1.45, o);
        if (t < 77) {
            ICONS.forEach(function (ic, i) {
                var k = U.ei(U.seg(t, 76 + i * .15, 76.6 + i * .15));
                iconSticker(c, U.lerp(ic.x, 640, k), U.lerp(ic.y, 520, k), 62 * (1 - k * .75), ic.kind);
            });
        }
        if (t > 82.2) {
            var k2 = U.seg(t, 82.2, 82.9);
            var top = 690 - 160 * 1.45 * (1 - o.squash) + 10;
            cat(c, U.lerp(-140, 640, U.eio(k2)), U.lerp(760, top, U.eio(k2)) - Math.sin(k2 * Math.PI) * 200, .85, { t: t, eyes: t > 83.3 ? 'closed' : 'open' });
        }
        if (t < 85) {
            coins(c, t, 77, 85);
            confetti(c, t, 77);
        }
        if (t > 76.85 && t < 77.2) {
            c.fillStyle = 'rgba(255,255,255,' + (1 - U.seg(t, 76.85, 77.2)).toFixed(3) + ')';
            c.fillRect(0, 0, 1280, 720);
        }
        if (t > 85) {
            var ke = U.eo(U.seg(t, 85, 85.6));
            c.save();
            c.translate(0, (1 - ke) * 760);
            G.sticker(c, 90, 70, 1100, 580, 30, '#fff', { lw: 6, shadow: 12 });
            G.dots(c, 96, 76, 1088, 568, 26, 'rgba(24,25,28,.08)');
            G.text(c, '下个视频见！', 640, 220, { size: 112, font: FONT.display, weight: 400, fill: PINK, stroke: INK, lw: 12, shadow: 8 });
            G.text(c, '感谢观看 · 记得关注小电视 (｡･ω･｡)ﾉ', 640, 336, { size: 30, weight: 800, fill: '#61666D' });
            tv(c, 560, 610, .9, { t: t, face: 'happy', armR: 2.3 + Math.sin(t * 9) * .4, armL: .3 });
            cat(c, 760, 610, .8, { t: t, eyes: 'closed' });
            c.restore();
        }
    }

    // 结局 B：下次一定
    function sceneNextTime(c, t) {
        if (t < 89) {
            sceneAsk(c, 75.95);
            var k = U.seg(t, 88, 88.35);
            c.globalCompositeOperation = 'saturation';
            c.fillStyle = 'rgba(128,128,128,' + k.toFixed(3) + ')';
            c.fillRect(0, 0, 1280, 720);
            c.globalCompositeOperation = 'source-over';
            c.fillStyle = 'rgba(40,40,48,' + (k * .25).toFixed(3) + ')';
            c.fillRect(0, 0, 1280, 720);
            return;
        }
        G.layer(c, 'next-bg', 0, 0, 1280, 720, function (lc) {
            var g = lc.createLinearGradient(0, 0, 0, 720);
            g.addColorStop(0, '#BFC3CA'); g.addColorStop(1, '#8E939B');
            lc.fillStyle = g;
            lc.fillRect(0, 0, 1280, 720);
            G.dots(lc, 0, 0, 1280, 720, 28, 'rgba(24,25,28,.1)');
        });
        var perk = U.eio(U.seg(t, 93.5, 94.1));
        var slump = U.eio(U.seg(t, 89, 90.2)) * (1 - perk);
        var o = {
            t: t,
            face: t < 93.5 ? 'sad' : 'puppy',
            screen: t < 93.5 ? '#D5D8DE' : '#fff',
            color: t < 93.5 ? '#7FA9BD' : BLUE,
            squash: .14 * slump,
            tilt: -.1 * slump + .05 * perk * Math.sin(t * 3),
            armL: .2,
            armR: t > 94.4 ? U.lerp(.2, 2.25, U.back(U.seg(t, 94.4, 94.9))) : .2,
            hold: t > 94.4 ? 'sign' : null,
            blush: t > 93.5 ? 1.6 : 0,
            ant: -.25 * slump
        };
        if (t > 90.4 && t < 93.4) o.noise = t;
        tv(c, 640, 690, 1.45, o);
        if (t > 89.4 && t < 93.6) {
            var a = U.win(t, 89.4, 93.6, .4);
            c.save();
            c.globalAlpha = a;
            c.translate(640, 250 - (1 - a) * 40);
            c.strokeStyle = '#5E86A8'; c.lineWidth = 4; c.lineCap = 'round';
            c.beginPath();
            for (var i = 0; i < 9; i++) {
                var rx = -90 + i * 22, ry = 40 + ((t * 260 + i * 37) % 90);
                c.moveTo(rx, ry); c.lineTo(rx - 5, ry + 16);
            }
            c.stroke();
            c.fillStyle = '#6D7278';
            [[-60, 10, 42], [-10, -10, 54], [52, 8, 40]].forEach(function (p) { G.circle(c, p[0], p[1], p[2]); c.fill(); });
            G.rr(c, -100, 0, 196, 48, 24); c.fill();
            c.restore();
        }
        if (t > 92.3 && t < 94) {
            var tx = U.lerp(-140, 1420, U.seg(t, 92.3, 94)), ty = 640 - Math.abs(Math.sin(t * 6)) * 34;
            c.save();
            c.translate(tx, ty);
            c.rotate(t * 8);
            c.strokeStyle = '#A07A4A'; c.lineWidth = 5;
            for (i = 0; i < 6; i++) { c.beginPath(); c.arc(0, 0, 22 + i * 5, i, i + 4.2); c.stroke(); }
            c.restore();
        }
    }

    // 封面：小电视头顶着猫，配上大字
    function coverArt(c, t) {
        room(c, 3, 'day', { poster: false });
        var tvs = 1.5, tvx = 430;
        tv(c, tvx, DESK, tvs, { t: 3, face: 'nervous', sweat: true, look: [0, -1], blush: 1.2, armL: .3, armR: .3 });
        var p = catOnTv(0, tvx, tvs, 0);
        cat(c, p.x, p.y, .85, { t: 3, eyes: 'closed' });
        c.save();
        c.translate(1010, 180);
        c.rotate(.06);
        G.text(c, '第一次', 0, -40, { size: 96, font: FONT.display, weight: 400, fill: '#fff', stroke: INK, lw: 14, shadow: 8 });
        G.text(c, '投稿!!', 10, 70, { size: 116, font: FONT.display, weight: 400, fill: YELLOW, stroke: INK, lw: 14, shadow: 8 });
        c.restore();
        c.save();
        c.translate(1030, 420);
        c.rotate(-.08);
        G.sticker(c, -130, -34, 260, 68, 34, PINK, { lw: 5, shadow: 6 });
        G.text(c, '紧张到手抖', 0, 2, { size: 32, weight: 900, fill: '#fff' });
        c.restore();
    }

    /* ---------------- 章节卡 ---------------- */
    var CARDS = [
        { t: 12, no: '01', title: '拍', sub: '一部手机就能开始', color: YELLOW },
        { t: 26, no: '02', title: '剪', sub: '加字幕、配音乐、剪到凌晨', color: BLUE },
        { t: 40, no: '03', title: '投', sub: '选分区、写标题、点「投稿」', color: PINK },
        { t: 52, no: '04', title: '被看见', sub: '第一个播放，来自陌生人', color: INK }
    ];
    function chapterCard(c, t, cd) {
        var k = t - cd.t;
        if (k < 0 || k > 1.5) return;
        var x = (1 - U.eo(U.seg(k, 0, .3))) * -1600 + U.ei(U.seg(k, 1.15, 1.5)) * 1600;
        c.save();
        c.translate(640 + x, 360);
        c.rotate(-.035);
        c.fillStyle = INK; c.fillRect(-900, -86, 1800, 190);
        c.fillStyle = cd.color; c.fillRect(-900, -96, 1800, 190);
        c.fillStyle = INK; c.fillRect(-900, -100, 1800, 7); c.fillRect(-900, 90, 1800, 7);
        c.save();
        c.beginPath(); c.rect(-900, -93, 1800, 183); c.clip();
        c.fillStyle = 'rgba(255,255,255,.12)';
        for (var i = -30; i < 30; i++) {
            c.beginPath();
            c.moveTo(i * 60, -93); c.lineTo(i * 60 + 30, -93); c.lineTo(i * 60 - 60, 90); c.lineTo(i * 60 - 90, 90);
            c.closePath(); c.fill();
        }
        c.restore();
        G.circle(c, -375, 5, 64); c.fillStyle = INK; c.fill();
        G.circle(c, -380, 0, 64); c.fillStyle = '#fff'; c.fill();
        c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
        G.text(c, cd.no, -380, 4, { size: 50, font: FONT.num, weight: 400 });
        G.text(c, cd.title, -282, -4, { size: 116, font: FONT.display, weight: 400, fill: '#fff', stroke: INK, lw: 12, align: 'left', shadow: 6 });
        c.font = G.font(116, 400, FONT.display);
        var tw = c.measureText(cd.title).width;
        G.text(c, cd.sub, -282 + tw + 40, 6, { size: 34, weight: 900, fill: cd.color === INK ? '#fff' : INK, align: 'left' });
        c.restore();
    }

    function render(c, t) {
        if (t < 0) { coverArt(c, 0); return; }
        if (t < 12) sceneIntro(c, t);
        else if (t < 26.7) sceneShoot(c, t);
        else if (t < 40.7) sceneEdit(c, t);
        else if (t < 52.7) sceneUpload(c, t);
        else if (t < 66) sceneSeen(c, t);
        else if (t < 76) sceneAsk(c, t);
        else if (t < 88) sceneThanks(c, t);
        else sceneNextTime(c, t);
        CARDS.forEach(function (cd) { chapterCard(c, t, cd); });
        [26.7, 40.7, 52.7].forEach(function (s) {
            if (t >= s && t < s + .3) {
                c.fillStyle = 'rgba(255,255,255,' + (.75 * (1 - U.seg(t, s, s + .3))).toFixed(3) + ')';
                c.fillRect(0, 0, 1280, 720);
            }
        });
    }

    /* ---------------- 字幕（打字机效果 + 哔哔说话声） ---------------- */
    var SUBS = [
        [.8, 3, '诶……这个，开始录了吗？', { cps: 11 }],
        [3.7, 6, '大、大家好！我是小电视！', { cps: 11, cls: 'hi' }],
        [6.1, 9, '平时都是我给大家放视频……', { cps: 11 }],
        [9.1, 11.9, '今天，我想自己当一次 UP 主！', { cps: 12, cls: 'hi shout' }],
        [13.6, 15.8, '拍点什么好呢……', { cps: 9 }],
        [17.2, 19.3, '诶！猫猫！', { cps: 9, cls: 'hi' }],
        [20, 21.8, '好、好可爱……', { cps: 9 }],
        [23.2, 25.8, '它……它坐上来了……', { cps: 9 }],
        [28, 30.8, '剪辑……比想象的难好多', { cps: 10 }],
        [31.2, 34, '加字幕……配 BGM……', { cps: 9 }],
        [37.4, 39.8, '……已经凌晨三点了？', { cps: 10, cls: 'hi' }],
        [48.5, 50.3, '审核中……心跳好快……', { cps: 10 }],
        [50.6, 52.4, '过了！！', { cps: 8, cls: 'hi shout' }],
        [53.6, 55.4, '……会有人看吗？', { cps: 9 }],
        [55.7, 57.2, '有、有人看了！！', { cps: 11, cls: 'hi' }],
        [61, 64.8, '从 0 到 1.2 万……我不是在做梦吧？', { cps: 11 }],
        [66.8, 69.4, '最后……如果你喜欢这个视频的话……', { cps: 12 }],
        [69.7, 71.8, '可以给我一个……', { cps: 9 }],
        [72, 76, '一键三连吗？！', { cps: 10, cls: 'hi shout' }],
        [77.2, 80.6, '谢、谢谢你！！呜呜呜……', { cps: 10, cls: 'hi' }],
        [81.6, 84.6, '我会继续努力更新的！', { cps: 11 }],
        [89.3, 92.2, '……好的，下次一定。', { cps: 6, cls: 'sad', voice: 'sad' }],
        [93.8, 96.8, '那……点个赞也行？', { cps: 8, cls: 'hi' }]
    ];

    /* ---------------- 弹幕 ---------------- */
    var DM = [
        [.4, '前排！'], [.7, '新人UP？支持一下', 'p'], [1, '空降 00:52', 'y bottom'], [1.3, '脸怼镜头了哈哈哈'], [1.7, '镜头好抖'],
        [2.1, '开始录了开始录了'], [2.5, '这是……小电视？？', 'b'], [3.2, '退后退后'], [3.8, '大家好！'], [4.2, '声音在抖 hhh'],
        [4.6, '紧张到手抖是真的', 'y'], [5, '好可爱啊啊啊', 'p'], [5.4, 'B站吉祥物亲自下场'], [6.3, '平时辛苦你了'], [6.8, '放了这么多年视频'],
        [7.3, '泪目', 'b'], [7.8, '小电视成精了'], [8.4, '害羞了害羞了', 'p'], [9.3, '冲！！', 'y'], [9.7, 'UP 主加油！'],
        [10.2, '支持支持'], [10.6, '已关注', 'b'], [11.1, '新人 UP 第一次都这样'], [11.6, '空降 01:06', 'y bottom'],
        [12.3, '01 拍', 'y top'], [13.2, '一部手机就够了'], [13.8, '拍什么都行！'], [14.3, '拍猫！拍猫！', 'p'], [15, '横屏！横屏拍！'],
        [15.6, '手机拿反了没'], [16.4, '猫猫！！', 'y big'], [16.7, '猫来了', 'p'], [17, 'awsl'], [17.4, '橘猫！'],
        [17.8, '十个橘猫九个胖'], [18.3, '走路好拽', 'b'], [19, '猫：你拍你的'], [19.7, '猫猫看镜头了', 'p'], [20.3, '喵～', 'y'],
        [20.7, '镜头感满分'], [21.2, '动物区预定', 'b'], [21.6, '咔嚓'], [22.2, '跳了跳了'], [22.6, '坐上去了哈哈哈', 'y big'],
        [23, '猫：这是我的王座', 'p'], [23.5, 'UP 主被征用了'], [24, '猫比UP主还上镜', 'b'], [24.5, '小电视：我动不了了'], [25.1, '这就是封面了吧'],
        [25.6, '笑死 头顶一只猫'], [26.3, '02 剪', 'b top'], [27.2, '剪辑人的日常'], [27.7, '必剪 yyds', 'b'], [28.3, '剪视频真的难'],
        [28.9, '素材拖进去了'], [29.5, '第一杯咖啡'], [30.3, '咖啡续命', 'y'], [31, '加字幕好累'], [31.6, '字幕打错了吗'],
        [32.2, 'BGM 选了三小时', 'p'], [33, '第二杯了'], [33.6, '音乐加上了！', 'b'], [34.2, '凌晨三点 真实', 'y big'], [34.8, 'UP 主注意身体'],
        [35.3, '头发还好吗', 'p'], [35.9, '黑眼圈哈哈哈'], [36.5, '打哈欠了'], [37, '用爱发电', 'y'], [37.6, '我也是剪到天亮'],
        [38.2, '快去睡觉！！', 'p'], [38.8, '三杯咖啡……'], [39.4, '明天还要上课吧'], [40.3, '03 投', 'p top'], [41.3, '标题好真实'],
        [41.9, '打字好快'], [42.5, '求三连已经写在标题里了', 'y'], [43.2, '标题党（不是）'], [43.9, '选生活区！'], [44.4, '#猫猫 必须有', 'p'],
        [45, '#第一次投稿'], [45.6, '按下去了！！', 'y'], [46.3, '上传中……'], [46.9, '别断网别断网'], [47.5, '进度条好慢', 'b'],
        [48.4, '审核中最折磨', 'p'], [48.9, '心跳加速'], [49.4, '我替你紧张', 'b'], [50, '求求了'], [50.5, '过了过了！！', 'y big'],
        [50.8, '审核通过！'], [51.3, '恭喜！', 'p'], [51.8, '撒花'], [52.3, '04 被看见', 'top'], [53.2, '会有人看的！'],
        [53.8, '我来当第一个', 'b'], [54.4, '第一个播放是我！', 'y'], [55, '猫猫在睡觉'], [55.7, '有人看了！', 'p'], [56.2, '1 个播放也是播放'],
        [57, '前方高能', 'y top big'], [57.3, '要起飞了', 'b'], [57.8, '涨了涨了'], [58.3, '我是第 386 个'], [58.8, '投币了！', 'y'],
        [59.3, '收藏了', 'b'], [59.8, '上热门了！！', 'p'], [60.5, '1.2万！！', 'y big'], [60.8, '见证历史', 'p'], [61.2, '从 0 到 1.2 万'],
        [61.7, '哭了哭了'], [62.2, 'UP 主哭了', 'b'], [62.7, '我也哭了'], [63.3, '恭喜恭喜', 'p'], [63.9, '这就是 B 站'],
        [64.6, '做梦也要三连', 'y'], [65.3, '猫还在睡 哈哈哈'], [66.6, '最后了'], [67.2, '来了来了 求三连环节', 'y'], [67.9, '好害羞'],
        [68.5, '不用求 已经三连了', 'p'], [69.2, '硬币准备好了'], [69.9, '这个眼神谁顶得住', 'b'], [70.5, '给给给'], [71.1, '可以给我一个……（拖长音）'],
        [72, '三连！！', 'y big'], [72.3, '下次一定', 'b'], [72.6, '下次一定（不是）'], [73, '已三连', 'p'], [73.5, '投币了投币了'],
        [74, '白嫖失败', 'y'], [74.5, '选三连啊！！'], [75, '互动视频！', 'b'], [75.5, '我选下次一定（逃）'],
        [76.2, '三连了！', 'y big'], [76.7, 'UP 主哭成喷泉', 'p'], [77.3, '硬币雨哈哈哈'], [77.9, '谢谢 UP 主', 'b'], [78.6, '好幸福'],
        [79.4, '眼泪都飞出来了'], [80.2, '真诚才是必杀技', 'y'], [81, '等更新！'], [81.7, '已关注 下个视频见', 'p'], [82.6, '猫猫又来了！', 'y'],
        [83.2, '猫：我也要出镜'], [83.9, '这是我见过最真诚的求三连', 'b'], [84.8, '下个视频见！'], [85.6, '催更催更', 'p'], [86.4, '已追更', 'y'],
        [88.2, '下次一定哈哈哈哈', 'y big'], [88.6, '太真实了'], [89.2, '屏幕都灰了', 'b'], [89.8, '心疼小电视', 'p'], [90.4, '头顶下雨了'],
        [91, '我错了我现在就三连', 'y'], [91.6, '白嫖党狂喜（不是）'], [92.4, '风滚草哈哈哈哈'], [93.2, '好冷'], [93.9, '这个眼神谁顶得住', 'p'],
        [94.6, '点赞点赞', 'y big'], [95.2, '被拿捏了', 'b'], [95.9, '这招太狠了'], [96.6, '给你三连还不行吗', 'p'], [97.2, '回去选三连了']
    ];

    /* ---------------- 配乐：拨弦小调 + 各种音效 ---------------- */
    function score() {
        var S = new BP.Score(), f = BP.Score.freq;
        var bpm = 116, beat = 60 / bpm, bar = beat * 4, x, i;
        var PROG = [[['G3', 'B3', 'D4', 'G4'], 'G2'], [['D3', 'F#3', 'A3', 'D4'], 'D2'], [['E3', 'G3', 'B3', 'E4'], 'E2'], [['C3', 'E3', 'G3', 'C4'], 'C2']];
        function groove(t0, bars, o) {
            for (var b = 0; b < bars; b++) {
                var t = t0 + b * bar, pc = PROG[(b + (o.shift || 0)) % 4], pat = o.strum || 'x..x..x.x..x..x.';
                for (var j = 0; j < 16; j++) if (pat[j] === 'x') S.strum(t + j * beat / 4, pc[0], 'pluck', { v: o.v || .04, lp: o.lp }, .012);
                if (o.bass) {
                    S.note(t, 'bass', pc[1], { v: .13, dur: beat * 1.3 });
                    S.note(t + beat * 1.5, 'bass', pc[1], { v: .09, dur: beat * .4 });
                    S.note(t + beat * 2.5, 'bass', pc[1], { v: .11, dur: beat });
                }
            }
            if (o.drums) S.beat(t0, bpm, bars, o.drums, o.dv);
        }
        var r = U.rng(3);

        // 开场
        S.at(.15, 'click', { v: .12 });
        S.at(.4, 'recbeep');
        S.at(3, 'whoosh', { dur: .5 });
        groove(3.6, 4, { v: .05, strum: 'x.......x...x...', bass: true, drums: { shaker: '..x...x...x...x.' }, dv: .8 });
        // 01 拍
        S.at(12, 'whoosh'); S.at(12.3, 'pop', { f: 400 });
        groove(13.4, 6, { v: .042, bass: true, drums: { kick: 'x.....x...x.....', clap: '....x.......x...', shaker: '..x...x...x...x.' } });
        S.melody(13.4 + 2 * bar, bpm, 'G5:.5 A5:.5 B5:1 D6:.5 B5:.5 A5:1 G5:.5 E5:.5 G5:2 r:1 A5:.5 B5:.5 A5:1 G5:.5 E5:.5 D5:1 D5:.5 E5:.5 F#5:1 A5:2', 'whistleLead', { v: .032 });
        S.at(16.1, 'pop', { f: 520 });
        S.at(16.3, 'meow', { v: .055 });
        S.at(20.2, 'meow', { v: .065, s: 1.1 });
        S.at(21, 'shutter');
        S.at(22, 'boing');
        S.at(22.9, 'thud');
        S.at(23.6, 'pop', { f: 700, v: .05 });
        // 02 剪（深夜 lo-fi）
        S.at(26, 'whoosh'); S.at(26.3, 'pop', { f: 380 });
        groove(27.4, 6, { v: .036, lp: 1100, strum: 'x.......x...x...', bass: true, shift: 2, drums: { kick: 'x.........x.....', snare: '........x.......', hat: 'o.o.o.o.o.o.o.o.' }, dv: .7 });
        for (x = 27.6; x < 40.6; x += .5) S.at(x, 'tick', { v: .016 });
        [[28.1, 29.5], [31.3, 32.5], [33.6, 34.3]].forEach(function (b) { for (var y = b[0]; y < b[1]; y += .06 + r() * .08) S.at(y, 'key'); });
        [30, 33.2, 36].forEach(function (y) { S.at(y, 'pop', { f: 450, v: .05 }); S.at(y + .3, 'slurp'); });
        S.at(36.45, 'yawn');
        S.at(37.35, 'pop', { f: 620 });
        // 03 投
        S.at(40, 'whoosh'); S.at(40.3, 'pop', { f: 420 });
        groove(41.4, 2, { v: .036, strum: 'x.......x.......', bass: true, drums: { kick: 'x.......x.......', hat: '..x...x...x...x.' }, dv: .8 });
        var chars = Array.from(TITLE).length;
        for (i = 0; i < chars; i++) S.at(41.6 + i * 2.2 / chars, 'key', { v: .07 });
        S.at(43.9, 'click', { v: .14 });
        [44.6, 44.8, 45, 45.2].forEach(function (y, j) { S.at(y, 'pop', { f: 500 + j * 80, v: .06 }); });
        S.at(46.2, 'click', { v: .16 }); S.at(46.25, 'pop', { f: 300 });
        ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'D6', 'G6'].forEach(function (n, j) { S.note(46.5 + j * .145, 'pluck', n, { v: .04 }); });
        for (x = 48.4; x < 50.3; x += .62) S.at(x, 'heart', { v: .24 });
        S.at(50.4, 'stamp');
        S.at(50.42, 'crash', { v: .07 });
        S.strum(50.45, ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'], 'pluck', { v: .055 }, .02);
        S.at(50.5, 'ding');
        S.at(50.6, 'cheer', { dur: 1.4, v: .022 });
        // 04 被看见
        S.at(52, 'whoosh'); S.at(52.3, 'pop', { f: 360 });
        S.at(53.4, 'pad', { fs: ['G3', 'B3', 'D4'].map(f), v: .011, dur: 1.8, a: .6 });
        S.at(55.5, 'ding', { f: 1760 });
        groove(56, 5, { v: .046, bass: true, drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' } });
        S.at(57, 'riser', { dur: 1.1, v: .06 });
        S.at(58.1, 'crash');
        for (x = 57.2, i = .22; x < 60.5; x += i, i = Math.max(.035, i * .9)) S.at(x, 'tick', { v: .028, f: 2400 });
        NOTIFS.forEach(function (n) { S.at(n[0], 'ding', { f: 1568, v: .04 }); });
        S.at(60.5, 'crash', { v: .1 });
        S.at(60.5, 'cheer', { dur: 2.2 });
        S.melody(60.5, bpm, 'B5:.5 D6:.5 G6:1 F#6:.5 E6:.5 D6:1 B5:.5 D6:.5 E6:1 D6:2', 'whistleLead', { v: .03 });
        // 求三连
        S.at(66, 'whoosh', { dur: .6 });
        [[['G3', 'B3', 'D4'], 'G5', 'G2'], [['E3', 'G3', 'B3'], 'E5', 'E2'], [['C3', 'E3', 'G3'], 'C5', 'C2'], [['D3', 'F#3', 'A3'], 'D5', 'D2']].forEach(function (p, j) {
            var t = 66.6 + j * bar;
            S.at(t, 'pad', { fs: p[0].map(f), v: .02, dur: bar - .15, a: .3 });
            S.note(t, 'bass', p[2], { v: .12, dur: bar * .9 });
            for (var k = 0; k < 4; k++) S.note(t + k * beat, 'pluck', k % 2 ? p[0][2] : p[1], { v: .055 });
        });
        S.at(72, 'stamp', { v: .22 });
        [72, 72.3, 72.6].forEach(function (y, j) { S.at(y, 'pop', { f: 420 + j * 120 }); });
        S.at(73.4, 'roll', { dur: 2.4, v: .085 });
        S.note(75.75, 'bell', 'E6', { v: .05 });
        S.note(75.88, 'bell', 'B6', { v: .05 });
        // 结局 A
        S.at(76.1, 'ding', { f: 1568 }); S.at(76.3, 'coin'); S.at(76.55, 'ding', { f: 2093 }); S.at(76.9, 'crash');
        groove(77, 4, { v: .05, bass: true, strum: 'x.x.x.x.x.x.x.x.', drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'oxoxoxoxoxoxoxox' }, dv: .9 });
        for (x = 77.2; x < 84.6; x += .28 + r() * .3) S.at(x, 'coin', { v: .016 });
        S.at(77, 'cheer', { dur: 2.5, v: .026 });
        S.at(82.25, 'boing'); S.at(82.9, 'thud', { v: .15 }); S.at(83.1, 'meow', { v: .05 });
        S.strum(85, ['G3', 'D4', 'G4', 'B4', 'D5', 'G5'], 'pluck', { v: .06 }, .05);
        S.melody(85.2, bpm, 'G5:.5 B5:.5 D6:.5 G6:2', 'bell', { v: .045 });
        // 结局 B
        S.at(88, 'scratch', { v: .24 });
        S.at(89, 'trombone', { v: .13 });
        S.at(89.5, 'noise', { dur: 3.6, v: .018 });
        S.at(92.3, 'wind', { v: .045 });
        S.at(93.2, 'sniff', { v: .06 });
        S.at(93.5, 'pop', { f: 520, v: .1 });
        S.at(93.8, 'pad', { fs: ['G3', 'B3', 'D4'].map(f), v: .016, dur: 3.6, a: .6 });
        S.melody(94, 100, 'G5:.5 B5:.5 D6:.5 B5:.5 G6:1.5', 'bell', { v: .07 });
        S.at(94.5, 'pop', { f: 700, v: .1 });
        // 说话声
        SUBS.forEach(function (s) {
            var o = s[3] || {};
            if (!o.cps) return;
            var sad = o.voice === 'sad';
            S.say(s[0], s[2], { cps: o.cps, base: sad ? 300 : 560, w: sad ? 'triangle' : 'square', v: sad ? .06 : .04 });
        });
        return S.done();
    }

    BP.films.upload = {
        id: 'upload',
        title: '【新人UP】第一次投稿，紧张到手抖，求三连！',
        alt: '动画短片：B 站小电视第一次当 UP 主，拍猫、剪到凌晨、投稿过审、播放量涨到 1.2 万，最后请观众选择一键三连还是下次一定。',
        duration: 98,
        poster: -1,
        subStyle: 'vlog',
        dmDur: 8,
        chapters: [
            { t: 0, title: '开场' }, { t: 12, title: '拍' }, { t: 26, title: '剪' },
            { t: 40, title: '投' }, { t: 52, title: '被看见' }, { t: 66, title: '求三连' }
        ],
        energy: [57],
        subs: SUBS,
        danmaku: DM,
        choice: {
            at: 76,
            q: '你的选择是？',
            options: [
                { id: 'A', label: '一键三连！', sub: '点赞 + 投币 + 收藏', icon: '👍🪙⭐', cls: 'pink', from: 76, to: 88, title: '结局 · 三连' },
                { id: 'B', label: '下次一定', sub: '（经典白嫖）', icon: '🙈', from: 88, to: 98, title: '结局 · 下次一定' }
            ]
        },
        score: score,
        render: render
    };
})();
