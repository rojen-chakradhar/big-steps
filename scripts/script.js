const cv = document.getElementById("c"),
	g = cv.getContext("2d"),
	W = 800,
	H = 600;
const lerp = (a, b, t) => a + (b - a) * t,
	cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
	sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) =>
	`rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
let seed = 5;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// sound
let ac;
function beep(f, d, tp = "square", v = 0.04, s = 0) {
	try {
		ac = ac || new AudioContext();
		if (ac.state === "suspended") ac.resume();
		const o = ac.createOscillator(),
			n = ac.createGain(),
			t = ac.currentTime;
		o.type = tp;
		o.frequency.setValueAtTime(f, t);
		if (s) o.frequency.exponentialRampToValueAtTime(s, t + d);
		n.gain.setValueAtTime(v, t);
		n.gain.exponentialRampToValueAtTime(0.001, t + d);
		o.connect(n);
		n.connect(ac.destination);
		o.start();
		o.stop(t + d);
	} catch (e) {}
}
// world
const SW = 120,
	SH = 64,
	NS = 32,
	STX = 300,
	GATEX = STX + NS * SW + 300,
	BODYX = 212;
const sy = (x) => -cl(Math.floor((x - STX) / SW) + 1, 0, NS) * SH;
const stars = [...Array(80)].map(() => ({
	x: rnd() * W,
	y: rnd() * H,
	r: rnd() * 1.6 + 0.6,
}));
const clouds = [...Array(16)].map(() => ({
	x: rnd() * 2400,
	y: rnd() * 480,
	s: 0.6 + rnd() * 1.3,
	f: 0.12 + rnd() * 0.25,
}));
let S = "wake",
	lt = 0,
	time = 0,
	rt = 0,
	wt = 0,
	lostT = 0,
	flash = 0,
	hb = 0,
	hbT = 0,
	fl = 0,
	ch = 0;
let p, dk, orbs, gu;
const LT = 7.8;
function reset() {
	seed = 5;
	p = { x: 250, y: 0, ph: 0, stam: 100, tired: 0, dist: 0, idx: 0 };
	dk = -450;
	orbs = [];
	for (let i = 2; i < NS; i++)
		if (i % 5 === 0 || rnd() < 0.06)
			orbs.push({ x: STX + i * SW + SW / 2, i, got: 0 });
	gu = { s: "idle", t: 10 };
	time = 0;
	rt = 0;
	wt = 0;
	lostT = 0;
	hb = 0;
}
reset();
function toReady() {
	S = "ready";
	reset();
	flash = 1;
}
function play() {
	S = "play";
	beep(330, 0.2, "sine", 0.04, 660);
}
// input
const keys = {},
	T = { l: 0, r: 0 };
addEventListener("keydown", (e) => {
	if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key))
		e.preventDefault();
	keys[e.key] = true;
	if (e.repeat) return;
	act(e.key);
});
addEventListener("keyup", (e) => (keys[e.key] = false));
function act(k) {
	if (S === "wake") {
		S = "loader";
		lt = 0;
		hbT = 0.3;
		fl = ch = 0;
	} else if (S === "loader") {
		if (lt > 1.5) toReady();
	} else if (S === "ready") {
		if (
			k === " " ||
			k === "Enter" ||
			k === "ArrowRight" ||
			k === "d" ||
			k === "D" ||
			k === "tap"
		)
			play();
	} else if (k === "r" || k === "R" || (k === "tap" && S !== "play")) {
		if (S !== "ready") {
			reset();
			S = "play";
		}
	}
}
function tz(e) {
	const r = cv.getBoundingClientRect();
	T.l = T.r = 0;
	for (const t of e.touches) {
		const x = (t.clientX - r.left) / r.width;
		if (x < 0.5) T.l = 1;
		else T.r = 1;
	}
}
cv.addEventListener(
	"touchstart",
	(e) => {
		e.preventDefault();
		tz(e);
		act("tap");
	},
	{ passive: false },
);
cv.addEventListener(
	"touchmove",
	(e) => {
		e.preventDefault();
		tz(e);
	},
	{ passive: false },
);
cv.addEventListener(
	"touchend",
	(e) => {
		e.preventDefault();
		tz(e);
	},
	{ passive: false },
);
cv.addEventListener("mousedown", () => act("tap"));
// update
function step(dt) {
	if (S === "wake") return;
	if (S === "loader") {
		lt += dt;
		if (lt < 2.55) {
			hbT -= dt;
			if (hbT <= 0) {
				beep(70, 0.1, "sine", 0.12);
				setTimeout(() => beep(60, 0.1, "sine", 0.08), 150);
				hbT = 0.7 + lt * 0.3;
			}
		}
		if (!fl && lt >= 2.6) {
			fl = 1;
			beep(880, 1.3, "sine", 0.025);
		}
		if (!ch && lt >= 3.4) {
			ch = 1;
			[523, 659, 784].forEach((f, i) =>
				setTimeout(() => beep(f, 1.8, "sine", 0.03), i * 150),
			);
		}
		if (lt >= LT) toReady();
		return;
	}
	time += dt;
	flash = Math.max(0, flash - dt * 1.2);
	if (S === "won") {
		wt += dt;
		p.x += 45 * dt;
		p.ph += dt * 6;
		return;
	}
	if (S === "lost") {
		lostT += dt;
		return;
	}
	if (S !== "play") return;
	rt += dt;
	const run = keys.Shift || keys[" "] || keys.ArrowUp || T.r;
	const mv = run || keys.ArrowRight || keys.d || keys.D || T.l;
	if (p.stam <= 0) p.tired = 1;
	if (p.tired && p.stam >= 30) p.tired = 0;
	let v = 0;
	if (mv && !p.tired) {
		v = run ? 130 : 54;
		if (p.stam < 25) v *= 0.75;
		p.stam = Math.max(0, p.stam - (run ? 22 : 4.5) * dt);
	} else p.stam = Math.min(100, p.stam + (p.tired ? 11 : 18) * dt);
	gu.t -= dt;
	if (gu.s === "idle" && gu.t <= 0) {
		gu.s = "warn";
		gu.t = 0.5;
		beep(200, 0.4, "sine", 0.04, 90);
	} else if (gu.s === "warn" && gu.t <= 0) {
		gu.s = "blow";
		gu.t = 3.5;
	} else if (gu.s === "blow" && gu.t <= 0) {
		gu.s = "idle";
		gu.t = 9 + rnd() * 6;
	}
	if (gu.s === "blow") v -= 55;
	p.x = Math.max(120, p.x + v * dt);
	if (v > 0) {
		p.ph += v * dt * 0.13;
		p.dist += v * dt;
		if (p.dist > 20) {
			p.dist = 0;
			beep(150, 0.04, "triangle", 0.025);
		}
	}
	const ty = sy(p.x),
		ni = Math.floor((p.x - STX) / SW);
	if (ni !== p.idx) {
		if (ni > p.idx) beep(260, 0.05, "sine", 0.03);
		p.idx = ni;
	}
	p.y += (ty - p.y) * cl(16 * dt);
	const far = p.x - dk;
	dk += (32 + cl(rt / 90) * 12) * (far > 900 ? 1.4 : 1) * dt;
	for (const o of orbs)
		if (!o.got && Math.abs(o.x - p.x) < 18) {
			o.got = 1;
			p.stam = Math.min(100, p.stam + 20);
			beep(900, 0.25, "sine", 0.05, 1500);
		}
	hb -= dt;
	const d = p.x - dk;
	if (d < 300 && hb <= 0) {
		beep(55, 0.12, "sine", 0.1);
		hb = 0.45 + d / 600;
	}
	if (dk + 10 >= p.x) {
		S = "lost";
		lostT = 0;
		beep(200, 1.4, "sawtooth", 0.06, 35);
		return;
	}
	if (p.x >= GATEX - 10) {
		S = "won";
		wt = 0;
		[523, 659, 784, 1047, 1319].forEach((f, i) =>
			setTimeout(() => beep(f, 0.9, "sine", 0.05), i * 180),
		);
	}
}
// drawing
function person(x, y, o = {}) {
	g.save();
	g.translate(x, y);
	g.rotate(o.rot || 0);
	g.scale(1, o.sq || 1);
	g.globalAlpha = o.a ?? 1;
	const so = o.soul,
		sw = o.walk ? Math.sin(o.ph || 0) * 6 : 0,
		b = o.walk ? Math.abs(Math.sin(o.ph || 0)) * 1.5 : 0;
	if (so) {
		g.shadowColor = "#bfe9ff";
		g.shadowBlur = 14;
	}
	g.lineCap = "round";
	g.lineWidth = 3.5;
	g.strokeStyle = so ? "#eaf6ff" : "#2c3e50";
	g.beginPath();
	g.moveTo(0, -13 - b);
	g.lineTo(sw, 0);
	g.moveTo(0, -13 - b);
	g.lineTo(-sw, 0);
	g.stroke();
	g.fillStyle = so ? "#f4fbff" : "#3b6ea5";
	g.fillRect(-5, -25 - b, 10, 13);
	g.strokeStyle = so ? "#eaf6ff" : "#3b6ea5";
	g.beginPath();
	g.moveTo(0, -23 - b);
	g.lineTo(-sw * 0.8, -14 - b);
	g.moveTo(0, -23 - b);
	g.lineTo(sw * 0.8, -14 - b);
	g.stroke();
	g.fillStyle = so ? "#fff" : "#f0c8a0";
	g.beginPath();
	g.arc(0, -30 - b, 5.5, 0, 7);
	g.fill();
	if (!so) {
		g.fillStyle = "#5d4037";
		g.beginPath();
		g.arc(0, -32 - b, 5.5, Math.PI, 0);
		g.fill();
	}
	g.shadowBlur = 0;
	g.fillStyle = "#456";
	g.fillRect(2, -31 - b, 1.6, 2);
	g.restore();
}
function txt(s, x, y, sz = 18, col = "#fff", al = "center") {
	g.font = `bold ${sz}px monospace`;
	g.textAlign = al;
	g.fillStyle = "rgba(0,0,0,.65)";
	g.fillText(s, x + 2, y + 2);
	g.fillStyle = col;
	g.fillText(s, x, y);
}
function drawLoader() {
	const t = lt,
		gy = 440,
		u = cl(t / 2.4),
		px = lerp(60, BODYX, 1 - (1 - u) * (1 - u));
	const bg = g.createLinearGradient(0, 0, 0, H);
	bg.addColorStop(0, "#05061a");
	bg.addColorStop(1, "#1c1a3a");
	g.fillStyle = bg;
	g.fillRect(0, 0, W, H);
	g.fillStyle = "#fff";
	for (const s of stars) {
		g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + s.x);
		g.fillRect(s.x, s.y * 0.7, s.r, s.r);
	}
	g.globalAlpha = 1;
	g.fillStyle = "#e8ecff";
	g.beginPath();
	g.arc(650, 110, 34, 0, 7);
	g.fill();
	g.fillStyle = "#10102a";
	g.fillRect(0, gy, W, H - gy);
	const lb = cl((t - 3.4) / 1.5);
	if (lb > 0) {
		g.fillStyle = `rgba(255,244,200,${0.35 * lb})`;
		g.beginPath();
		g.moveTo(BODYX - 6, 0);
		g.lineTo(BODYX + 34, 0);
		g.lineTo(BODYX + 110, gy);
		g.lineTo(BODYX - 90, gy);
		g.fill();
	}
	const f = cl((t - 2.4) / 0.7);
	person(px, gy, {
		rot: (sm(f) * Math.PI) / 2,
		walk: u < 1,
		ph: t * 6 * (1 - 0.6 * u),
	});
	if (t > 3.3) {
		const k = cl((t - 3.3) / 1.8);
		for (let i = 0; i < 8; i++) {
			g.fillStyle = `rgba(220,240,255,${0.5 * k})`;
			g.fillRect(
				BODYX + 16 + Math.sin(t * 1.5 + i * 2) * 30,
				gy - 30 - sm(k) * 190 + ((t * 40 + i * 37) % 80) - 40,
				2,
				2,
			);
		}
		person(BODYX + 16 + Math.sin(t * 2) * 4, gy - 14 - sm(k) * 190, {
			soul: 1,
			a: 0.88 * k,
		});
	}
	const cap =
		t < 1.8
			? "a life, like any other."
			: t < 3.3
				? "…"
				: t < 3.8
					? "but it isn’t the end."
					: "";
	txt(cap, W / 2, 80, 20, "#cfd8ff");
	if (t > 3.6) {
		const q = cl((t - 3.6) / 3.2);
		txt(
			"loading the afterlife… " + Math.round(q * 100) + "%",
			W / 2,
			500,
			16,
			"#dfe9ff",
		);
		g.fillStyle = "rgba(255,255,255,.15)";
		g.fillRect(250, 510, 300, 8);
		g.fillStyle = "#ffe9a8";
		g.fillRect(250, 510, 300 * q, 8);
	}
	if (t > 1.5) txt("press any key to skip", W - 14, 24, 12, "#889", "right");
	if (t > 6.8) {
		g.fillStyle = `rgba(255,255,255,${cl(t - 6.8)})`;
		g.fillRect(0, 0, W, H);
	}
}
function gate() {
	const gx = GATEX,
		gy = -NS * SH,
		open = cl((700 - (GATEX - p.x)) / 550);
	const gl = g.createRadialGradient(gx, gy - 300, 20, gx, gy - 300, 700);
	gl.addColorStop(0, `rgba(255,250,215,${0.3 + 0.7 * open})`);
	gl.addColorStop(1, "rgba(255,240,180,0)");
	g.fillStyle = gl;
	g.fillRect(gx - 800, gy - 1100, 1600, 1400);
	g.fillStyle = "#fffbe6";
	g.fillRect(gx - 80, gy - 600, 160, 600);
	g.fillStyle = "#e2b84a";
	g.fillRect(gx - 80, gy - 600, 80 * (1 - open), 600);
	g.fillRect(gx + 80 - 80 * (1 - open), gy - 600, 80 * (1 - open), 600);
	g.fillStyle = "rgba(120,80,0,.3)";
	for (let i = 1; i < 6; i++) {
		g.fillRect(gx - 80 + i * 13 * (1 - open), gy - 600, 2, 600);
		g.fillRect(gx + 80 - i * 13 * (1 - open), gy - 600, 2, 600);
	}
	g.fillStyle = "#f3ead3";
	g.fillRect(gx - 150, gy - 650, 70, 650);
	g.fillRect(gx + 80, gy - 650, 70, 650);
	g.fillRect(gx - 170, gy - 700, 340, 50);
	g.beginPath();
	g.moveTo(gx - 190, gy - 700);
	g.lineTo(gx, gy - 790);
	g.lineTo(gx + 190, gy - 700);
	g.fill();
	g.fillStyle = "rgba(0,0,0,.1)";
	g.fillRect(gx - 150, gy - 650, 14, 650);
	g.fillRect(gx + 80, gy - 650, 14, 650);
}
function drawGame() {
	const t = cl(p.x / GATEX),
		z = lerp(1, 0.55, sm(cl((p.x - (GATEX - 1000)) / 700)));
	const sk = g.createLinearGradient(0, 0, 0, H);
	sk.addColorStop(0, mix([8, 8, 28], [255, 236, 180], sm(t)));
	sk.addColorStop(1, mix([34, 24, 66], [255, 250, 225], sm(t)));
	g.fillStyle = sk;
	g.fillRect(0, 0, W, H);
	g.fillStyle = "#fff";
	for (const s of stars) {
		g.globalAlpha = cl(1 - t * 1.4) * 0.8;
		g.fillRect((((s.x - p.x * 0.02) % W) + W) % W, s.y, s.r, s.r);
	}
	g.globalAlpha = 1;
	for (let i = 0; i < 6; i++) {
		const x = ((((i * 520 - p.x * 0.35) % 3120) + 3120) % 3120) - 300;
		g.fillStyle = "rgba(255,255,255,.07)";
		g.fillRect(x, 0, 120, H);
		g.fillRect(x - 14, 0, 148, 22);
	}
	for (const c of clouds) {
		const x = ((((c.x - p.x * c.f) % 2400) + 2400) % 2400) - 300,
			y = c.y + p.y * c.f * 0.2;
		g.fillStyle = `rgba(255,255,255,${0.1 + 0.25 * t})`;
		g.beginPath();
		g.ellipse(x, y, 70 * c.s, 22 * c.s, 0, 0, 7);
		g.ellipse(x + 40 * c.s, y - 10 * c.s, 50 * c.s, 20 * c.s, 0, 0, 7);
		g.fill();
	}
	g.save();
	g.translate(280, 400);
	g.scale(z, z);
	g.translate(-p.x, -p.y);
	const i0 = Math.floor((p.x - 280 / z - STX) / SW) - 1,
		i1 = Math.ceil((p.x + 540 / z - STX) / SW) + 1;
	for (let i = i0; i <= i1; i++) {
		const x = STX + i * SW,
			top = -cl(i + 1, 0, NS) * SH;
		g.fillStyle = "#b8af9b";
		g.fillRect(x, top, SW + 1, SH * 30);
		g.fillStyle = "#d6cfbd";
		g.fillRect(x, top, SW + 1, SH * 0.55);
		g.fillStyle = "#f5f0e4";
		g.fillRect(x, top, SW + 1, 5);
		g.fillStyle = "rgba(0,0,0,.12)";
		g.fillRect(x, top, 2, SH * 30);
	}
	gate();
	for (const o of orbs)
		if (!o.got) {
			const oy = -cl(o.i + 1, 0, NS) * SH - 28 + Math.sin(time * 3 + o.i) * 4;
			g.fillStyle = "rgba(255,240,170,.3)";
			g.beginPath();
			g.arc(o.x, oy, 15, 0, 7);
			g.fill();
			g.fillStyle = "#fff7c2";
			g.beginPath();
			g.arc(o.x, oy, 5, 0, 7);
			g.fill();
		}
	person(BODYX, 0, { rot: Math.PI / 2 });
	const wa = S === "won" ? cl(1 - wt / 2.2) : 1,
		mvg =
			S === "play" &&
			(keys.ArrowRight ||
				keys.d ||
				keys.D ||
				keys[" "] ||
				keys.Shift ||
				keys.ArrowUp ||
				T.l ||
				T.r) &&
			!p.tired;
	person(p.x, p.y, {
		soul: 1,
		a: wa,
		walk: mvg || S === "won",
		ph: p.ph,
		sq: p.tired ? 0.8 : 1,
	});
	const yT = p.y - 420 / z,
		yB = p.y + 260 / z;
	for (const [off, col] of [
		[50, "rgba(7,4,12,.4)"],
		[0, "#07040c"],
	]) {
		g.fillStyle = col;
		g.beginPath();
		g.moveTo(dk - 3000, yT - 50);
		for (let y = yT - 50; y <= yB + 50; y += 25)
			g.lineTo(
				dk +
					off +
					Math.sin(y * 0.02 + time * 2) * 22 +
					Math.sin(y * 0.06 - time * 3) * 10,
				y,
			);
		g.lineTo(dk - 3000, yB + 50);
		g.fill();
	}
	for (let k = 0; k < 8; k++) {
		const ey = yT + ((k * 131 + time * 25) % (yB - yT));
		g.fillStyle = `rgba(255,60,60,${0.4 + 0.4 * Math.sin(time * 4 + k)})`;
		g.fillRect(dk - 20 - k * 35, ey, 4, 3);
		g.fillRect(dk - 30 - k * 35, ey, 4, 3);
	}
	g.restore();
	if (gu.s !== "idle") {
		g.fillStyle = `rgba(255,255,255,${gu.s === "warn" ? 0.15 : 0.35})`;
		for (let k = 0; k < 14; k++)
			g.fillRect(
				W + 100 - ((time * 900 + k * 173) % 1000),
				(k * 47) % H,
				90,
				2,
			);
	}
	const d = p.x - dk;
	if (d < 400) {
		const vg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 520);
		vg.addColorStop(0, "rgba(120,0,0,0)");
		vg.addColorStop(1, `rgba(120,0,0,${(1 - d / 400) * 0.55})`);
		g.fillStyle = vg;
		g.fillRect(0, 0, W, H);
	}
	if (S === "play" || S === "ready") {
		g.fillStyle = "rgba(0,0,0,.45)";
		g.fillRect(16, 16, 224, 18);
		g.fillStyle = p.stam > 50 ? "#6fe08a" : p.stam > 25 ? "#f1c40f" : "#e74c3c";
		g.fillRect(18, 18, (220 * p.stam) / 100, 14);
		txt("STRENGTH", 22, 48, 12, "#fff", "left");
		if (p.tired && Math.floor(time * 3) % 2)
			txt("exhausted — rest!", 250, 30, 14, "#ff8a80", "left");
		g.fillStyle = "rgba(0,0,0,.45)";
		g.fillRect(W / 2 - 150, 20, 300, 8);
		g.fillStyle = "#ffe082";
		g.fillRect(W / 2 - 150, 20, 300 * cl(p.x / GATEX), 8);
		g.fillStyle = "#000";
		g.fillRect(W / 2 - 150, 20, 300 * cl(dk / GATEX), 8);
		txt("GATE", W / 2 + 150, 46, 11, "#ffe082", "right");
		txt(`${rt.toFixed(0)}s`, W - 14, 30, 16, "#fff", "right");
	}
	if (S === "ready") {
		g.fillStyle = "rgba(10,8,30,.72)";
		g.fillRect(0, 110, W, 330);
		txt("BIG STEPS", W / 2, 175, 40, "#ffe9a8");
		txt(
			"you’re just a little soul. the gate is very, very big.",
			W / 2,
			215,
			17,
		);
		txt(
			"walk (→ / D): slow, cheap.     run (SPACE / SHIFT): fast, costly.",
			W / 2,
			275,
			15,
		);
		txt(
			"rest to recover — but the dark behind you never rests.",
			W / 2,
			300,
			15,
			"#ff9e9e",
		);
		txt("glowing orbs restore strength. wind pushes you back.", W / 2, 325, 15);
		txt(
			"touch: hold left half = walk, right half = run",
			W / 2,
			350,
			13,
			"#bbb",
		);
		txt("press SPACE or tap to climb", W / 2, 405, 22, "#a5d6a7");
	}
	if (S === "won") {
		g.fillStyle = `rgba(255,252,235,${cl(wt / 2)})`;
		g.fillRect(0, 0, W, H);
		if (wt > 1.8) {
			txt("YOU PASSED THE GATE", W / 2, 260, 40, "#b08a1e");
			txt(
				`${rt.toFixed(0)} seconds. not bad for a little soul.`,
				W / 2,
				310,
				18,
				"#7a6420",
			);
			txt("press R to climb again", W / 2, 380, 18, "#7a6420");
		}
	}
	if (S === "lost") {
		g.fillStyle = `rgba(0,0,0,${cl(lostT / 1.4)})`;
		g.fillRect(0, 0, W, H);
		if (lostT > 1) {
			txt("the weight pulled you back down.", W / 2, 260, 28, "#ff8a80");
			txt("rest less. the dark never stops.", W / 2, 305, 16, "#aaa");
			txt("press R or tap to try again", W / 2, 380, 18, "#fff");
		}
	}
	if (flash > 0) {
		g.fillStyle = `rgba(255,255,255,${flash})`;
		g.fillRect(0, 0, W, H);
	}
}
function draw() {
	if (S === "wake") {
		g.fillStyle = "#000";
		g.fillRect(0, 0, W, H);
		txt("headphones recommended", W / 2, 270, 16, "#778");
		txt("press any key or tap to begin", W / 2, 310, 22, "#dfe9ff");
		return;
	}
	if (S === "loader") drawLoader();
	else drawGame();
}
let last = performance.now(),
	acc = 0;
function loop(t) {
	acc += Math.min(0.1, (t - last) / 1000);
	last = t;
	while (acc >= 1 / 60) {
		step(1 / 60);
		acc -= 1 / 60;
	}
	draw();
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);