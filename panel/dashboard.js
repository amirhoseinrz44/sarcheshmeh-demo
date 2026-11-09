/**
 * Sarcheshmeh (Channel Analytics) - dashboard.
 */
(function () {
	'use strict';

	var cfg = window.ncaDash || {};
	var hasWoo = !!parseInt(cfg.hasWoo, 10);
	var CH = cfg.channels || {};
	var KINDS = cfg.kinds || {};
	var GROUPS = cfg.groups || {};
	var DAY = 864e5;
	var FONT = 'Vazirmatn, "B Yekan", Tahoma, sans-serif';
	var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

	var nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });
	var nf1 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

	function $(id) { return document.getElementById(id); }
	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function num(n) { return nf.format(Math.round(n || 0)); }
	function faDigits(s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); }); }
	function enDigits(s) {
		return String(s || '').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
			.replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
	}
	function money(n) {
		return num(n) + (cfg.currency ? ' ' + cfg.currency : '');
	}
	function compact(n) {
		var a = Math.abs(n || 0);
		if (a >= 1e9) { return nf1.format(n / 1e9) + ' میلیارد'; }
		if (a >= 1e6) { return nf1.format(n / 1e6) + ' میلیون'; }
		if (a >= 1e4) { return nf1.format(n / 1e3) + ' هزار'; }
		return num(n);
	}
	function compactMoney(n) { return compact(n) + (cfg.currency ? ' ' + cfg.currency : ''); }
	function kpiMoney(n) {
		var a = Math.abs(n || 0), v = num(n), unit = '';
		if (a >= 1e9) { v = nf1.format(n / 1e9); unit = 'میلیارد'; } else if (a >= 1e6) { v = nf1.format(n / 1e6); unit = 'میلیون'; } else if (a >= 1e4) { v = nf1.format(n / 1e3); unit = 'هزار'; }
		unit = (unit + ' ' + (cfg.currency || '')).trim();
		return esc(v) + (unit ? '<small>' + esc(unit) + '</small>' : '');
	}
	function pct(part, whole) { return whole ? (part / whole) * 100 : 0; }

	/* ---------------------------------------------------------- */
	/* Jalali calendar                                            */
	/* ---------------------------------------------------------- */

	function div(a, b) { return ~~(a / b); }
	function g2j(gy, gm, gd) {
		var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
		var gy2 = gm > 2 ? gy + 1 : gy;
		var days = 355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd + gdm[gm - 1];
		var jy = -1595 + 33 * div(days, 12053);
		days %= 12053;
		jy += 4 * div(days, 1461);
		days %= 1461;
		if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
		var jm, jd;
		if (days < 186) { jm = 1 + div(days, 31); jd = 1 + (days % 31); } else { jm = 7 + div(days - 186, 30); jd = 1 + ((days - 186) % 30); }
		return [jy, jm, jd];
	}
	function j2g(jy, jm, jd) {
		jy += 1595;
		var days = -355668 + 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
		var gy = 400 * div(days, 146097);
		days %= 146097;
		if (days > 36524) { days--; gy += 100 * div(days, 36524); days %= 36524; if (days >= 365) { days++; } }
		gy += 4 * div(days, 1461);
		days %= 1461;
		if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
		var gd = days + 1;
		var leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
		var sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		var gm;
		for (gm = 0; gm < 13 && gd > sal[gm]; gm++) { gd -= sal[gm]; }
		return [gy, gm, gd];
	}
	function toDate(ymd) { var p = ymd.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
	function toYMD(d) { return d.toISOString().slice(0, 10); }
	function addDays(ymd, n) { return toYMD(new Date(toDate(ymd).getTime() + n * DAY)); }
	function gArr(ymd) { var p = ymd.split('-'); return [+p[0], +p[1], +p[2]]; }
	function fromJ(jy, jm, jd) { var g = j2g(jy, jm, jd); return toYMD(new Date(Date.UTC(g[0], g[1] - 1, g[2]))); }
	function jText(ymd) {
		var g = gArr(ymd);
		var j = g2j(g[0], g[1], g[2]);
		return faDigits(j[0] + '/' + (j[1] < 10 ? '0' : '') + j[1] + '/' + (j[2] < 10 ? '0' : '') + j[2]);
	}
	function parseJ(s) {
		var m = enDigits(s).trim().match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
		if (!m) { return ''; }
		var jy = +m[1], jm = +m[2], jd = +m[3];
		if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) { return ''; }
		var ymd = fromJ(jy, jm, jd);
		// Reject days that do not exist (1405/07/31, 1404/12/30 in a common year ...).
		var back = gArr(ymd);
		var j = g2j(back[0], back[1], back[2]);
		return (j[0] === jy && j[1] === jm && j[2] === jd) ? ymd : '';
	}

	function presetRange(preset) {
		var t = cfg.today || toYMD(new Date());
		var g = gArr(t);
		var j = g2j(g[0], g[1], g[2]);
		switch (preset) {
			case 'today': return [t, t];
			case 'yesterday': return [addDays(t, -1), addDays(t, -1)];
			case 'last7': return [addDays(t, -6), t];
			case 'last90': return [addDays(t, -89), t];
			case 'this_month': return [fromJ(j[0], j[1], 1), t];
			case 'last_month': {
				var py = j[1] === 1 ? j[0] - 1 : j[0];
				var pm = j[1] === 1 ? 12 : j[1] - 1;
				return [fromJ(py, pm, 1), addDays(fromJ(j[0], j[1], 1), -1)];
			}
			case 'this_year': return [fromJ(j[0], 1, 1), t];
			case 'last_year': return [fromJ(j[0] - 1, 1, 1), addDays(fromJ(j[0], 1, 1), -1)];
			default: return [addDays(t, -29), t];
		}
	}
	function daysBetween(a, b) { return Math.round((toDate(b) - toDate(a)) / DAY) + 1; }
	function autoGroup(from, to) {
		var d = daysBetween(from, to);
		if (d <= 31) { return 'day'; }
		if (d <= 120) { return 'week'; }
		if (d <= 800) { return 'month'; }
		return 'year';
	}

	/* ---------------------------------------------------------- */
	/* State                                                      */
	/* ---------------------------------------------------------- */

	var saved = {};
	try { saved = JSON.parse(localStorage.getItem('nca_dash') || '{}') || {}; } catch (e) { saved = {}; }

	var state = {
		preset: saved.preset || 'last30',
		from: '',
		to: '',
		model: saved.model || cfg.model || 'last',
		group: '',
		metric: hasWoo ? (saved.metric || 'revenue') : 'leads',
		data: null,
		open: {},
		srcFilter: 'all',
		topSort: 'qty',
		tab: saved.tab || 'overview',
		bhMetric: 'sessions',
		cmpSearch: '',
		cmpType: 'all'
	};
	if (!hasWoo) { state.metric = 'leads'; }
	if (state.preset === 'custom' && saved.from && saved.to) {
		state.from = saved.from;
		state.to = saved.to;
	} else {
		if (state.preset === 'custom') { state.preset = 'last30'; }
		var r0 = presetRange(state.preset);
		state.from = r0[0];
		state.to = r0[1];
	}
	state.group = saved.group && saved.preset === state.preset ? saved.group : autoGroup(state.from, state.to);

	function persist() {
		try {
			localStorage.setItem('nca_dash', JSON.stringify({ preset: state.preset, from: state.from, to: state.to, model: state.model, group: state.group, metric: state.metric, tab: state.tab }));
		} catch (e) { /* ignore */ }
	}

	/* ---------------------------------------------------------- */
	/* Controls                                                   */
	/* ---------------------------------------------------------- */

	function setSeg(id, value) {
		var el = $(id);
		if (!el) { return; }
		el.querySelectorAll('button').forEach(function (b) {
			b.setAttribute('aria-pressed', b.getAttribute('data-v') === value ? 'true' : 'false');
		});
	}
	function bindSeg(id, key, reload) {
		var el = $(id);
		if (!el) { return; }
		el.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-v]');
			if (!b) { return; }
			state[key] = b.getAttribute('data-v');
			setSeg(id, state[key]);
			persist();
			if (reload) { load(); } else { render(); }
		});
	}

	var presetSel = $('nca-preset');
	presetSel.value = state.preset;
	$('nca-custom').hidden = state.preset !== 'custom';
	if (state.preset === 'custom') {
		$('nca-from').value = jText(state.from);
		$('nca-to').value = jText(state.to);
	}
	presetSel.addEventListener('change', function () {
		state.preset = presetSel.value;
		if (state.preset === 'custom') {
			$('nca-custom').hidden = false;
			$('nca-from').value = jText(state.from);
			$('nca-to').value = jText(state.to);
			openCal();
			return;
		}
		closeCal();
		$('nca-custom').hidden = true;
		var r = presetRange(state.preset);
		state.from = r[0];
		state.to = r[1];
		state.group = autoGroup(state.from, state.to);
		setSeg('nca-group', state.group);
		persist();
		load();
	});
	$('nca-apply').addEventListener('click', function () {
		var f = parseJ($('nca-from').value);
		var t = parseJ($('nca-to').value);
		if (!f || !t) {
			$('nca-range').textContent = 'تاریخ معتبر نیست. تاریخ را به شکل ۱۴۰۵/۰۷/۰۱ وارد کنید یا از تقویم انتخاب کنید.';
			return;
		}
		if (f > t) { var tmp = f; f = t; t = tmp; }
		closeCal();
		state.from = f;
		state.to = t;
		state.group = autoGroup(f, t);
		setSeg('nca-group', state.group);
		persist();
		load();
	});
	['nca-from', 'nca-to'].forEach(function (id) {
		$(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') { $('nca-apply').click(); } });
	});

	setSeg('nca-model', state.model);
	setSeg('nca-group', state.group);
	setSeg('nca-metric', state.metric);
	bindSeg('nca-model', 'model', true);
	bindSeg('nca-group', 'group', true);
	bindSeg('nca-metric', 'metric', false);

	function exportUrl(kind) {
		var url = String(cfg.exportUrl || '');
		return url + (url.indexOf('?') === -1 ? '?' : '&') + 'from=' + encodeURIComponent(state.from) + '&to=' + encodeURIComponent(state.to) +
			'&model=' + encodeURIComponent(state.model) + (kind ? '&kind=' + encodeURIComponent(kind) : '');
	}
	function closeMenu() { var m = $('nca-export-menu'); if (m) { m.open = false; } }
	$('nca-export').addEventListener('click', function (e) {
		e.preventDefault();
		closeMenu();
		window.location.href = exportUrl('');
	});
	$('nca-export-summary').addEventListener('click', function (e) {
		e.preventDefault();
		closeMenu();
		window.location.href = exportUrl('summary');
	});
	$('nca-print').addEventListener('click', function () {
		closeMenu();
		setTimeout(function () { window.print(); }, 50);
	});
	window.addEventListener('beforeprint', function () {
		Object.keys(charts).forEach(function (k) { if (charts[k]) { charts[k].resize(); } });
	});
	document.addEventListener('click', function (e) {
		var m = $('nca-export-menu');
		if (m && m.open && !m.contains(e.target)) { m.open = false; }
	});

	/* ---------------------------------------------------------- */
	/* Jalali range calendar                                      */
	/* ---------------------------------------------------------- */

	var cal = $('nca-cal');
	var calView = null;
	var pick = { from: '', to: '', step: 0 };
	var WEEK = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

	function jMonthDays(jy, jm) {
		if (jm <= 6) { return 31; }
		if (jm <= 11) { return 30; }
		return parseJ(jy + '/12/30') ? 30 : 29;
	}
	function jOf(ymd) { var g = gArr(ymd); return g2j(g[0], g[1], g[2]); }
	function saturdayOf(ymd) { return addDays(ymd, -((toDate(ymd).getUTCDay() + 1) % 7)); }

	function openCal() {
		pick.from = parseJ($('nca-from').value) || state.from;
		pick.to = parseJ($('nca-to').value) || state.to;
		pick.step = 0;
		var j = jOf(pick.to || cfg.today);
		calView = [j[0], j[1]];
		renderCal();
		cal.hidden = false;
	}
	function closeCal() { if (cal) { cal.hidden = true; } }

	function renderCal() {
		var jy = calView[0], jm = calView[1];
		var today = cfg.today;
		var first = fromJ(jy, jm, 1);
		var lead = (toDate(first).getUTCDay() + 1) % 7;
		var n = jMonthDays(jy, jm);
		var html = '<div class="nca-cal-head">' +
			'<button type="button" class="nca-cal-nav" data-nav="-1" aria-label="ماه قبل">›</button>' +
			'<strong>' + MONTHS[jm - 1] + ' ' + faDigits(jy) + '</strong>' +
			'<button type="button" class="nca-cal-nav" data-nav="1" aria-label="ماه بعد">‹</button></div>' +
			'<div class="nca-cal-grid">' + WEEK.map(function (w) { return '<span class="nca-cal-w">' + w + '</span>'; }).join('');
		for (var b = 0; b < lead; b++) { html += '<span></span>'; }
		for (var d = 1; d <= n; d++) {
			var ymd = fromJ(jy, jm, d);
			var cls = ['nca-cal-day'];
			var to = pick.step === 1 ? '' : pick.to;
			if (ymd === pick.from) { cls.push('is-start'); }
			if (to && ymd === to) { cls.push('is-end'); }
			if (to && ymd > pick.from && ymd < to) { cls.push('is-in'); }
			if (ymd === today) { cls.push('is-today'); }
			html += '<button type="button" class="' + cls.join(' ') + '" data-ymd="' + ymd + '"' + (ymd > today ? ' disabled' : '') + '>' + faDigits(d) + '</button>';
		}
		html += '</div><p class="nca-cal-hint">' + (pick.step === 1 ? 'حالا روز پایان را انتخاب کنید.' : 'روز شروع و سپس روز پایان بازه را انتخاب کنید.') + '</p>' +
			'<div class="nca-cal-quick">' + [
				['week', 'این هفته'], ['this_month', 'این ماه'], ['last_month', 'ماه قبل'], ['last90', '۳ ماه اخیر'], ['this_year', 'امسال'], ['last_year', 'سال قبل']
			].map(function (q) { return '<button type="button" data-quick="' + q[0] + '">' + q[1] + '</button>'; }).join('') + '</div>';
		cal.innerHTML = html;
	}

	function applyPick(f, t) {
		$('nca-from').value = jText(f);
		$('nca-to').value = jText(t);
		$('nca-apply').click();
	}

	if (cal) {
		cal.addEventListener('click', function (e) {
			e.stopPropagation();
			var nav = e.target.closest('[data-nav]');
			if (nav) {
				var m = calView[1] + parseInt(nav.getAttribute('data-nav'), 10);
				calView = m < 1 ? [calView[0] - 1, 12] : (m > 12 ? [calView[0] + 1, 1] : [calView[0], m]);
				renderCal();
				return;
			}
			var quick = e.target.closest('[data-quick]');
			if (quick) {
				var key = quick.getAttribute('data-quick');
				var r = key === 'week' ? [saturdayOf(cfg.today), cfg.today] : presetRange(key);
				applyPick(r[0], r[1]);
				return;
			}
			var day = e.target.closest('[data-ymd]');
			if (!day || day.disabled) { return; }
			var ymd = day.getAttribute('data-ymd');
			if (pick.step === 0) {
				pick.from = ymd;
				pick.to = '';
				pick.step = 1;
				$('nca-from').value = jText(ymd);
				$('nca-to').value = '';
				renderCal();
				return;
			}
			var f = pick.from, t = ymd;
			if (t < f) { var tmp = f; f = t; t = tmp; }
			pick.step = 0;
			applyPick(f, t);
		});
		['nca-from', 'nca-to'].forEach(function (id) {
			$(id).addEventListener('focus', function () { if (cal.hidden) { openCal(); } });
			$(id).addEventListener('click', function (e) { e.stopPropagation(); if (cal.hidden) { openCal(); } });
		});
		document.addEventListener('click', function (e) {
			if (!cal.hidden && !e.target.closest('#nca-custom')) { closeCal(); }
		});
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeCal(); closeMenu(); } });
	}

	/* ---------------------------------------------------------- */
	/* Data                                                       */
	/* ---------------------------------------------------------- */

	var loadingTimer = null;
	var requestId = 0;
	function load() {
		// Only the newest request may render: a slow answer for an old range must not overwrite a newer one.
		var id = ++requestId;
		clearTimeout(loadingTimer);
		loadingTimer = setTimeout(function () { $('nca-loading').hidden = false; $('nca-app').classList.add('is-loading'); }, 250);
		var fd = new FormData();
		fd.append('action', 'nca_report');
		fd.append('nonce', cfg.nonce);
		fd.append('from', state.from);
		fd.append('to', state.to);
		fd.append('model', state.model);
		fd.append('group', state.group);
		fetch(cfg.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
			.then(function (r) { return r.json(); })
			.then(function (res) {
				if (id !== requestId) { return; }
				if (!res || !res.success) { throw new Error('bad'); }
				state.data = res.data;
				render();
				if (state.tab === 'behavior') { loadBehavior(false); }
			})
			.catch(function () {
				if (id !== requestId) { return; }
				$('nca-range').textContent = 'دریافت آمار انجام نشد. صفحه را تازه کنید؛ اگر دوباره تکرار شد، از خارج شدن نشست ورود مطمئن شوید.';
			})
			.then(function () {
				if (id !== requestId) { return; }
				clearTimeout(loadingTimer);
				$('nca-loading').hidden = true;
				$('nca-app').classList.remove('is-loading');
			});
	}

	function metricValue(c, metric) {
		if (metric === 'revenue') { return c.cur.net; }
		if (metric === 'orders') { return c.cur.orders; }
		return c.cur.leads;
	}
	function metricName(metric) {
		return metric === 'revenue' ? 'درآمد' : (metric === 'orders' ? 'سفارش‌ها' : 'لیدها');
	}
	function fmtMetric(v, metric, short) {
		if (metric === 'revenue') { return short ? compactMoney(v) : money(v); }
		return num(v);
	}

	function delta(cur, prev) {
		if (!prev && !cur) { return '<span class="nca-delta nca-delta--flat">بدون تغییر</span>'; }
		if (!prev) { return '<span class="nca-delta nca-delta--up">جدید</span>'; }
		var d = ((cur - prev) / prev) * 100;
		var cls = d > 0.5 ? 'up' : (d < -0.5 ? 'down' : 'flat');
		var sign = d > 0.5 ? '+' : (d < -0.5 ? '−' : '');
		return '<span class="nca-delta nca-delta--' + cls + '">' + sign + nf1.format(Math.abs(d)) + '٪</span>';
	}

	/* ---------------------------------------------------------- */
	/* Render                                                     */
	/* ---------------------------------------------------------- */

	var charts = {};
	var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

	function render() {
		var d = state.data;
		if (!d) { return; }
		var days = daysBetween(d.range.from, d.range.to);
		$('nca-range').textContent = 'از ' + d.range.from_fa + ' تا ' + d.range.to_fa + '، مقایسه با ' + faDigits(days) + ' روز قبل از آن. فروش به ' + (state.model === 'first' ? 'اولین ورود' : 'آخرین ورود') + ' مشتری نسبت داده شده است.';
		renderKpis(d);
		renderRibbon(d);
		renderInsights(d);
		renderTrend(d);
		renderTable(d);
		renderSources(d);
		renderProducts(d);
		renderCampaignTabs(d);
		renderGroups(d);
		renderKinds(d);
		renderForms(d);
		renderRecent(d);
	}

	var ICONS = {
		money: '<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
		cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
		avg: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
		users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
		star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'
	};
	function icon(name) {
		return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
	}

	function kpi(label, value, title, deltaHtml, sub, ic) {
		return '<div class="nca-kpi"><span class="nca-kpi-label">' + (ic ? '<span class="nca-kpi-icon">' + icon(ic) + '</span>' : '') + esc(label) + '</span>' +
			'<strong class="nca-kpi-value" title="' + esc(title || '') + '">' + value + '</strong>' +
			'<span class="nca-kpi-foot">' + (deltaHtml || '') + (sub ? '<span>' + sub + '</span>' : '') + '</span></div>';
	}

	function renderKpis(d) {
		var t = d.totals, p = d.prev_totals, html = '';
		if (hasWoo) {
			var aov = t.orders ? t.net / t.orders : 0;
			var paov = p.orders ? p.net / p.orders : 0;
			html += kpi('درآمد خالص', kpiMoney(t.net), money(t.net), delta(t.net, p.net), t.refunded ? 'بازگشتی ' + esc(compact(t.refunded)) : '', 'money');
			html += kpi('سفارش', num(t.orders), '', delta(t.orders, p.orders), '', 'cart');
			html += kpi('میانگین هر سفارش', kpiMoney(aov), money(aov), delta(aov, paov), '', 'avg');
		}
		html += kpi('لید', num(t.leads), '', delta(t.leads, p.leads), t.lead_confirmed ? num(t.lead_confirmed) + ' تایید شده' : '', 'users');
		html += kpi('فروش از لیدها', kpiMoney(t.lead_revenue), money(t.lead_revenue), delta(t.lead_revenue, p.lead_revenue), num(t.lead_sold) + ' لید منجر به خرید', 'star');
		$('nca-kpis').innerHTML = html;
	}

	function rankedChannels(d, metric) {
		return d.channels
			.map(function (c) { return { c: c, v: metricValue(c, metric) }; })
			.filter(function (x) { return x.v > 0; })
			.sort(function (a, b) { return b.v - a.v; });
	}

	function renderRibbon(d) {
		var metric = state.metric;
		$('nca-share-metric').textContent = metricName(metric);
		var ranked = rankedChannels(d, metric);
		var total = ranked.reduce(function (s, x) { return s + x.v; }, 0);
		var ribbon = $('nca-ribbon');
		var legend = $('nca-ribbon-legend');
		if (!total) {
			ribbon.innerHTML = '<div class="nca-ribbon-empty">در این بازه هنوز ' + esc(metricName(metric)) + ' ثبت نشده است. بازه طولانی‌تری انتخاب کنید یا اگر افزونه تازه نصب شده، سفارش‌های قبلی را از بخش تنظیمات وارد کنید.</div>';
			legend.innerHTML = '';
			$('nca-share-note').textContent = '';
			return;
		}
		var top = ranked.slice(0, 9);
		var rest = ranked.slice(9).reduce(function (s, x) { return s + x.v; }, 0);
		var segs = top.map(function (x) { return { label: x.c.label, color: x.c.color, v: x.v }; });
		if (rest > 0) { segs.push({ label: 'سایر کانال‌ها', color: '#cbd5e1', v: rest }); }

		ribbon.innerHTML = segs.map(function (s) {
			var w = pct(s.v, total);
			return '<div class="nca-seg-bar" style="flex-grow:' + w.toFixed(4) + ';background:' + esc(s.color) + '" title="' + esc(s.label + ': ' + nf1.format(w) + '٪') + '">' +
				(w >= 9 ? '<span>' + esc(s.label) + '<b>' + nf1.format(w) + '٪</b></span>' : '') + '</div>';
		}).join('');
		legend.innerHTML = segs.map(function (s) {
			return '<li><i style="background:' + esc(s.color) + '"></i><span class="nca-l-name">' + esc(s.label) + '</span><span class="nca-l-val">' + esc(fmtMetric(s.v, metric, true)) + '</span><span class="nca-l-pct">' + nf1.format(pct(s.v, total)) + '٪</span></li>';
		}).join('');
		var lead = segs[0];
		$('nca-share-note').textContent = lead.label + ' با ' + nf1.format(pct(lead.v, total)) + ' درصد بیشترین سهم را دارد.';
	}

	function baseChartOptions() {
		return {
			responsive: true,
			maintainAspectRatio: false,
			animation: reduceMotion ? false : { duration: 350 },
			locale: 'fa-IR',
			plugins: {
				legend: { rtl: true, textDirection: 'rtl', position: 'bottom', labels: { font: { family: FONT, size: 12 }, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', color: '#475569', padding: 14 } },
				tooltip: { rtl: true, textDirection: 'rtl', bodyFont: { family: FONT }, titleFont: { family: FONT, weight: '700' }, footerFont: { family: FONT }, padding: 12, cornerRadius: 10, boxPadding: 4, backgroundColor: 'rgba(15, 23, 42, 0.94)', borderColor: 'rgba(148, 163, 184, 0.25)', borderWidth: 1 }
			}
		};
	}

	function renderTrend(d) {
		var metric = state.metric;
		var ranked = rankedChannels(d, metric);
		var top = ranked.slice(0, 7).map(function (x) { return x.c; });
		var topKeys = top.map(function (c) { return c.key; });
		var n = d.labels.length;
		var datasets = top.map(function (c) {
			var s = d.series[c.key];
			return { label: c.label, data: s ? s[metric] : new Array(n).fill(0), backgroundColor: c.color, borderRadius: 4, borderSkipped: false, maxBarThickness: 42 };
		});
		var others = new Array(n).fill(0);
		var hasOthers = false;
		Object.keys(d.series).forEach(function (key) {
			if (topKeys.indexOf(key) !== -1) { return; }
			d.series[key][metric].forEach(function (v, i) { if (v) { others[i] += v; hasOthers = true; } });
		});
		if (hasOthers) { datasets.push({ label: 'سایر کانال‌ها', data: others, backgroundColor: '#cbd5e1', borderRadius: 4, borderSkipped: false, maxBarThickness: 42 }); }

		var opts = baseChartOptions();
		opts.interaction = { mode: 'index', intersect: false };
		opts.scales = {
			x: { stacked: true, reverse: true, grid: { display: false }, border: { display: false }, ticks: { font: { family: FONT, size: 11 }, color: '#64748b', maxRotation: 0, autoSkipPadding: 12 } },
			y: { stacked: true, position: 'right', beginAtZero: true, border: { display: false }, grid: { color: '#eef2f7' }, ticks: { font: { family: FONT, size: 11 }, color: '#64748b', callback: function (v) { return metric === 'revenue' ? compact(v) : num(v); }, precision: 0 } }
		};
		opts.plugins.tooltip.callbacks = {
			label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + fmtMetric(ctx.parsed.y, metric, false); },
			footer: function (items) {
				var sum = items.reduce(function (s, it) { return s + (it.parsed.y || 0); }, 0);
				return 'جمع: ' + fmtMetric(sum, metric, false);
			}
		};
		opts.plugins.tooltip.filter = function (it) { return it.parsed.y > 0; };

		if (charts.trend) { charts.trend.destroy(); }
		charts.trend = new window.Chart($('nca-trend'), { type: 'bar', data: { labels: d.labels, datasets: datasets }, options: opts });
	}

	function renderGroups(d) {
		var metric = state.metric;
		var key = metric === 'revenue' ? 'net' : metric;
		var groups = d.groups.filter(function (g) { return g[key] > 0; }).sort(function (a, b) { return b[key] - a[key]; });
		var palette = { paid: '#f11158', search: '#34a853', ai: '#10a37f', compare: '#d62828', social: '#e1306c', messenger: '#229ed9', direct_mkt: '#b08968', campaign: '#adb5bd', referral: '#005b8f', direct: '#1e293b', custom: '#2a9d8f', other: '#ced4da' };
		var opts = baseChartOptions();
		opts.cutout = '68%';
		opts.plugins.legend.position = 'right';
		opts.plugins.tooltip.callbacks = {
			label: function (ctx) {
				var total = ctx.dataset.data.reduce(function (s, v) { return s + v; }, 0);
				return ' ' + ctx.label + ': ' + fmtMetric(ctx.parsed, metric, false) + ' (' + nf1.format(pct(ctx.parsed, total)) + '٪)';
			}
		};
		if (charts.groups) { charts.groups.destroy(); charts.groups = null; }
		$('nca-groups').hidden = !groups.length;
		$('nca-groups-empty').hidden = !!groups.length;
		if (!groups.length) { return; }
		charts.groups = new window.Chart($('nca-groups'), {
			type: 'doughnut',
			data: {
				labels: groups.map(function (g) { return g.label; }),
				datasets: [{ data: groups.map(function (g) { return g[key]; }), backgroundColor: groups.map(function (g) { return palette[g.key] || '#999'; }), borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }]
			},
			options: opts
		});
	}

	function renderTable(d) {
		var rows = d.channels.slice();
		var sortKey = hasWoo ? 'net' : 'leads';
		rows.sort(function (a, b) { return (b.cur[sortKey] - a.cur[sortKey]) || (b.cur.leads - a.cur.leads); });
		var totalNet = d.totals.net || 0;
		var totalLeads = d.totals.leads || 0;
		var head = '<thead><tr><th scope="col">کانال</th>';
		if (hasWoo) {
			head += '<th scope="col">سفارش</th><th scope="col">درآمد خالص</th><th scope="col" class="nca-col-share">سهم از درآمد</th><th scope="col">میانگین سفارش</th><th scope="col">تغییر درآمد</th>';
		}
		head += '<th scope="col">لید</th>' + (hasWoo ? '' : '<th scope="col" class="nca-col-share">سهم از لیدها</th>') + '<th scope="col">لید منجر به فروش</th><th scope="col">فروش از لید</th>' + (hasWoo ? '' : '<th scope="col">تغییر لید</th>') + '</tr></thead>';

		if (!rows.length) {
			$('nca-channels').innerHTML = head + '<tbody><tr><td colspan="10" class="nca-empty">برای این بازه داده‌ای وجود ندارد.</td></tr></tbody>';
			return;
		}
		var cols = hasWoo ? 9 : 6;
		var body = rows.map(function (c) {
			var cur = c.cur;
			var share = hasWoo ? pct(cur.net, totalNet) : pct(cur.leads, totalLeads);
			var det = c.details || { rows: [], count: 0 };
			var named = det.rows.filter(function (r) { return r.detail || r.campaign; });
			var open = !!state.open[c.key];
			var hint = (CH[c.key] && CH[c.key].hint) || '';
			var peek = '';
			if (CATCH_ALL.indexOf(c.key) !== -1 && named.length) {
				peek = '<small class="nca-peek">' + named.slice(0, 3).map(function (r) { return esc(r.detail || r.campaign); }).join('، ') + (named.length > 3 ? '، ...' : '') + '</small>';
			}
			var tr = '<tr class="nca-ch-row' + (open ? ' is-open' : '') + '"><th scope="row">' +
				(named.length ? '<button type="button" class="nca-expand" data-ch="' + esc(c.key) + '" aria-expanded="' + open + '" title="نمایش منابع دقیق">' : '<span class="nca-expand nca-expand--none">') +
				'<span class="nca-chip"><i style="background:' + esc(c.color) + '"></i>' + esc(c.label) + '</span>' +
				(named.length ? '<span class="nca-expand-count">' + num(det.count) + ' منبع</span>' : '') +
				(named.length ? '</button>' : '</span>') +
				'<small class="nca-muted">' + esc(GROUPS[c.group] || '') + '</small>' + peek +
				(hint ? '<small class="nca-hint-text">' + esc(hint) + '</small>' : '') + '</th>';
			if (hasWoo) {
				tr += '<td>' + num(cur.orders) + '</td>' +
					'<td class="nca-strong">' + esc(money(cur.net)) + '</td>' +
					'<td class="nca-col-share"><span class="nca-bar"><span style="width:' + share.toFixed(2) + '%;background:' + esc(c.color) + '"></span></span><span class="nca-bar-val">' + nf1.format(share) + '٪</span></td>' +
					'<td>' + esc(cur.orders ? money(cur.net / cur.orders) : '-') + '</td>' +
					'<td>' + delta(cur.net, c.prev.net) + '</td>';
			}
			tr += '<td>' + num(cur.leads) + '</td>';
			if (!hasWoo) {
				tr += '<td class="nca-col-share"><span class="nca-bar"><span style="width:' + share.toFixed(2) + '%;background:' + esc(c.color) + '"></span></span><span class="nca-bar-val">' + nf1.format(share) + '٪</span></td>';
			}
			tr += '<td>' + (cur.leads ? num(cur.lead_sold) + ' <small class="nca-muted">(' + nf1.format(pct(cur.lead_sold, cur.leads)) + '٪)</small>' : '-') + '</td>';
			tr += '<td>' + (cur.lead_revenue ? esc(money(cur.lead_revenue)) : '-') + '</td>';
			if (!hasWoo) { tr += '<td>' + delta(cur.leads, c.prev.leads) + '</td>'; }
			tr += '</tr>';
			if (named.length) {
				tr += '<tr class="nca-detail-row"' + (open ? '' : ' hidden') + ' data-for="' + esc(c.key) + '"><td colspan="' + cols + '">' + detailTable(c, det) + '</td></tr>';
			}
			return tr;
		}).join('');

		var t = d.totals;
		var foot = '<tfoot><tr><th scope="row">جمع</th>';
		if (hasWoo) {
			foot += '<td>' + num(t.orders) + '</td><td class="nca-strong">' + esc(money(t.net)) + '</td><td></td><td>' + esc(t.orders ? money(t.net / t.orders) : '-') + '</td><td>' + delta(t.net, d.prev_totals.net) + '</td>';
		}
		foot += '<td>' + num(t.leads) + '</td>' + (hasWoo ? '' : '<td></td>') + '<td>' + num(t.lead_sold) + '</td><td>' + esc(money(t.lead_revenue)) + '</td>' + (hasWoo ? '' : '<td>' + delta(t.leads, d.prev_totals.leads) + '</td>') + '</tr></tfoot>';
		$('nca-channels').innerHTML = head + '<tbody>' + body + '</tbody>' + foot;
	}

	var CATCH_ALL = ['referral', 'other_paid', 'utm_other'];

	function isHost(s) { return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(String(s || '')); }
	function sourceName(r, channel) {
		var name = r.detail || '';
		if (!name) { return '<span class="nca-muted">بدون جزئیات</span>'; }
		if (channel === 'referral' && isHost(name)) {
			return '<a href="https://' + esc(name) + '" target="_blank" rel="noopener noreferrer nofollow" dir="ltr">' + esc(name) + '</a>';
		}
		return '<span dir="auto">' + esc(name) + '</span>';
	}

	// Ad clicks use the campaign as their detail: do not print it twice.
	function campaignCell(r) {
		return r.campaign && r.campaign !== r.detail ? '<span dir="auto">' + esc(r.campaign) + '</span>' : '<span class="nca-muted">-</span>';
	}

	function detailTable(c, det) {
		var total = c.cur.net || 0;
		var html = '<div class="nca-details"><table><thead><tr><th>منبع دقیق</th><th>کمپین</th>' + (hasWoo ? '<th>سفارش</th><th>درآمد خالص</th><th>سهم در این کانال</th>' : '') + '<th>لید</th></tr></thead><tbody>' +
			det.rows.map(function (r) {
				return '<tr><td>' + sourceName(r, c.key) + '</td><td>' + campaignCell(r) + '</td>' +
					(hasWoo ? '<td>' + num(r.orders) + '</td><td>' + esc(r.net ? money(r.net) : '-') + '</td><td>' + (total > 0 && r.net ? nf1.format(pct(r.net, total)) + '٪' : '-') + '</td>' : '') +
					'<td>' + num(r.leads) + '</td></tr>';
			}).join('') + '</tbody></table>';
		if (det.count > det.rows.length) {
			html += '<p class="nca-muted">' + num(det.rows.length) + ' منبع مهم‌تر از ' + num(det.count) + ' منبع نمایش داده شده است.</p>';
		}
		return html + '</div>';
	}

	$('nca-channels').addEventListener('click', function (e) {
		var b = e.target.closest('.nca-expand[data-ch]');
		if (!b) { return; }
		var key = b.getAttribute('data-ch');
		state.open[key] = !state.open[key];
		b.setAttribute('aria-expanded', state.open[key] ? 'true' : 'false');
		b.closest('tr').classList.toggle('is-open', !!state.open[key]);
		var row = $('nca-channels').querySelector('tr[data-for="' + key.replace(/[^a-z0-9_-]/gi, '') + '"]');
		if (row) { row.hidden = !state.open[key]; }
	});

	/* Exact sources (sites, apps, campaigns) across all channels. */
	function sourceGroup(s) {
		var g = (CH[s.channel] && CH[s.channel].group) || '';
		return { referral: s.channel === 'referral', paid: g === 'paid', social: g === 'social' || g === 'messenger', campaign: !!s.campaign || s.channel === 'utm_other' || g === 'direct_mkt' };
	}
	function renderSources(d) {
		var list = (d.sources || []).filter(function (s) {
			return state.srcFilter === 'all' || sourceGroup(s)[state.srcFilter];
		}).slice(0, 20);
		var totalNet = d.totals.net || 0;
		var head = '<thead><tr><th>#</th><th>منبع دقیق</th><th>کانال</th><th>کمپین</th>' + (hasWoo ? '<th>سفارش</th><th>درآمد خالص</th><th>سهم از کل درآمد</th>' : '') + '<th>لید</th></tr></thead>';
		if (!list.length) {
			$('nca-sources').innerHTML = head + '<tbody><tr><td colspan="8" class="nca-empty">برای این بخش در این بازه منبعی ثبت نشده است.</td></tr></tbody>';
			return;
		}
		$('nca-sources').innerHTML = head + '<tbody>' + list.map(function (s, i) {
			var c = CH[s.channel] || { label: s.channel, color: '#999' };
			return '<tr><td class="nca-rank-no">' + num(i + 1) + '</td><td class="nca-strong">' + sourceName(s, s.channel) + '</td>' +
				'<td><span class="nca-chip"><i style="background:' + esc(c.color) + '"></i>' + esc(c.label) + '</span></td>' +
				'<td>' + campaignCell(s) + '</td>' +
				(hasWoo ? '<td>' + num(s.orders) + '</td><td>' + esc(s.net ? money(s.net) : '-') + '</td><td>' + (totalNet > 0 && s.net ? nf1.format(pct(s.net, totalNet)) + '٪' : '-') + '</td>' : '') +
				'<td>' + num(s.leads) + '</td></tr>';
		}).join('') + '</tbody>';
	}
	(function () {
		var el = $('nca-src-filter');
		if (!el) { return; }
		el.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-v]');
			if (!b) { return; }
			state.srcFilter = b.getAttribute('data-v');
			setSeg('nca-src-filter', state.srcFilter);
			if (state.data) { renderSources(state.data); }
		});
	})();

	/* Products: best sellers and products without sales. */
	var STOCK = { instock: 'موجود', outofstock: 'ناموجود', onbackorder: 'پیش خرید' };
	function thumb(p) {
		return p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy" width="44" height="44">' : '<span class="nca-thumb-ph" aria-hidden="true">' + esc(String(p.name || '?').charAt(0)) + '</span>';
	}
	function productName(p) {
		var name = esc(p.name);
		var main = p.edit ? '<a href="' + esc(p.edit) + '">' + name + '</a>' : name;
		return '<span class="nca-prod-name">' + main + (p.deleted ? ' <small class="nca-badge nca-badge--muted">حذف شده</small>' : '') + '</span>' +
			'<span class="nca-prod-sub">' + (p.sku ? '<span dir="ltr">SKU: ' + esc(p.sku) + '</span>' : '') + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">مشاهده در سایت</a>' : '') + '</span>';
	}
	function renderProducts(d) {
		var pr = d.products;
		if (!pr || !$('nca-top-products')) { return; }
		var top = state.topSort === 'revenue' ? pr.top_revenue : pr.top_qty;
		if (!top.length) {
			$('nca-top-products').innerHTML = '<p class="nca-empty">در این بازه فروشی ثبت نشده است.</p>';
		} else {
			$('nca-top-products').innerHTML = '<ol class="nca-products">' + top.map(function (p, i) {
				var conv = p.views ? nf1.format(Math.min(100, pct(p.orders, p.views))) + '٪' : '';
				var chs = (p.channels || []).slice(0, 2).map(function (x) {
					var c = CH[x.key] || { label: x.key, color: '#999' };
					return '<span class="nca-chip nca-chip--sm"><i style="background:' + esc(c.color) + '"></i>' + esc(c.label) + ' ' + nf1.format(x.share) + '٪</span>';
				}).join('');
				return '<li><span class="nca-rank-badge' + (i < 3 ? ' nca-rank-badge--top' : '') + '">' + num(i + 1) + '</span>' +
					'<span class="nca-thumb">' + thumb(p) + '</span>' +
					'<div class="nca-prod-main">' + productName(p) + (chs ? '<span class="nca-prod-chs">' + chs + '</span>' : '') + '</div>' +
					'<div class="nca-prod-stats"><strong>' + num(p.qty) + ' <small>عدد</small></strong><span>' + esc(money(p.revenue)) + '</span>' +
					'<small class="nca-muted">' + num(p.orders) + ' سفارش' + (cfg.viewsOn ? ' | ' + num(p.views) + ' بازدید' + (conv ? ' | تبدیل ' + conv : '') : '') + '</small></div></li>';
			}).join('') + '</ol>';
		}

		var note = num(pr.unsold) + ' محصول از ' + num(pr.published) + ' محصول منتشر شده در این بازه هیچ فروشی نداشته‌اند؛ این‌ها کمترین بازدید را داشته‌اند.';
		if (!parseInt(pr.views_on, 10)) {
			note += ' شمارش بازدید محصولات در تنظیمات خاموش است.';
		} else if (parseInt(pr.views_partial, 10)) {
			note += ' بازدید محصولات از ' + pr.views_since_fa + ' شمرده می‌شود؛ بازدیدهای قبل از آن ثبت نشده است.';
		}
		$('nca-worst-note').textContent = note;
		if (!pr.worst.length) {
			$('nca-worst-products').innerHTML = '<p class="nca-empty">همه محصولات منتشر شده در این بازه حداقل یک فروش داشته‌اند.</p>';
			return;
		}
		$('nca-worst-products').innerHTML = '<ol class="nca-products nca-products--worst">' + pr.worst.map(function (p, i) {
			var views = p.views ? '<span class="nca-pill-stat">' + num(p.views) + ' بازدید</span>' : '<span class="nca-pill-stat nca-pill-stat--bad">بدون بازدید</span>';
			var stock = STOCK[p.stock] || '';
			return '<li><span class="nca-rank-badge nca-rank-badge--bad">' + num(i + 1) + '</span>' +
				'<span class="nca-thumb">' + thumb(p) + '</span>' +
				'<div class="nca-prod-main">' + productName(p) + '<span class="nca-prod-chs"><small class="nca-muted">انتشار ' + esc(p.created) + '</small>' +
				(stock ? '<small class="nca-stock nca-stock--' + esc(p.stock) + '">' + esc(stock) + '</small>' : '') + '</span></div>' +
				'<div class="nca-prod-stats">' + views + '<small class="nca-muted">فروش کل: ' + num(p.total_sales) + '</small></div></li>';
		}).join('') + '</ol>';
	}
	(function () {
		var el = $('nca-top-sort');
		if (!el) { return; }
		el.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-v]');
			if (!b) { return; }
			state.topSort = b.getAttribute('data-v');
			setSeg('nca-top-sort', state.topSort);
			if (state.data) { renderProducts(state.data); }
		});
	})();

	/* Plain-language analysis of the range. */
	function chName(key) { return (CH[key] && CH[key].label) || key; }
	function renderInsights(d) {
		var t = d.totals, p = d.prev_totals, out = [];
		var chans = d.channels;
		function add(type, html) { out.push('<li class="nca-insight nca-insight--' + type + '"><i aria-hidden="true"></i><span>' + html + '</span></li>'); }
		function b(s) { return '<strong>' + esc(s) + '</strong>'; }
		function chg(cur, prev) { return prev ? ((cur - prev) / prev) * 100 : null; }

		if (hasWoo) {
			var c1 = chg(t.net, p.net);
			if (t.net > 0) {
				add(c1 === null || c1 >= 0 ? 'good' : 'bad', 'درآمد خالص این بازه ' + b(money(t.net)) + ' از ' + b(num(t.orders)) + ' سفارش' +
					(c1 === null ? ' است.' : '؛ ' + (c1 >= 0 ? 'رشد ' : 'افت ') + b(nf1.format(Math.abs(c1)) + '٪') + ' نسبت به دوره قبل.'));
				var best = chans.slice().sort(function (a, b2) { return b2.cur.net - a.cur.net; })[0];
				if (best && best.cur.net > 0) {
					add('info', 'بیشترین درآمد از ' + b(best.label) + ' با ' + b(nf1.format(pct(best.cur.net, t.net)) + '٪') + ' سهم و ' + num(best.cur.orders) + ' سفارش بوده است.');
				}
				var growth = chans.filter(function (c) { return c.prev.net > 0 && c.cur.net >= t.net * 0.03; })
					.map(function (c) { return { c: c, g: chg(c.cur.net, c.prev.net) }; })
					.sort(function (a, b2) { return b2.g - a.g; });
				if (growth.length && growth[0].g > 10) {
					add('good', 'سریع‌ترین رشد: ' + b(growth[0].c.label) + ' با ' + b('+' + nf1.format(growth[0].g) + '٪') + ' درآمد نسبت به دوره قبل.');
				}
				var drops = chans.filter(function (c) { return c.prev.net >= t.net * 0.05; })
					.map(function (c) { return { c: c, g: chg(c.cur.net, c.prev.net) }; })
					.sort(function (a, b2) { return a.g - b2.g; });
				if (drops.length && drops[0].g < -15) {
					add('bad', 'بیشترین افت: ' + b(drops[0].c.label) + ' با ' + b(nf1.format(Math.abs(drops[0].g)) + '٪') + ' کاهش درآمد؛ ارزش بررسی دارد.');
				}
				var aov = chans.filter(function (c) { return c.cur.orders >= 3; }).sort(function (a, b2) { return (b2.cur.net / b2.cur.orders) - (a.cur.net / a.cur.orders); })[0];
				if (aov) {
					add('info', 'گران‌ترین سبد خرید را مشتریان ' + b(aov.label) + ' دارند: میانگین ' + b(money(aov.cur.net / aov.cur.orders)) + ' برای هر سفارش.');
				}
				var blind = chans.filter(function (c) { return c.key === 'direct' || c.key === 'unknown'; }).reduce(function (s, c) { return s + c.cur.orders; }, 0);
				if (t.orders >= 5 && blind / t.orders > 0.35) {
					add('warn', b(nf1.format(pct(blind, t.orders)) + '٪') + ' سفارش‌ها «ورود مستقیم» یا «نامشخص» هستند. برای لینک‌های اینستاگرام، تلگرام و پیامک از «ساخت لینک UTM» استفاده کنید تا منبع دقیق ثبت شود.');
				}
			} else {
				add('warn', 'در این بازه فروش شمرده شده‌ای ثبت نشده است. وضعیت سفارش‌های قابل احتساب را در تنظیمات بررسی کنید.');
			}
		}
		var newCh = chans.filter(function (c) { return !c.prev.net && !c.prev.leads && !c.prev.orders && (c.cur.net > 0 || c.cur.leads > 0); });
		if (newCh.length) {
			add('good', 'کانال‌های تازه در این بازه: ' + newCh.slice(0, 4).map(function (c) { return b(c.label); }).join('، ') + '.');
		}
		var ref = (d.sources || []).filter(function (s) { return s.channel === 'referral'; })[0];
		if (ref) {
			add('info', 'بیشترین ارجاع از سایت ' + b(ref.detail) + ' بوده است' + (hasWoo && ref.orders ? ' (' + num(ref.orders) + ' سفارش، ' + esc(money(ref.net)) + ')' : '') + '.');
		}
		var paid = chans.filter(function (c) { return c.key === 'other_paid'; })[0];
		if (paid && paid.details && paid.details.rows.length) {
			var top1 = paid.details.rows[0];
			add('info', 'در «سایر تبلیغات پولی» بیشترین سهم با ' + b(top1.detail || top1.campaign || '-') + (top1.campaign && top1.detail ? ' (کمپین ' + esc(top1.campaign) + ')' : '') + ' است.');
		}
		var ai = chans.filter(function (c) { return c.group === 'ai'; });
		var aiNet = ai.reduce(function (s, c) { return s + c.cur.net; }, 0), aiLeads = ai.reduce(function (s, c) { return s + c.cur.leads; }, 0);
		if (aiNet > 0 || aiLeads > 0) {
			add('info', 'هوش مصنوعی (ChatGPT، Gemini و ...) ' + (hasWoo && aiNet > 0 ? b(nf1.format(pct(aiNet, t.net)) + '٪') + ' درآمد' : '') + (aiLeads ? (aiNet > 0 && hasWoo ? ' و ' : '') + b(num(aiLeads)) + ' لید' : '') + ' آورده است.');
		}
		if (t.leads > 0) {
			var lb = chans.slice().sort(function (a, b2) { return b2.cur.leads - a.cur.leads; })[0];
			add('info', b(num(t.leads)) + ' لید ثبت شده؛ بیشترین از ' + b(lb.label) + ' (' + nf1.format(pct(lb.cur.leads, t.leads)) + '٪). ' +
				(t.lead_sold ? num(t.lead_sold) + ' لید به خرید رسیده است (' + nf1.format(pct(t.lead_sold, t.leads)) + '٪).' : 'وضعیت لیدها را در صفحه «لیدها» به‌روز کنید تا نرخ تبدیل لید هم حساب شود.'));
		}
		if (d.products) {
			var tp = d.products.top_qty[0];
			if (tp) { add('good', 'پرفروش‌ترین محصول: ' + b(tp.name) + ' با ' + b(num(tp.qty)) + ' فروش.'); }
			if (d.products.published && d.products.unsold) {
				add(d.products.unsold / d.products.published > 0.5 ? 'warn' : 'info', b(num(d.products.unsold)) + ' محصول از ' + num(d.products.published) + ' محصول در این بازه هیچ فروشی نداشته‌اند.');
			}
		}
		$('nca-insights-range').textContent = 'از ' + d.range.from_fa + ' تا ' + d.range.to_fa;
		$('nca-insights').innerHTML = out.length ? out.join('') : '<li class="nca-empty">برای تحلیل، داده کافی در این بازه نیست.</li>';
	}

	function renderKinds(d) {
		var totals = d.totals.lead_kinds || {};
		var keys = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
		if (!keys.length) {
			$('nca-kinds').innerHTML = '<p class="nca-empty">در این بازه لیدی ثبت نشده است. کلیک روی شماره تماس، واتساپ، بله و ارسال فرم‌ها خودکار ثبت می‌شوند.</p>';
			return;
		}
		var max = totals[keys[0]];
		$('nca-kinds').innerHTML = '<ul class="nca-rank">' + keys.map(function (k) {
			var sources = d.channels
				.filter(function (c) { return c.cur.lead_kinds && c.cur.lead_kinds[k]; })
				.sort(function (a, b) { return b.cur.lead_kinds[k] - a.cur.lead_kinds[k]; })
				.slice(0, 3)
				.map(function (c) { return esc(c.label) + ' ' + num(c.cur.lead_kinds[k]); });
			return '<li><div class="nca-rank-top"><span>' + esc(KINDS[k] || k) + '</span><strong>' + num(totals[k]) + '</strong></div>' +
				'<span class="nca-bar nca-bar--full"><span style="width:' + pct(totals[k], max).toFixed(2) + '%"></span></span>' +
				(sources.length ? '<small class="nca-muted">بیشتر از: ' + sources.join('، ') + '</small>' : '') + '</li>';
		}).join('') + '</ul>';
	}

	function renderForms(d) {
		if (!d.forms || !d.forms.length) {
			$('nca-forms').innerHTML = '<p class="nca-empty">فرمی در این بازه ارسال نشده است. فرم‌های Contact Form 7، المنتور پرو، Gravity Forms و WPForms خودکار شمرده می‌شوند.</p>';
			return;
		}
		var max = +d.forms[0].n;
		$('nca-forms').innerHTML = '<ul class="nca-rank">' + d.forms.map(function (f) {
			return '<li><div class="nca-rank-top"><span>' + esc(f.label || 'بدون نام') + '</span><strong>' + num(+f.n) + '</strong></div><span class="nca-bar nca-bar--full"><span style="width:' + pct(+f.n, max).toFixed(2) + '%"></span></span></li>';
		}).join('') + '</ul>';
	}

	function renderRecent(d) {
		if (!d.recent.length) {
			$('nca-recent').innerHTML = '<p class="nca-empty">هنوز موردی ثبت نشده است.</p>';
			return;
		}
		$('nca-recent').innerHTML = '<ul class="nca-feed">' + d.recent.map(function (r) {
			var c = CH[r.channel] || { label: r.channel, color: '#999' };
			var amount = r.type === 'order' ? money(r.amount) : (r.amount ? money(r.amount) : '');
			return '<li><a href="' + esc(r.url) + '">' +
				'<span class="nca-feed-main"><span class="nca-feed-kind nca-feed-kind--' + esc(r.type) + '">' + esc(r.kind) + '</span> ' + esc(r.label) + '</span>' +
				'<span class="nca-chip"><i style="background:' + esc(c.color) + '"></i>' + esc(c.label) + '</span>' +
				'<span class="nca-feed-meta">' + esc(r.date) + ' | ' + esc(r.status) + (amount ? ' | ' + esc(amount) : '') + '</span>' +
				'</a></li>';
		}).join('') + '</ul>';
	}

	/* ---------------------------------------------------------- */
	/* Tabs                                                       */
	/* ---------------------------------------------------------- */

	var TABS = ['overview', 'behavior', 'yektanet', 'sms', 'campaigns'];
	function showTab(tab) {
		if (TABS.indexOf(tab) === -1) { tab = 'overview'; }
		state.tab = tab;
		document.querySelectorAll('#nca-tabs [data-tab]').forEach(function (b) {
			b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false');
		});
		document.querySelectorAll('.nca-tab-panel').forEach(function (p) {
			p.hidden = p.getAttribute('data-tab') !== tab;
		});
		persist();
		// Charts measure their box on draw: redraw the ones that just became visible.
		if (state.data) {
			if (tab === 'overview') {
				Object.keys(charts).forEach(function (k) { if (charts[k] && k !== 'yk' && k !== 'bh') { charts[k].resize(); } });
			} else if (tab === 'behavior') {
				loadBehavior(false);
			} else {
				renderCampaignTabs(state.data);
			}
		}
	}
	(function () {
		var nav = $('nca-tabs');
		if (!nav) { return; }
		nav.addEventListener('click', function (e) {
			var b = e.target.closest('[data-tab]');
			if (b) { showTab(b.getAttribute('data-tab')); }
		});
		nav.addEventListener('keydown', function (e) {
			if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
			var i = TABS.indexOf(state.tab);
			// RTL: the left arrow moves forward.
			i = (i + (e.key === 'ArrowLeft' ? 1 : -1) + TABS.length) % TABS.length;
			showTab(TABS[i]);
			var next = nav.querySelector('[data-tab="' + TABS[i] + '"]');
			if (next) { next.focus(); }
		});
		showTab(state.tab);
	})();

	/* ---------------------------------------------------------- */
	/* Behaviour: sessions, users, engagement, funnel             */
	/* ---------------------------------------------------------- */

	var bh = { key: '', data: null, req: 0 };
	var DEVICES = { mobile: 'موبایل', desktop: 'دسکتاپ', tablet: 'تبلت' };
	var BROWSERS = { other: 'سایر', Instagram: 'مرورگر داخلی اینستاگرام', Facebook: 'مرورگر داخلی فیسبوک', Telegram: 'مرورگر داخلی تلگرام', Samsung: 'Samsung Internet' };
	// Saturday first (MySQL / PHP weekday: 0 = Sunday).
	var WEEKDAYS = [[6, 'شنبه'], [0, 'یکشنبه'], [1, 'دوشنبه'], [2, 'سه شنبه'], [3, 'چهارشنبه'], [4, 'پنجشنبه'], [5, 'جمعه']];

	function secs(s) {
		s = Math.round(s || 0);
		if (s < 60) { return num(s) + ' ثانیه'; }
		var m = Math.floor(s / 60), r = s % 60;
		return num(m) + ' دقیقه' + (r ? ' و ' + num(r) + ' ثانیه' : '');
	}
	// Short form for the KPI cards (long Persian durations do not fit).
	function secsShort(s) {
		s = Math.round(s || 0);
		return s < 60 ? num(s) + ' ثانیه' : nf1.format(s / 60) + ' دقیقه';
	}
	function rate(part, whole) { return whole ? pctText(pct(part, whole)) : '-'; }
	function chLabel(key) { return key ? chName(key) : 'نامشخص'; }
	function pathCell(home, path) {
		if (!path) { return '<span class="nca-muted">(نامشخص)</span>'; }
		return '<a class="nca-path" href="' + esc(String(home || '').replace(/\/$/, '') + path) + '" target="_blank" rel="noopener noreferrer" dir="auto">' + esc(path) + '</a>';
	}

	function loadBehavior(force) {
		var key = state.from + '|' + state.to + '|' + state.group;
		if (!force && bh.key === key && bh.data) { renderBehavior(bh.data); return; }
		var id = ++bh.req;
		var fd = new FormData();
		fd.append('action', 'nca_behavior');
		fd.append('nonce', cfg.nonce);
		fd.append('from', state.from);
		fd.append('to', state.to);
		fd.append('group', state.group);
		$('nca-bh-kpis').classList.add('is-loading');
		fetch(cfg.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
			.then(function (r) { return r.json(); })
			.then(function (res) {
				if (id !== bh.req) { return; }
				if (!res || !res.success) { throw new Error('bad'); }
				bh.key = key;
				bh.data = res.data;
				renderBehavior(res.data);
			})
			.catch(function () {
				if (id !== bh.req) { return; }
				var n = $('nca-bh-note');
				n.hidden = false;
				n.textContent = 'دریافت آمار رفتار کاربران انجام نشد. صفحه را تازه کنید.';
			})
			.then(function () { if (id === bh.req) { $('nca-bh-kpis').classList.remove('is-loading'); } });
	}

	function renderBehavior(b) {
		var t = b.totals, p = b.prev;
		function k(label, value, cur, prev, sub, tone) {
			return miniKpi(label, value, (prev !== null ? delta(cur, prev) + ' ' : '') + (sub || ''), tone);
		}
		var html = k('جلسه (بازدید)', num(t.sessions), t.sessions, p.sessions, '', 'accent') +
			k('کاربر', num(t.users), t.users, p.users, num(t.new_users) + ' کاربر جدید') +
			k('بازدید صفحه', num(t.pageviews), t.pageviews, p.pageviews, nf1.format(t.pages_per) + ' صفحه در هر جلسه') +
			k('نرخ تعامل', pctText(t.engagement), t.engagement, p.engagement, 'نرخ پرش ' + pctText(t.bounce)) +
			k('میانگین زمان تعامل', secsShort(t.avg_time), t.avg_time, p.avg_time, secs(t.avg_time) + ' در هر جلسه');
		if (hasWoo) {
			html += k('نرخ تبدیل', pctText(t.conversion), t.conversion, p.conversion, num(t.buyers) + ' جلسه به خرید رسید', t.conversion >= (p.conversion || 0) ? 'good' : 'bad') +
				k('ارزش هر جلسه', kpiMoney(t.value_per), t.value_per, p.value_per, 'درآمد خالص ÷ جلسه');
		}
		html += k('جلسه با لید', num(t.lead_sessions), t.lead_sessions, p.lead_sessions, num(t.leads) + ' لید');
		$('nca-bh-kpis').innerHTML = html;

		var notes = [];
		if (!parseInt(b.enabled, 10)) { notes.push('تحلیل رفتار بازدیدکنندگان در تنظیمات خاموش است؛ برای جمع آوری آمار جدید روشنش کنید.'); }
		if (parseInt(b.partial, 10) && b.since) { notes.push('آمار رفتار از ' + b.since + ' جمع آوری می‌شود؛ روزهای قبل از آن در این بخش خالی اند (فروش و لید در زبانه «نمای کلی» کامل است).'); }
		if (!t.sessions && parseInt(b.enabled, 10)) { notes.push('هنوز جلسه‌ای در این بازه ثبت نشده است. هر بازدید حدود ۱۰ ثانیه بعد از ورود یا هنگام خروج ثبت می‌شود.'); }
		var note = $('nca-bh-note');
		note.hidden = !notes.length;
		note.textContent = notes.join(' ');

		renderLive(b.realtime);
		renderFunnel(t);
		renderBhTrend(b);
		renderBhChannels(b);
		renderShare($('nca-bh-devices'), b.devices, t.sessions, function (key) { return DEVICES[key] || key; });
		renderShare($('nca-bh-visitor'), b.visitor, t.sessions, function (key) { return key === '1' ? 'کاربر جدید' : 'کاربر بازگشتی'; });
		renderDimTable($('nca-bh-browsers'), b.browsers, 'مرورگر', function (key) { return BROWSERS[key] || key; });
		renderDimTable($('nca-bh-os'), b.os, 'سیستم عامل', function (key) { return key === 'other' ? 'سایر' : key; });
		renderLanding(b);
		renderPathList($('nca-bh-pages'), b.pages.map(function (x) { return { path: x.path, n: x.views }; }), b.home, 'بازدید');
		renderPathList($('nca-bh-exits'), b.exits.map(function (x) { return { path: x.key, n: x.sessions }; }), b.home, 'خروج');
		renderHeat(b.heat);
		renderSearch(b.searches);
	}

	function renderLive(rt) {
		var el = $('nca-bh-live');
		if (!rt) { el.innerHTML = ''; return; }
		var list = function (rows, label) {
			return rows.length ? '<ul class="nca-rank">' + rows.map(function (r) {
				return '<li><div class="nca-rank-top"><span dir="auto">' + label(r.key) + '</span><strong>' + num(r.n) + '</strong></div><span class="nca-bar nca-bar--full"><span style="width:' + pct(r.n, rt.users || 1).toFixed(2) + '%"></span></span></li>';
			}).join('') + '</ul>' : '';
		};
		el.innerHTML = '<div class="nca-live"><strong>' + num(rt.users) + '</strong><span>بازدیدکننده فعال</span></div>' +
			(rt.users ? '<div class="nca-live-cols"><div><h3>کانال</h3>' + list(rt.channels, function (k2) { return esc(chLabel(k2)); }) + '</div>' +
			'<div><h3>صفحه فعلی</h3>' + list(rt.pages, function (k2) { return esc(k2 || '-'); }) + '</div></div>' : '<p class="nca-muted">در ۳۰ دقیقه اخیر بازدیدی ثبت نشده است.</p>');
	}

	function renderFunnel(t) {
		var el = $('nca-bh-funnel');
		var steps = hasWoo ? [
			['ورود به سایت', t.sessions],
			['دیدن محصول', t.f_product],
			['افزودن به سبد', t.f_cart],
			['ورود به پرداخت', t.f_checkout],
			['خرید موفق', t.buyers]
		] : [['ورود به سایت', t.sessions], ['ثبت لید', t.lead_sessions]];
		if (!t.sessions) { el.innerHTML = '<p class="nca-empty">داده‌ای برای این بازه نیست.</p>'; return; }
		el.innerHTML = '<ol class="nca-funnel">' + steps.map(function (s, i) {
			var prevN = i ? steps[i - 1][1] : 0;
			var drop = i && prevN ? '<small class="nca-muted">' + pctText(pct(s[1], prevN)) + ' از مرحله قبل</small>' : '';
			return '<li><div class="nca-rank-top"><span>' + esc(s[0]) + '</span><strong>' + num(s[1]) + ' <em>' + pctText(pct(s[1], t.sessions)) + '</em></strong></div>' +
				'<span class="nca-bar nca-bar--full"><span style="width:' + Math.max(0.5, pct(s[1], t.sessions)).toFixed(2) + '%"></span></span>' + drop + '</li>';
		}).join('') + '</ol>';
	}

	function renderBhTrend(b) {
		var canvas = $('nca-bh-trend');
		if (charts.bh) { charts.bh.destroy(); charts.bh = null; }
		if (!canvas || canvas.closest('.nca-tab-panel').hidden || !window.Chart) { return; }
		var metric = state.bhMetric || 'sessions';
		var names = { sessions: 'جلسه', users: 'کاربر', pageviews: 'بازدید صفحه' };
		var opts = baseChartOptions();
		opts.interaction = { mode: 'index', intersect: false };
		opts.scales = {
			x: { reverse: true, grid: { display: false }, border: { display: false }, ticks: { font: { family: FONT, size: 11 }, color: '#64748b', maxRotation: 0, autoSkipPadding: 12 } },
			y: { position: 'right', beginAtZero: true, border: { display: false }, grid: { color: '#eef2f7' }, ticks: { precision: 0, font: { family: FONT, size: 11 }, color: '#64748b' } }
		};
		var sets = [{ type: 'line', label: names[metric], data: b.series[metric], borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.12)', fill: true, tension: 0.3, pointRadius: 2 }];
		if (metric === 'sessions') {
			sets.push({ type: 'line', label: 'جلسه با تعامل', data: b.series.engaged, borderColor: '#10b981', backgroundColor: '#10b981', borderDash: [5, 4], tension: 0.3, pointRadius: 0 });
		}
		opts.plugins.tooltip.callbacks = { label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + num(ctx.parsed.y); } };
		charts.bh = new window.Chart(canvas, { data: { labels: b.labels, datasets: sets }, options: opts });
	}

	function bhHead(first) {
		return '<thead><tr><th>' + esc(first) + '</th><th>جلسه</th><th>کاربر</th><th>نرخ تعامل</th><th>صفحه در جلسه</th><th>زمان تعامل</th>' +
			(hasWoo ? '<th>خرید</th><th>نرخ تبدیل</th><th>درآمد خالص</th>' : '') + '<th>لید</th></tr></thead>';
	}
	function bhCells(r) {
		return '<td>' + num(r.sessions) + (r.new_sessions ? '<small class="nca-muted nca-cell-sub">' + rate(r.new_sessions, r.sessions) + ' جدید</small>' : '') + '</td>' +
			'<td>' + num(r.users) + '</td><td>' + rate(r.engaged, r.sessions) + '</td>' +
			'<td>' + (r.sessions ? nf1.format(r.pageviews / r.sessions) : '-') + '</td><td>' + secs(r.avg_time) + '</td>' +
			(hasWoo ? '<td>' + num(r.orders) + '</td><td><span class="nca-rate">' + rate(r.buyers, r.sessions) + '</span></td><td class="nca-strong">' + esc(r.net ? money(r.net) : '-') + '</td>' : '') +
			'<td>' + num(r.leads) + '</td>';
	}
	function renderBhChannels(b) {
		var cols = hasWoo ? 10 : 7;
		$('nca-bh-channels').innerHTML = bhHead('کانال') + (b.channels.length ? '<tbody>' + b.channels.map(function (r) {
			var c = CH[r.key] || {};
			return '<tr><th scope="row"><span class="nca-chip"><i style="background:' + esc(c.color || '#94a3b8') + '"></i>' + esc(chLabel(r.key)) + '</span></th>' + bhCells(r) + '</tr>';
		}).join('') + '</tbody>' : emptyRow(cols, 'داده‌ای نیست.'));
	}
	function renderShare(el, rows, total, label) {
		if (!rows.length) { el.innerHTML = '<p class="nca-empty">داده‌ای نیست.</p>'; return; }
		el.innerHTML = '<ul class="nca-rank">' + rows.map(function (r) {
			return '<li><div class="nca-rank-top"><span>' + esc(label(r.key)) + '</span><strong>' + num(r.sessions) + ' <em>' + rate(r.sessions, total) + '</em></strong></div>' +
				'<span class="nca-bar nca-bar--full"><span style="width:' + pct(r.sessions, total).toFixed(2) + '%"></span></span>' +
				'<small class="nca-muted">تعامل ' + rate(r.engaged, r.sessions) + (hasWoo ? ' · تبدیل ' + rate(r.buyers, r.sessions) + (r.net ? ' · ' + esc(compactMoney(r.net)) : '') : '') + ' · ' + secs(r.avg_time) + '</small></li>';
		}).join('') + '</ul>';
	}
	function renderDimTable(el, rows, first, label) {
		el.innerHTML = '<thead><tr><th>' + esc(first) + '</th><th>جلسه</th><th>نرخ تعامل</th>' + (hasWoo ? '<th>نرخ تبدیل</th><th>درآمد خالص</th>' : '<th>لید</th>') + '</tr></thead>' +
			(rows.length ? '<tbody>' + rows.map(function (r) {
				return '<tr><th scope="row">' + esc(label(r.key)) + '</th><td>' + num(r.sessions) + '</td><td>' + rate(r.engaged, r.sessions) + '</td>' +
					(hasWoo ? '<td><span class="nca-rate">' + rate(r.buyers, r.sessions) + '</span></td><td>' + esc(r.net ? money(r.net) : '-') + '</td>' : '<td>' + num(r.leads) + '</td>') + '</tr>';
			}).join('') + '</tbody>' : emptyRow(hasWoo ? 5 : 4, 'داده‌ای نیست.'));
	}
	function renderLanding(b) {
		var rows = b.landing;
		$('nca-bh-landing').innerHTML = '<thead><tr><th>صفحه ورود</th><th>جلسه</th><th>نرخ پرش</th><th>صفحه در جلسه</th><th>زمان تعامل</th>' + (hasWoo ? '<th>نرخ تبدیل</th><th>درآمد خالص</th>' : '') + '<th>لید</th></tr></thead>' +
			(rows.length ? '<tbody>' + rows.map(function (r) {
				var bounce = r.sessions ? 100 - pct(r.engaged, r.sessions) : 0;
				return '<tr><th scope="row">' + pathCell(b.home, r.key) + '</th><td>' + num(r.sessions) + '</td>' +
					'<td><span class="nca-rate' + (bounce >= 70 && r.sessions >= 10 ? ' nca-rate--bad' : '') + '">' + pctText(bounce) + '</span></td>' +
					'<td>' + (r.sessions ? nf1.format(r.pageviews / r.sessions) : '-') + '</td><td>' + secs(r.avg_time) + '</td>' +
					(hasWoo ? '<td><span class="nca-rate">' + rate(r.buyers, r.sessions) + '</span></td><td>' + esc(r.net ? money(r.net) : '-') + '</td>' : '') +
					'<td>' + num(r.leads) + '</td></tr>';
			}).join('') + '</tbody>' : emptyRow(hasWoo ? 8 : 6, 'داده‌ای نیست.'));
	}
	function renderPathList(el, rows, home, unit) {
		if (!rows.length) { el.innerHTML = '<p class="nca-empty">داده‌ای نیست.</p>'; return; }
		var max = rows[0].n || 1;
		el.innerHTML = '<ol class="nca-rank nca-rank--paths">' + rows.map(function (r) {
			return '<li><div class="nca-rank-top"><span>' + pathCell(home, r.path) + '</span><strong>' + num(r.n) + ' <em>' + esc(unit) + '</em></strong></div><span class="nca-bar nca-bar--full"><span style="width:' + pct(r.n, max).toFixed(2) + '%"></span></span></li>';
		}).join('') + '</ol>';
	}
	function renderHeat(heat) {
		var el = $('nca-bh-heat');
		var max = 0;
		heat.forEach(function (row) { row.forEach(function (v) { if (v > max) { max = v; } }); });
		if (!max) { el.innerHTML = '<p class="nca-empty">داده‌ای نیست.</p>'; return; }
		var head = '<tr><th></th>';
		for (var h = 0; h < 24; h++) { head += '<th scope="col">' + (h % 3 === 0 ? faDigits(h) : '') + '</th>'; }
		el.innerHTML = '<table class="nca-heat"><thead>' + head + '</tr></thead><tbody>' + WEEKDAYS.map(function (w) {
			return '<tr><th scope="row">' + w[1] + '</th>' + heat[w[0]].map(function (v, hr) {
				var a = v ? 0.12 + 0.88 * (v / max) : 0;
				return '<td style="--a:' + a.toFixed(3) + '" title="' + esc(w[1] + ' ساعت ' + faDigits(hr) + ': ' + num(v) + ' جلسه') + '"></td>';
			}).join('') + '</tr>';
		}).join('') + '</tbody></table>';
	}
	function renderSearch(s) {
		var el = $('nca-bh-search');
		var t = s.total;
		if (!t.searches) { el.innerHTML = '<p class="nca-empty">جستجویی در این بازه ثبت نشده است. (جستجوی زنده/پیشنهادی قالب‌ها شمرده نمی‌شود؛ فقط جستجویی که صفحه نتایج را باز می‌کند.)</p>'; return; }
		var list = function (rows, zero) {
			return '<ol class="nca-terms">' + rows.map(function (r) {
				return '<li><span dir="auto">' + esc(r.term) + '</span><strong>' + num(r.n) + '</strong>' + (!zero && r.zero ? '<small class="nca-muted">' + num(r.zero) + ' بی‌نتیجه</small>' : '') + '</li>';
			}).join('') + '</ol>';
		};
		el.innerHTML = '<div class="nca-mini-kpis nca-mini-kpis--inline">' + miniKpi('جستجو', num(t.searches)) + miniKpi('عبارت متفاوت', num(t.terms)) + miniKpi('بی‌نتیجه', num(t.zero), rate(t.zero, t.searches), t.zero ? 'bad' : '') + '</div>' +
			'<h3>پرتکرارترین‌ها</h3>' + list(s.top, false) +
			(s.zero.length ? '<h3>جستجوهای بی‌نتیجه <small class="nca-muted">(محصولی که مشتری می‌خواهد ولی پیدا نمی‌کند)</small></h3>' + list(s.zero, true) : '');
	}
	(function () {
		var el = $('nca-bh-metric');
		if (!el) { return; }
		el.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-v]');
			if (!b) { return; }
			state.bhMetric = b.getAttribute('data-v');
			setSeg('nca-bh-metric', state.bhMetric);
			if (bh.data) { renderBhTrend(bh.data); }
		});
	})();

	/* ---------------------------------------------------------- */
	/* Campaigns: Yektanet, SMS, all tagged campaigns             */
	/* ---------------------------------------------------------- */

	function crOf(m) { return m.visits ? pct(m.orders, m.visits) : null; }
	function pctText(v) { return v === null || v === undefined || !isFinite(v) ? '-' : nf1.format(v) + '٪'; }
	function hoursText(h) {
		if (h === null || h === undefined) { return '-'; }
		if (h < 1) { return 'کمتر از ۱ ساعت'; }
		if (h < 48) { return nf1.format(h) + ' ساعت'; }
		return nf1.format(h / 24) + ' روز';
	}
	function regOf(d, key) { var r = d.campaigns && d.campaigns.registry; return (r && key && r[key]) || null; }
	function nameCell(label, sub, empty) {
		return '<span class="nca-cell-name">' + (label ? '<span dir="auto">' + esc(label) + '</span>' : '<span class="nca-muted">' + esc(empty || '(بدون مقدار)') + '</span>') + '</span>' +
			(sub ? '<small class="nca-muted nca-cell-sub" dir="auto">' + sub + '</small>' : '');
	}

	// Metric columns shared by every campaign table.
	function metricHead() {
		return '<th>کلیک</th>' + (hasWoo ? '<th>سفارش</th><th>درآمد خالص</th><th>نرخ تبدیل</th><th>میانگین سفارش</th>' : '') + '<th>لید</th>';
	}
	function metricCells(m) {
		var html = '<td>' + num(m.visits) + (m.visits && m.new ? '<small class="nca-muted nca-cell-sub">' + nf1.format(pct(m.new, m.visits)) + '٪ جدید</small>' : '') + '</td>';
		if (hasWoo) {
			html += '<td>' + num(m.orders) + '</td><td class="nca-strong">' + esc(m.net ? money(m.net) : '-') + '</td>' +
				'<td>' + (m.visits ? '<span class="nca-rate">' + pctText(crOf(m)) + '</span>' : '<span class="nca-muted" title="کلیکی ثبت نشده است">-</span>') + '</td>' +
				'<td>' + esc(m.orders ? money(m.net / m.orders) : '-') + '</td>';
		}
		return html + '<td>' + num(m.leads) + (m.sold ? '<small class="nca-muted nca-cell-sub">' + num(m.sold) + ' به خرید رسید</small>' : '') + '</td>';
	}
	function costCells(d, key, m, opts) {
		opts = opts || {};
		var reg = regOf(d, key) || {};
		var cost = +reg.cost || 0, sent = +reg.sent || 0;
		var html = '';
		if (opts.sms) {
			html += '<td>' + (reg.short ? '<a href="' + esc(reg.short) + '" target="_blank" rel="noopener noreferrer" dir="ltr">' + esc(String(reg.short).replace(/^https?:\/\//, '')) + '</a>' : (opts.shortener ? '<span dir="ltr">' + esc(opts.shortener) + '</span>' : '<span class="nca-muted">-</span>')) + '</td>' +
				'<td>' + (sent ? num(sent) : '<span class="nca-muted">-</span>') + '</td>' +
				'<td>' + (sent ? '<span class="nca-rate">' + pctText(pct(m.visits, sent)) + '</span>' : '<span class="nca-muted">-</span>') + '</td>';
		}
		html += '<td>' + (cost ? esc(money(cost)) : '<span class="nca-muted">-</span>') + '</td>';
		if (hasWoo) {
			html += '<td>' + (cost ? '<span class="nca-roas nca-roas--' + (m.net >= cost ? 'good' : 'bad') + '">' + nf1.format(m.net / cost) + 'x</span>' : '<span class="nca-muted">-</span>') +
				(cost && m.orders ? '<small class="nca-muted nca-cell-sub">هر سفارش ' + esc(compactMoney(cost / m.orders)) + '</small>' : '') +
				(cost && m.visits ? '<small class="nca-muted nca-cell-sub">هر کلیک ' + esc(compactMoney(cost / m.visits)) + '</small>' : '') + '</td>';
		}
		return html;
	}
	// Same rules as NCA_Campaigns::edit_mode(): which editor fields mean something for a channel.
	function modeOf(channel) {
		var g = (CH[channel] && CH[channel].group) || '';
		if (channel === 'sms') { return 'sms'; }
		if (channel === 'yektanet' || channel === 'panjereh') { return 'yektanet'; }
		if (g === 'paid' || g === 'compare') { return 'ads'; }
		return 'other';
	}
	function editBtn(source, campaign, channel) {
		return '<td><button type="button" class="nca-icon-btn" data-cmp-edit data-source="' + esc(source) + '" data-campaign="' + esc(campaign) + '" data-channel="' + esc(channel || '') + '" aria-label="ثبت هزینه و جزئیات کمپین" title="ثبت هزینه و جزئیات کمپین">' +
			'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button></td>';
	}
	function emptyRow(cols, text) { return '<tbody><tr><td colspan="' + cols + '" class="nca-empty">' + esc(text) + '</td></tr></tbody>'; }
	function moreNote(block, shown) {
		return block.count > shown ? '<caption class="nca-caption">' + num(shown) + ' مورد مهم‌تر از ' + num(block.count) + ' مورد</caption>' : '';
	}
	function miniKpi(label, value, sub, tone) {
		return '<div class="nca-mini-kpi' + (tone ? ' nca-mini-kpi--' + tone : '') + '"><span>' + esc(label) + '</span><strong>' + value + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
	}
	function sumCost(d, rows) {
		return rows.reduce(function (s, r) { var g = regOf(d, r.key); return s + (g ? +g.cost || 0 : 0); }, 0);
	}
	function trackingNote(c, el, extra) {
		var parts = [];
		if (!parseInt(c.tracking, 10)) { parts.push('شمارش کلیک‌های ورودی در تنظیمات خاموش است؛ نرخ تبدیل و هزینه هر کلیک حساب نمی‌شود.'); }
		else if (parseInt(c.visits_partial, 10)) { parts.push('کلیک‌های ورودی از ' + c.visits_since + ' شمرده می‌شوند؛ برای روزهای قبل از آن فقط فروش و لید در دسترس است و نرخ تبدیل دقیق نیست.'); }
		if (parseInt(c.truncated, 10)) { parts.push('بازه خیلی بزرگ است؛ فقط ۲۰٬۰۰۰ رویداد آخر بررسی شد. بازه کوتاه‌تری انتخاب کنید.'); }
		if (extra) { parts.push(extra); }
		el.hidden = !parts.length;
		el.textContent = parts.join(' ');
	}

	function renderCampaignTabs(d) {
		var c = d.campaigns;
		if (!c) { return; }
		if (state.tab === 'yektanet') { renderYektanet(d, c.yektanet); }
		if (state.tab === 'sms') { renderSms(d, c.sms); }
		if (state.tab === 'campaigns') { renderAllCampaigns(d, c.all); }
	}

	function renderYektanet(d, y) {
		var t = y.total;
		var cost = sumCost(d, y.campaign.rows);
		var html = miniKpi('کلیک ورودی', num(t.visits), t.visits ? nf1.format(pct(t.new, t.visits)) + '٪ بازدیدکننده جدید' : '');
		if (hasWoo) {
			html += miniKpi('سفارش', num(t.orders), t.buyers ? num(t.buyers) + ' خریدار' : '') +
				miniKpi('درآمد خالص', kpiMoney(t.net), '', 'accent') +
				miniKpi('نرخ تبدیل', pctText(crOf(t)), 'سفارش به ازای هر کلیک') +
				miniKpi('میانگین سفارش', t.orders ? kpiMoney(t.net / t.orders) : '-') +
				miniKpi('فاصله کلیک تا خرید', hoursText(t.median_hours), 'میانه');
		}
		html += miniKpi('لید', num(t.leads), t.sold ? num(t.sold) + ' به خرید رسید' : '');
		if (cost) {
			html += miniKpi('هزینه ثبت شده', kpiMoney(cost)) +
				(hasWoo ? miniKpi('بازگشت سرمایه (ROAS)', nf1.format(t.net / cost) + 'x', t.orders ? 'هر سفارش ' + esc(compactMoney(cost / t.orders)) : '', t.net >= cost ? 'good' : 'bad') : '');
		}
		$('nca-yk-kpis').innerHTML = html;
		var none = !t.visits && !t.orders && !t.leads;
		trackingNote(d.campaigns, $('nca-yk-note'), none ? 'در این بازه ورودی یا فروشی از یکتانت و پنجره ثبت نشده است. اگر کمپین فعال دارید، بخش «تنظیم درست UTM در پنل یکتانت» را ببینید.' : '');

		var cols = 1 + (hasWoo ? 6 : 2);
		$('nca-yk-type').innerHTML = '<thead><tr><th>نوع</th>' + metricHead() + '</tr></thead>' + (y.type.rows.length ? '<tbody>' + y.type.rows.map(function (r) {
			return '<tr><th scope="row">' + nameCell(r.label) + '</th>' + metricCells(r.m) + '</tr>';
		}).join('') + '</tbody>' : emptyRow(cols, 'داده‌ای نیست.'));

		var camCols = cols + 1 + (hasWoo ? 2 : 1);
		$('nca-yk-campaign').innerHTML = moreNote(y.campaign, y.campaign.rows.length) + '<thead><tr><th>کمپین</th>' + metricHead() + '<th>هزینه</th>' + (hasWoo ? '<th>ROAS</th>' : '') + '<th><span class="screen-reader-text">ویرایش</span></th></tr></thead>' +
			(y.campaign.rows.length ? '<tbody>' + y.campaign.rows.map(function (r) {
				var reg = regOf(d, r.key);
				return '<tr><th scope="row">' + nameCell(reg && reg.label ? reg.label : r.label, (reg && reg.label ? esc(r.label) + ' · ' : '') + esc(r.source), '(بدون کمپین)') + '</th>' + metricCells(r.m) + costCells(d, r.key, r.m) + editBtn(r.source, r.label, /panjere/.test(r.source) ? 'panjereh' : 'yektanet') + '</tr>';
			}).join('') + '</tbody>' : emptyRow(camCols, 'کمپینی در این بازه نیست.'));

		['publisher', 'ad'].forEach(function (dim) {
			var block = y[dim];
			$('nca-yk-' + dim).innerHTML = moreNote(block, block.rows.length) + '<thead><tr><th>' + (dim === 'publisher' ? 'نمایش دهنده' : 'تبلیغ') + '</th>' + metricHead() + '</tr></thead>' +
				(block.rows.length ? '<tbody>' + block.rows.map(function (r) {
					var label = r.label;
					var sub = dim === 'publisher' && isHost(label) ? '<a href="https://' + esc(label) + '" target="_blank" rel="noopener noreferrer nofollow">مشاهده سایت</a>' : '';
					return '<tr><th scope="row">' + nameCell(label, sub, dim === 'publisher' ? '(utm_content خالی)' : '(utm_term خالی)') + '</th>' + metricCells(r.m) + '</tr>';
				}).join('') + '</tbody>' : emptyRow(cols, 'داده‌ای نیست.'));
		});

		// Share of Yektanet along the purchase path.
		var touch = y.touch, th = '';
		if (touch && hasWoo) {
			th = '<ul class="nca-touch">' +
				'<li><span>آخرین ورود از یکتانت (خرید مستقیم بعد از تبلیغ)</span><strong>' + num(touch.last_orders) + ' سفارش</strong><small>' + esc(money(touch.last_net)) + '</small></li>' +
				'<li><span>اولین آشنایی از یکتانت</span><strong>' + num(touch.first_orders) + ' سفارش</strong><small>' + esc(money(touch.first_net)) + '</small></li>' +
				'<li class="nca-touch--assist"><span>یکتانت معرف بود ولی خرید با کانال دیگری انجام شد</span><strong>' + num(touch.assisted) + ' سفارش</strong><small>' + esc(money(touch.assisted_net)) + '</small></li></ul>' +
				'<p class="nca-muted">جدول‌های این زبانه بر اساس «' + (state.model === 'first' ? 'اولین ورود' : 'آخرین ورود') + '» هستند؛ از دکمه بالای صفحه می‌توانید عوضش کنید.</p>';
		}
		if (y.platform.rows.length > 1 || (y.platform.rows[0] && y.platform.rows[0].key === 'panjereh')) {
			th += '<ul class="nca-rank">' + y.platform.rows.map(function (r) {
				var v = hasWoo ? r.m.net : r.m.leads, tot = hasWoo ? t.net : t.leads;
				return '<li><div class="nca-rank-top"><span>' + esc(r.label) + '</span><strong>' + (hasWoo ? esc(money(r.m.net)) : num(r.m.leads)) + '</strong></div><span class="nca-bar nca-bar--full"><span style="width:' + pct(v, tot).toFixed(2) + '%"></span></span></li>';
			}).join('') + '</ul>';
		}
		$('nca-yk-touch').innerHTML = th || '<p class="nca-empty">برای این بخش، ووکامرس و حداقل یک سفارش لازم است.</p>';

		// Trend.
		var canvas = $('nca-yk-trend');
		if (charts.yk) { charts.yk.destroy(); charts.yk = null; }
		if (canvas && !canvas.closest('.nca-tab-panel').hidden) {
			var opts = baseChartOptions();
			opts.interaction = { mode: 'index', intersect: false };
			opts.scales = {
				x: { reverse: true, grid: { display: false }, border: { display: false }, ticks: { font: { family: FONT, size: 11 }, color: '#64748b', maxRotation: 0, autoSkipPadding: 12 } },
				y: { position: 'right', beginAtZero: true, border: { display: false }, grid: { color: '#eef2f7' }, ticks: { precision: 0, font: { family: FONT, size: 11 }, color: '#64748b' }, title: { display: true, text: 'کلیک و سفارش', font: { family: FONT } } }
			};
			var sets = [
				{ type: 'bar', label: 'کلیک ورودی', data: y.series.visits, backgroundColor: 'rgba(255, 122, 0, 0.35)', borderRadius: 4, yAxisID: 'y', order: 2 },
				{ type: 'line', label: 'سفارش', data: y.series.orders, borderColor: '#ff7a00', backgroundColor: '#ff7a00', tension: 0.3, pointRadius: 2, yAxisID: 'y', order: 1 }
			];
			if (hasWoo) {
				opts.scales.yRev = { position: 'left', beginAtZero: true, border: { display: false }, grid: { display: false }, ticks: { font: { family: FONT, size: 11 }, color: '#64748b', callback: function (v) { return compact(v); } } };
				sets.push({ type: 'line', label: 'درآمد خالص', data: y.series.revenue, borderColor: '#4f46e5', backgroundColor: '#4f46e5', borderDash: [5, 4], tension: 0.3, pointRadius: 2, yAxisID: 'yRev', order: 0 });
			}
			opts.plugins.tooltip.callbacks = {
				label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + (ctx.dataset.yAxisID === 'yRev' ? money(ctx.parsed.y) : num(ctx.parsed.y)); }
			};
			charts.yk = new window.Chart(canvas, { data: { labels: d.labels, datasets: sets }, options: opts });
		}
	}

	function renderSms(d, sm) {
		var t = sm.total;
		var sent = sm.campaign.rows.reduce(function (s, r) { var g = regOf(d, r.key); return s + (g ? +g.sent || 0 : 0); }, 0);
		var cost = sumCost(d, sm.campaign.rows);
		var html = (sent ? miniKpi('پیامک ارسالی', num(sent)) : '') +
			miniKpi('کلیک ورودی', num(t.visits), sent ? 'نرخ کلیک ' + pctText(pct(t.visits, sent)) : (t.visits ? nf1.format(pct(t.new, t.visits)) + '٪ جدید' : ''));
		if (hasWoo) {
			html += miniKpi('سفارش', num(t.orders), t.buyers ? num(t.buyers) + ' خریدار' : '') +
				miniKpi('درآمد خالص', kpiMoney(t.net), '', 'accent') +
				miniKpi('نرخ تبدیل', pctText(crOf(t)), 'سفارش به ازای هر کلیک') +
				miniKpi('فاصله کلیک تا خرید', hoursText(t.median_hours), 'میانه');
		}
		html += miniKpi('لید', num(t.leads));
		if (cost) {
			html += miniKpi('هزینه ثبت شده', kpiMoney(cost)) + (hasWoo ? miniKpi('بازگشت سرمایه (ROAS)', nf1.format(t.net / cost) + 'x', '', t.net >= cost ? 'good' : 'bad') : '');
		}
		$('nca-sms-kpis').innerHTML = html;
		var none = !t.visits && !t.orders && !t.leads && !sm.campaign.rows.length;
		trackingNote(d.campaigns, $('nca-sms-note'), none ? 'در این بازه ورودی پیامکی ثبت نشده است. لینک‌های پیامک را با «ساخت لینک UTM» بسازید و بعد در b2n.ir کوتاه کنید؛ لینک کوتاه بدون UTM «ورود مستقیم» ثبت می‌شود.' : '');

		var base = 1 + (hasWoo ? 6 : 2);
		$('nca-sms-campaign').innerHTML = moreNote(sm.campaign, sm.campaign.rows.length) + '<thead><tr><th>کمپین</th>' + metricHead() + '<th>لینک کوتاه</th><th>ارسال</th><th>نرخ کلیک</th><th>هزینه</th>' + (hasWoo ? '<th>ROAS</th>' : '') + '<th><span class="screen-reader-text">ویرایش</span></th></tr></thead>' +
			(sm.campaign.rows.length ? '<tbody>' + sm.campaign.rows.map(function (r) {
				var reg = regOf(d, r.key);
				var shortener = r.content && /^(b2n(\.ir)?|yun\.ir|bit\.?ly|cutt\.ly|tinyurl\.com|rebrand\.ly)$/i.test(r.content) ? (/^b2n/i.test(r.content) ? 'b2n.ir' : r.content) : '';
				return '<tr><th scope="row">' + nameCell(reg && reg.label ? reg.label : r.label, (reg && reg.label ? esc(r.label) + ' · ' : '') + esc(r.source) + (reg && reg.date_fa ? ' · ' + esc(reg.date_fa) : ''), '(بدون نام کمپین)') + '</th>' +
					metricCells(r.m) + costCells(d, r.key, r.m, { sms: true, shortener: shortener }) + editBtn(r.source, r.label, 'sms') + '</tr>';
			}).join('') + '</tbody>' : emptyRow(base + 5, 'کمپین پیامکی در این بازه نیست.'));

		$('nca-sms-source').innerHTML = '<thead><tr><th>منبع</th>' + metricHead() + '</tr></thead>' + (sm.source.rows.length ? '<tbody>' + sm.source.rows.map(function (r) {
			return '<tr><th scope="row">' + nameCell(r.label, '', '(بدون utm_source)') + '</th>' + metricCells(r.m) + '</tr>';
		}).join('') + '</tbody>' : emptyRow(base, 'داده‌ای نیست.'));
	}

	function renderAllCampaigns(d, all) {
		var q = state.cmpSearch.trim().toLowerCase();
		var rows = all.rows.filter(function (r) {
			var mode = modeOf(r.channel);
			if (state.cmpType === 'ads' && mode !== 'ads' && mode !== 'yektanet') { return false; }
			if (state.cmpType === 'sms' && mode !== 'sms') { return false; }
			if (state.cmpType === 'other' && mode !== 'other') { return false; }
			if (!q) { return true; }
			var reg = regOf(d, r.key);
			return [r.source, r.medium, r.campaign, (CH[r.channel] || {}).label, reg && reg.label].join(' ').toLowerCase().indexOf(q) !== -1;
		});
		trackingNote(d.campaigns, $('nca-cmp-note'), '');
		var cols = 3 + (hasWoo ? 6 : 2) + 1 + (hasWoo ? 1 : 0) + 1;
		$('nca-all-campaigns').innerHTML = moreNote(all, all.rows.length) + '<thead><tr><th>کمپین</th><th>کانال</th><th>منبع / رسانه</th>' + metricHead() + '<th>هزینه</th>' + (hasWoo ? '<th>ROAS</th>' : '') + '<th><span class="screen-reader-text">ویرایش</span></th></tr></thead>' +
			(rows.length ? '<tbody>' + rows.map(function (r) {
				var c = CH[r.channel] || { label: r.channel, color: '#999' };
				var reg = regOf(d, r.key);
				return '<tr><th scope="row">' + nameCell(reg && reg.label ? reg.label : r.campaign, reg && reg.label ? esc(r.campaign) : '', '(بدون utm_campaign)') + '</th>' +
					'<td><span class="nca-chip"><i style="background:' + esc(c.color) + '"></i>' + esc(c.label) + '</span></td>' +
					'<td dir="ltr" class="nca-src">' + esc(r.source || '-') + (r.medium ? ' / ' + esc(r.medium) : '') + '</td>' +
					metricCells(r.m) + costCells(d, r.key, r.m) + editBtn(r.source, r.campaign, r.channel) + '</tr>';
			}).join('') + '</tbody>' : emptyRow(cols, (q || state.cmpType !== 'all') ? 'کمپینی با این فیلتر پیدا نشد.' : 'در این بازه کمپین UTM داری ثبت نشده است.'));
	}

	(function () {
		var seg = $('nca-cmp-type');
		if (!seg) { return; }
		seg.addEventListener('click', function (e) {
			var b = e.target.closest('button[data-v]');
			if (!b) { return; }
			state.cmpType = b.getAttribute('data-v');
			setSeg('nca-cmp-type', state.cmpType);
			if (state.data && state.data.campaigns) { renderAllCampaigns(state.data, state.data.campaigns.all); }
		});
	})();

	(function () {
		var input = $('nca-cmp-search');
		if (!input) { return; }
		input.addEventListener('input', function () {
			state.cmpSearch = input.value;
			if (state.data && state.data.campaigns) { renderAllCampaigns(state.data, state.data.campaigns.all); }
		});
	})();

	/* Campaign editor (cost, SMS count, short link, readable name). */
	(function () {
		var modal = $('nca-cmp-modal');
		var form = $('nca-cmp-form');
		if (!modal || !form) { return; }
		var lastFocus = null;
		function keyOf(source, campaign) { return (String(source || '').trim().toLowerCase() + '|' + String(campaign || '').trim().toLowerCase()).slice(0, 260); }
		var MODES = {
			sms: {
				help: 'کمپین پیامکی: تعداد ارسال برای نرخ کلیک، هزینه برای بازگشت سرمایه و هزینه هر سفارش، و لینک کوتاه برای نمایش در جدول پیامک‌ها.',
				cost: 'هزینه کل ارسال پیامک', costHelp: 'بازگشت سرمایه = درآمد بازه انتخاب شده ÷ این هزینه', placeholder: 'مثلا: حراج یلدا - پیامک'
			},
			yektanet: {
				help: 'کمپین یکتانت / پنجره: هزینه کل را از پنل یکتانت وارد کنید تا ROAS، هزینه هر سفارش و هزینه هر کلیک حساب شود.',
				cost: 'هزینه کل کمپین در یکتانت', costHelp: 'مبلغ خرج شده از پنل یکتانت؛ بازگشت سرمایه = درآمد بازه انتخاب شده ÷ این هزینه', placeholder: 'مثلا: حراج یلدا - بنری یکتانت'
			},
			ads: {
				help: 'تبلیغ پولی یا کلیکی (گوگل ادز، متا، ترب، دیوار و ...): هزینه کل را وارد کنید تا بازگشت سرمایه و هزینه هر سفارش حساب شود.',
				cost: 'هزینه تبلیغ', costHelp: 'بازگشت سرمایه = درآمد بازه انتخاب شده ÷ این هزینه؛ برای دقت، بازه را روی همان دوره هزینه بگذارید', placeholder: 'مثلا: ترب - کلیک‌های مهر'
			},
			other: {
				help: 'منبع رایگان (جستجوی گوگل، اینستاگرام، سایت‌ها و ...): فقط یک نام خوانا لازم است. اگر برایش پول داده‌اید (اینفلوئنسر، رپورتاژ) هزینه را هم بنویسید.',
				cost: 'هزینه (اختیاری)', costHelp: 'فقط اگر برای این ورودی پول پرداخت کرده‌اید', placeholder: 'مثلا: پیج اینستاگرام اصلی'
			}
		};
		function open(source, campaign, channel) {
			var reg = regOf(state.data || {}, keyOf(source, campaign)) || {};
			var mode = modeOf(channel);
			var cfgMode = MODES[mode];
			var ch = CH[channel] || { label: channel || '-', color: '#999' };
			lastFocus = document.activeElement;
			form.source.value = source;
			form.campaign.value = campaign;
			form.channel.value = channel || '';
			form.label.value = reg.label || '';
			form.label.placeholder = cfgMode.placeholder;
			form.cost.value = reg.cost ? String(Math.round(reg.cost)) : '';
			form.sent.value = mode === 'sms' && reg.sent ? String(reg.sent) : '';
			form.short.value = mode === 'sms' ? (reg.short || '') : '';
			form.date.value = (mode === 'sms' || mode === 'yektanet') ? (reg.date_fa || '') : '';
			form.querySelectorAll('[data-for]').forEach(function (el) {
				el.hidden = (' ' + el.getAttribute('data-for') + ' ').indexOf(' ' + mode + ' ') === -1;
			});
			$('nca-cmp-help').textContent = cfgMode.help;
			$('nca-cmp-cost-label').textContent = cfgMode.cost;
			$('nca-cmp-cost-help').textContent = cfgMode.costHelp;
			$('nca-cmp-channel').innerHTML = '<i style="background:' + esc(ch.color) + '"></i>' + esc(ch.label);
			$('nca-cmp-id').textContent = (source || '-') + (campaign ? ' | ' + campaign : ' | (بدون نام کمپین)');
			$('nca-cmp-error').hidden = true;
			$('nca-cmp-delete').hidden = !regOf(state.data || {}, keyOf(source, campaign));
			modal.hidden = false;
			form.label.focus();
		}
		function close() {
			modal.hidden = true;
			if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
		}
		function send(extra) {
			var fd = new FormData(form);
			fd.append('action', 'nca_campaign_save');
			fd.append('nonce', cfg.nonce);
			Object.keys(extra || {}).forEach(function (k) { fd.append(k, extra[k]); });
			return fetch(cfg.ajax, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); });
		}
		function fail(res) {
			$('nca-cmp-error').textContent = (res && res.data && res.data.message) || 'ذخیره نشد. دوباره تلاش کنید.';
			$('nca-cmp-error').hidden = false;
		}
		document.addEventListener('click', function (e) {
			var b = e.target.closest('[data-cmp-edit]');
			if (b) { open(b.getAttribute('data-source'), b.getAttribute('data-campaign'), b.getAttribute('data-channel')); }
		});
		modal.addEventListener('click', function (e) {
			if (e.target === modal || e.target.closest('[data-close]')) { close(); }
		});
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) { close(); } });
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			send().then(function (res) {
				if (!res || !res.success) { fail(res); return; }
				var reg = state.data.campaigns.registry;
				reg[res.data.entry.key] = res.data.entry;
				close();
				renderCampaignTabs(state.data);
			}).catch(fail);
		});
		$('nca-cmp-delete').addEventListener('click', function () {
			if (!window.confirm('اطلاعات ثبت شده این کمپین حذف شود؟ آمار کلیک و فروش حذف نمی‌شود.')) { return; }
			send({ 'delete': '1' }).then(function (res) {
				if (!res || !res.success) { fail(res); return; }
				delete state.data.campaigns.registry[res.data.deleted];
				close();
				renderCampaignTabs(state.data);
			}).catch(fail);
		});
	})();

	/* ---------------------------------------------------------- */
	/* First-run guide                                            */
	/* ---------------------------------------------------------- */

	(function () {
		var box = $('nca-welcome');
		if (!box) { return; }
		function post(data) {
			var fd = new FormData();
			fd.append('nonce', cfg.nonce);
			Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
			return fetch(cfg.ajax, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); });
		}
		$('nca-welcome-close').addEventListener('click', function () {
			box.hidden = true;
			post({ action: 'nca_welcome_done' }).catch(function () { /* ignore */ });
		});
		var btn = $('nca-welcome-import');
		if (!btn) { return; }
		var status = $('nca-welcome-status');
		var added = 0, seen = 0;
		function run(page) {
			post({ action: 'nca_backfill', page: page }).then(function (res) {
				if (!res || !res.success) { throw new Error('bad'); }
				added += res.data.added;
				seen += res.data.processed;
				status.textContent = num(seen) + ' سفارش بررسی شد؛ ' + num(added) + ' سفارش به گزارش‌ها اضافه شد.';
				if (res.data.done) {
					status.textContent += ' تمام شد.';
					btn.disabled = false;
					load();
				} else {
					run(page + 1);
				}
			}).catch(function () {
				status.textContent = 'ارتباط با سرور قطع شد؛ دوباره بزنید. سفارش‌های واردشده تکرار نمی‌شوند.';
				btn.disabled = false;
			});
		}
		btn.addEventListener('click', function () {
			btn.disabled = true;
			added = 0;
			seen = 0;
			status.textContent = 'در حال بررسی سفارش‌ها…';
			run(1);
		});
	})();

	if (window.Chart) {
		window.Chart.defaults.font.family = FONT;
		window.Chart.defaults.color = '#475569';
	}
	load();
})();
