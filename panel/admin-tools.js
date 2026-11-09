/**
 * Sarcheshmeh (Channel Analytics) - UTM builder, backfill tool and small form helpers.
 */
(function () {
	'use strict';

	var cfg = window.ncaTools || {};
	var fa = new Intl.NumberFormat('fa-IR');

	function enDigits(s) {
		return String(s || '').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
			.replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
	}

	/* Confirm before destructive forms (replaces inline onsubmit). */
	document.querySelectorAll('form[data-nca-confirm]').forEach(function (form) {
		form.addEventListener('submit', function (e) {
			if (!window.confirm(form.getAttribute('data-nca-confirm'))) { e.preventDefault(); }
		});
	});

	/* Amount fields: latin digits with thousands separators while typing (the server strips the commas). */
	document.querySelectorAll('input[data-nca-money]').forEach(function (input) {
		var format = function () {
			var raw = enDigits(input.value).replace(/[^\d.]/g, '');
			if (!raw) { input.value = ''; return; }
			var parts = raw.split('.');
			parts[0] = parts[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			input.value = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0];
		};
		format();
		input.addEventListener('input', format);
	});

	/* UTM builder */
	var box = document.getElementById('nca-utm');
	if (box) {
		var $ = function (id) { return document.getElementById(id); };
		var fields = ['url', 'source', 'medium', 'campaign', 'content'];
		var clean = function (v) {
			return String(v || '').trim().toLowerCase().replace(/\s+/g, '-');
		};
		var build = function () {
			var url = String($('nca-utm-url').value || '').trim();
			var out = $('nca-utm-result');
			var copy = $('nca-utm-copy');
			if (!url) { out.textContent = ''; copy.disabled = true; return; }
			var pairs = [
				['utm_source', clean($('nca-utm-source').value)],
				['utm_medium', clean($('nca-utm-medium').value)],
				['utm_campaign', clean($('nca-utm-campaign').value)],
				['utm_content', clean($('nca-utm-content').value)]
			];
			var hash = '';
			var hi = url.indexOf('#');
			if (hi !== -1) { hash = url.slice(hi); url = url.slice(0, hi); }
			// Drop UTM parameters already present in the pasted address so they are not duplicated.
			var qi = url.indexOf('?');
			var base = qi === -1 ? url : url.slice(0, qi);
			var keep = qi === -1 ? [] : url.slice(qi + 1).split('&').filter(function (kv) {
				return kv && !/^utm_(source|medium|campaign|content|term)=/i.test(kv);
			});
			pairs.forEach(function (p) {
				if (p[1]) { keep.push(p[0] + '=' + encodeURIComponent(p[1])); }
			});
			out.textContent = base + (keep.length ? '?' + keep.join('&') : '') + hash;
			copy.disabled = false;
		};
		fields.forEach(function (f) { $('nca-utm-' + f).addEventListener('input', build); });
		box.querySelectorAll('.nca-pill').forEach(function (btn) {
			btn.addEventListener('click', function () {
				$('nca-utm-source').value = btn.getAttribute('data-source');
				$('nca-utm-medium').value = btn.getAttribute('data-medium');
				$('nca-utm-content').value = btn.getAttribute('data-content') || '';
				box.querySelectorAll('.nca-pill').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
				btn.setAttribute('aria-pressed', 'true');
				build();
				$('nca-utm-campaign').focus();
			});
		});
		$('nca-utm-copy').addEventListener('click', function () {
			var text = $('nca-utm-result').textContent;
			var btn = this;
			if (!text) { return; }
			var done = function () {
				btn.textContent = 'کپی شد ✓';
				btn.classList.add('is-done');
				setTimeout(function () { btn.textContent = 'کپی لینک'; btn.classList.remove('is-done'); }, 1600);
			};
			var fallback = function () {
				var ta = document.createElement('textarea');
				ta.value = text;
				ta.setAttribute('readonly', '');
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
				document.body.removeChild(ta);
			};
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text).then(done, fallback);
			} else {
				fallback();
			}
		});
		build();

		/* Campaign registry: short link, SMS count and cost of the campaign built above. */
		var post = function (data) {
			var fd = new FormData();
			fd.append('action', 'nca_campaign_save');
			fd.append('nonce', cfg.nonce);
			Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
			return fetch(cfg.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
				.then(function (r) { return r.json(); });
		};
		var regSave = $('nca-reg-save');
		if (regSave) {
			regSave.addEventListener('click', function () {
				var status = $('nca-reg-status');
				var source = clean($('nca-utm-source').value);
				var medium = clean($('nca-utm-medium').value);
				var campaign = clean($('nca-utm-campaign').value);
				// Same SMS sources as NCA_Channels (utm_medium=sms always counts as SMS).
				var smsSources = ['sms', 'payamak', 'b2n', 'b2n.ir', 'kavenegar', 'melipayamak', 'farazsms', 'ippanel', 'smsir', 'sms.ir', 'payamito', 'sms_panel', 'sms-panel'];
				if (medium !== 'sms' && smsSources.indexOf(source) === -1) {
					status.textContent = 'این مرحله فقط برای لینک‌های پیامکی است (منبع یا رسانه sms). برای کانال‌های دیگر، هزینه را در داشبورد با دکمه ویرایش همان کمپین ثبت کنید.';
					return;
				}
				if (!campaign) {
					status.textContent = 'اول نام کمپین (utm_campaign) را در مرحله ۲ بنویسید.';
					$('nca-utm-campaign').focus();
					return;
				}
				regSave.disabled = true;
				status.textContent = 'در حال ثبت';
				post({
					source: source,
					medium: medium,
					channel: 'sms',
					campaign: campaign,
					label: $('nca-reg-label').value,
					short: $('nca-reg-short').value,
					sent: $('nca-reg-sent').value,
					cost: $('nca-reg-cost').value
				}).then(function (res) {
					if (!res || !res.success) { throw new Error((res && res.data && res.data.message) || 'ثبت نشد.'); }
					status.textContent = 'کمپین «' + campaign + '» ثبت شد. گزارش آن در داشبورد، زبانه پیامک و همه کمپین‌ها است.';
				}).catch(function (err) {
					status.textContent = err && err.message ? err.message : 'ثبت نشد.';
				}).then(function () { regSave.disabled = false; });
			});
		}
		document.querySelectorAll('[data-reg-delete]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				if (!window.confirm('اطلاعات ثبت شده این کمپین (لینک کوتاه، تعداد ارسال و هزینه) حذف شود؟ آمار فروش و کلیک‌ها حذف نمی‌شود.')) { return; }
				btn.disabled = true;
				post({ source: btn.getAttribute('data-source'), campaign: btn.getAttribute('data-campaign'), 'delete': '1' })
					.then(function (res) {
						if (!res || !res.success) { throw new Error('failed'); }
						var tr = btn.closest('tr');
						if (tr) { tr.parentNode.removeChild(tr); }
					})
					.catch(function () { btn.disabled = false; });
			});
		});
		if (window.location.hash === '#sms') {
			var smsPreset = box.querySelector('.nca-pill[data-sms]');
			if (smsPreset) { smsPreset.click(); }
		}
	}

	/* Backfill */
	var start = document.getElementById('nca-backfill');
	if (start) {
		var status = document.getElementById('nca-backfill-status');
		var processed = 0;
		var added = 0;
		var run = function (page) {
			var fd = new FormData();
			fd.append('action', 'nca_backfill');
			fd.append('nonce', cfg.nonce);
			fd.append('page', page);
			fetch(cfg.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (res) {
					if (!res || !res.success) { throw new Error('failed'); }
					processed += res.data.processed;
					added += res.data.added;
					status.textContent = fa.format(processed) + ' سفارش بررسی شد، ' + fa.format(added) + ' سفارش به آمار اضافه شد.';
					if (res.data.done) {
						status.textContent += ' تمام شد.';
						start.disabled = false;
						start.classList.remove('is-busy');
					} else {
						run(page + 1);
					}
				})
				.catch(function () {
					status.textContent = 'ارتباط با سرور قطع شد. دوباره روی دکمه بزنید؛ سفارش‌های وارد شده تکرار نمی‌شوند.';
					start.disabled = false;
					start.classList.remove('is-busy');
				});
		};
		start.addEventListener('click', function () {
			processed = 0;
			added = 0;
			start.disabled = true;
			start.classList.add('is-busy');
			status.textContent = 'در حال بررسی سفارش‌ها';
			run(1);
		});
	}

	/* AI connection page: copy buttons and the connection self test. */
	document.querySelectorAll('[data-copy]').forEach(function (btn) {
		btn.addEventListener('click', function () {
			var el = document.querySelector(btn.getAttribute('data-copy'));
			if (!el) { return; }
			var text = el.value !== undefined ? el.value : el.textContent;
			var done = function () {
				var old = btn.textContent;
				btn.textContent = 'کپی شد';
				setTimeout(function () { btn.textContent = old; }, 1600);
			};
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text).then(done, function () { /* ignore */ });
			} else if (el.select) {
				el.select();
				try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
			}
		});
	});

	var test = document.getElementById('nca-mcp-test');
	if (test && cfg.ajax) {
		var out = document.getElementById('nca-mcp-test-out');
		var hints = {
			header: 'سرور هاست هدر Authorization را حذف می‌کند؛ در برنامه‌ها کلید را با هدر X-Sarcheshmeh-Key بفرستید یا از هاست بخواهید هدر Authorization را عبور دهد.',
			auth: 'درخواست رسید ولی احراز هویت رد شد. یک افزونه امنیتی یا فایروال احتمالا هدرها را تغییر می‌دهد.',
			loopback: 'سرور نتوانست به خودش درخواست بفرستد (loopback). این آزمایش ممکن است خطا بدهد ولی اتصال از بیرون کار کند.',
			blocked: 'آدرس پاسخ درستی نداد؛ احتمالا افزونه امنیتی یا فایروال (مثلا REST API بسته) جلوی آن را گرفته است.'
		};
		test.addEventListener('click', function () {
			var fd = new FormData();
			fd.append('action', 'nca_mcp_test');
			fd.append('nonce', cfg.nonce);
			test.disabled = true;
			out.textContent = 'در حال آزمایش';
			fetch(cfg.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (res) {
					if (!res || !res.success) { out.textContent = (res && res.data && res.data.message) || 'آزمایش انجام نشد.'; return; }
					var r = res.data.rest, q = res.data.query;
					if (r.ok) {
						out.textContent = 'اتصال سالم است: ' + fa.format(r.tools) + ' ابزار در دسترس هوش مصنوعی است.';
					} else if (q.ok) {
						out.textContent = 'آدرس اصلی جواب نداد (کد ' + fa.format(r.code) + ') ولی آدرس جایگزین سالم است؛ با کلید ثابت و آدرس جایگزین وصل شوید. ' + (hints[r.hint] || '');
					} else {
						out.textContent = 'اتصال کار نکرد (کد ' + fa.format(r.code) + '). ' + (hints[r.hint] || r.error || '');
					}
				})
				.catch(function () { out.textContent = 'ارتباط با سرور قطع شد.'; })
				.then(function () { test.disabled = false; });
		});
	}
})();
