(function () {
    'use strict';

    const ROOT = location.pathname.includes('/estudiante/') || location.pathname.includes('/arrendador/') || location.pathname.includes('/admin/') ? '../' : '';
    const THEME_KEY = 'roomiu-theme';
    const ROLE_LABELS = { estudiante: 'Estudiante', arrendador: 'Arrendador', admin: 'Administrador' };
    const ESPE_LAT = -0.9331, ESPE_LNG = -78.6157;
    let ME = null; // usuario de la sesión activa (se carga una vez por página)

    // ---- Cliente del API (fetch con cookies de sesión) ----
    async function api(url, { method = 'GET', body, isForm = false } = {}) {
        const opts = { method, credentials: 'include', headers: {} };
        if (body !== undefined) {
            if (isForm) { opts.body = body; }
            else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
        }
        const res = await fetch(url, opts);
        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }
        if (!res.ok) { const err = new Error((data && data.error) || 'Ocurrió un error inesperado.'); err.status = res.status; throw err; }
        return data;
    }

    async function loadMe() {
        try { const { user } = await api('/api/auth/me'); ME = user; } catch (e) { ME = null; }
        return ME;
    }
    function currentUser() { return ME; }

    async function requireRole(role) {
        await loadMe();
        if (!ME || ME.role !== role) { location.href = path('login.html'); return null; }
        return ME;
    }

    function byId(id) { return document.getElementById(id); }
    function money(n) { return '$' + Number(n || 0).toLocaleString('es-EC'); }
    function stars(n) { const r = Math.round(Number(n) || 0); return '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r); }
    function safe(text) { return String(text ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
    function queryParam(name) { return new URLSearchParams(location.search).get(name); }
    function pageName() { return location.pathname.split('/').pop() || 'index.html'; }
    function path(name) { return ROOT + name; }

    function toast(message) {
        const t = document.createElement('div'); t.className = 'toast'; t.textContent = message; document.body.appendChild(t);
        setTimeout(() => t.remove(), 2800);
    }
    function modal(title, html, actions) {
        document.body.classList.add('modal-open');
        const back = document.createElement('div'); back.className = 'modal-backdrop';
        back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><header><h3>${title}</h3><button class="btn-ghost" data-close>×</button></header><div class="body">${html}</div><div class="actions"></div></div>`;
        const act = back.querySelector('.actions');
        (actions || [{ label: 'Cerrar', class: 'btn-primary', action: () => {} }]).forEach(a => {
            const b = document.createElement('button'); b.className = a.class || 'btn-primary'; b.textContent = a.label;
            b.addEventListener('click', async () => { if (a.action) await a.action(back); if (!a.keepOpen) { back.remove(); document.body.classList.remove('modal-open'); } });
            act.appendChild(b);
        });
        back.addEventListener('click', e => { if (e.target === back || e.target.dataset.close !== undefined) { back.remove(); document.body.classList.remove('modal-open'); } });
        document.body.appendChild(back); return back;
    }
    function promptReason(title, onConfirm) {
        modal(title, `<label class="form-label" for="reason-input">Motivo de la acción</label><textarea id="reason-input" class="form-control" placeholder="Describe brevemente el motivo..."></textarea>`, [
            { label: 'Cancelar', class: 'btn-outline' },
            { label: 'Confirmar', class: 'btn-primary', action: (m) => onConfirm(m.querySelector('#reason-input').value.trim()) }
        ]);
    }

    // ---- Modo oscuro (preferencia guardada en el navegador, aplicada en todas las pantallas) ----
    function getTheme() { try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } }
    function setTheme(mode) {
        document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
        try { localStorage.setItem(THEME_KEY, mode === 'dark' ? 'dark' : 'light'); } catch (e) {}
        document.querySelectorAll('[data-theme-toggle]').forEach(cb => cb.checked = mode === 'dark');
    }
    function themeToggleMarkup() {
        const dark = getTheme() === 'dark';
        return `<div class="theme-switch-row"><div><strong>Modo oscuro</strong><p class="small muted">Se aplica en todas las pantallas de RoomiU.</p></div><label class="theme-switch"><input type="checkbox" data-theme-toggle ${dark ? 'checked' : ''}><span class="track"></span></label></div>`;
    }
    function wireThemeToggles(container) {
        (container || document).querySelectorAll('[data-theme-toggle]').forEach(cb => {
            cb.checked = getTheme() === 'dark';
            cb.addEventListener('change', () => setTheme(cb.checked ? 'dark' : 'light'));
        });
    }
    function renderUserChip() {
        const chips = document.querySelectorAll('[data-current-user-chip]'); if (!chips.length) return;
        if (!ME) { chips.forEach(c => c.innerHTML = ''); return; }
        const initials = (ME.avatar || ME.name || '?').slice(0, 2).toUpperCase();
        chips.forEach(c => c.innerHTML = `<span class="avatar-dot">${safe(initials)}</span>${safe(ME.name)} <span class="role-label">· ${ROLE_LABELS[ME.role] || ME.role}</span>`);
    }

    function hasLeaflet() { return typeof window.L !== 'undefined'; }
    function mapFallback(containerId, message) {
        const el = byId(containerId); if (el) el.innerHTML = `<div class="map-fallback">${safe(message || 'Mapa no disponible. Verifica tu conexión a internet.')}</div>`;
    }
    function campusIcon() { return L.divIcon({ className: 'espe-pin', html: '<span>Campus ESPE</span>', iconSize: [100, 26], iconAnchor: [50, 26] }); }
    function priceIcon(price) { return L.divIcon({ className: 'price-pin', html: `<span>${money(price)}</span>`, iconSize: [70, 26], iconAnchor: [35, 26] }); }
    function buildBaseMap(containerId, opts = {}) {
        if (!hasLeaflet()) { mapFallback(containerId); return null; }
        const el = byId(containerId); if (!el) return null;
        const map = L.map(containerId, { scrollWheelZoom: false }).setView([opts.lat || ESPE_LAT, opts.lng || ESPE_LNG], opts.zoom || 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
        if (opts.showCampus !== false) L.marker([ESPE_LAT, ESPE_LNG], { icon: campusIcon() }).addTo(map).bindPopup('Campus ESPE Latacunga');
        setTimeout(() => map.invalidateSize(), 250);
        return map;
    }
    function renderPropertyMarkers(map, list, hrefPrefix) {
        if (!map) return null;
        const layer = L.layerGroup().addTo(map);
        list.forEach(p => {
            const mk = L.marker([p.lat, p.lng], { icon: priceIcon(p.price) }).addTo(layer);
            mk.bindPopup(`<strong>${safe(p.title)}</strong><br>${money(p.price)}/mes · ${p.distance} km del campus<br><a href="${hrefPrefix}${p.id}">Ver publicación</a>`);
        });
        return layer;
    }
    function buildPickableMap(containerId, initialLat, initialLng, onPick) {
        if (!hasLeaflet()) { mapFallback(containerId, 'No se puede cargar el selector de ubicación sin conexión a internet.'); return null; }
        const lat = initialLat || ESPE_LAT, lng = initialLng || ESPE_LNG;
        const map = L.map(containerId, { scrollWheelZoom: false }).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
        L.marker([ESPE_LAT, ESPE_LNG], { icon: campusIcon() }).addTo(map).bindPopup('Campus ESPE Latacunga');
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', e => onPick(e.target.getLatLng()));
        map.on('click', e => { marker.setLatLng(e.latlng); onPick(e.latlng); });
        setTimeout(() => map.invalidateSize(), 250);
        onPick({ lat, lng });
        return map;
    }
    function openGallery(photos) {
        if (!photos || !photos.length) { modal('Fotos de la vivienda', '<p class="muted">Esta publicación aún no tiene fotos reales cargadas por el arrendador.</p>', [{ label: 'Cerrar', class: 'btn-primary' }]); return; }
        const html = `<div class="gallery-shell">
            <div class="gallery-stage">
                <img id="gallery-current" src="${photos[0]}" alt="Foto 1">
            </div>
            <div class="gallery-controls">
                <button class="btn-outline" type="button" data-gallery-nav="prev">← Anterior</button>
                <span class="gallery-counter">1 / ${photos.length}</span>
                <button class="btn-outline" type="button" data-gallery-nav="next">Siguiente →</button>
            </div>
            <div class="gallery-thumbs">${photos.map((src, i) => `<button class="gallery-thumb ${i === 0 ? 'active' : ''}" type="button" data-gallery-thumb="${i}"><img src="${src}" alt="Foto ${i + 1}"></button>`).join('')}</div>
        </div>`;
        const modalEl = modal(`Galería · ${photos.length} foto${photos.length === 1 ? '' : 's'}`, html, [{ label: 'Cerrar', class: 'btn-primary' }]);
        let current = 0;
        const stage = modalEl.querySelector('.gallery-stage');
        const image = modalEl.querySelector('#gallery-current');
        const counter = modalEl.querySelector('.gallery-counter');
        const thumbs = Array.from(modalEl.querySelectorAll('[data-gallery-thumb]'));
        const updateView = (index) => {
            current = (index + photos.length) % photos.length;
            image.classList.remove('is-visible');
            setTimeout(() => {
                image.src = photos[current];
                image.alt = `Foto ${current + 1}`;
                counter.textContent = `${current + 1} / ${photos.length}`;
                thumbs.forEach((thumb, i) => thumb.classList.toggle('active', i === current));
                image.classList.add('is-visible');
            }, 120);
        };
        modalEl.querySelector('[data-gallery-nav="prev"]').addEventListener('click', () => updateView(current - 1));
        modalEl.querySelector('[data-gallery-nav="next"]').addEventListener('click', () => updateView(current + 1));
        thumbs.forEach(thumb => thumb.addEventListener('click', () => updateView(Number(thumb.dataset.galleryThumb))));
        image.addEventListener('mouseenter', () => image.classList.add('is-zoomed'));
        image.addEventListener('mouseleave', () => image.classList.remove('is-zoomed'));
        updateView(0);
    }
    function photoOrPlaceholder(photos) {
        if (photos && photos.length) return `<img src="${photos[0]}" alt="Foto de la vivienda">`;
        return 'FOTO';
    }
    function photoClass(photos) { return (photos && photos.length) ? ' has-photo' : ''; }

    function reportFlagBadge(p) { return p.reportFlag ? '<span class="badge report-flag">⚠ Reportes múltiples</span>' : ''; }

    function propertyCard(p, mode = 'student') {
        const services = p.services.slice(0, 4).map(s => `<span class="service-pill">${safe(s)}</span>`).join('');
        const verified = (p.verified && p.owner && p.owner.verified) ? '<span class="badge success">✓ Verificado</span>' : '<span class="badge warning">Pendiente verificación</span>';
        if (mode === 'mini') {
            return `<article class="property-card-mini">
                <div class="photo-placeholder${photoClass(p.photos)}">${photoOrPlaceholder(p.photos)}</div><div class="content">
                <h3>${safe(p.title)}</h3><p class="small muted">${stars(p.rating)} ${p.rating || 'Nuevo'} (${p.reviewCount} reseñas) · ${p.distance} km</p>
                <div class="service-list">${services}</div><footer><strong>${money(p.price)}/mes</strong><a class="btn-primary" href="estudiante/detalle.html?id=${p.id}">Ver</a></footer></div></article>`;
        }
        const fav = p.isFavorite ? '♥' : '♡';
        return `<article class="property-card" data-property-id="${p.id}">
            <div class="photo-placeholder${photoClass(p.photos)}">${photoOrPlaceholder(p.photos)}</div>
            <div class="property-details">${reportFlagBadge(p)}
                <h3>${safe(p.title)}</h3>
                <p class="small muted">${stars(p.rating)} ${p.rating || 'Nuevo'} (${p.reviewCount} reseñas) · ${p.distance} km de la ESPE</p>
                <p class="small">${safe(p.address)} · ${safe(p.type)}</p>
                <div class="service-list" style="margin-top:.65rem;">${services}</div>
                <div style="margin-top:.65rem;">${verified}</div>
            </div>
            <div class="property-actions">
                <button class="btn-outline" data-action="favorite" data-id="${p.id}" aria-label="Guardar favorito">${fav}</button>
                <div style="text-align:right"><strong style="display:block;font-size:1.25rem;">${money(p.price)}/mes</strong><a class="btn-primary" href="detalle.html?id=${p.id}">VER DETALLE</a></div>
                <button class="btn-ghost small" data-action="report" data-id="${p.id}">Reportar</button>
            </div>
        </article>`;
    }

    async function toggleFavorite(propertyId) {
        if (!ME) { toast('Inicia sesión para guardar favoritos.'); return; }
        try { const r = await api(`/api/properties/${propertyId}/favorite`, { method: 'POST' }); toast(r.favorite ? 'Guardado en favoritos.' : 'Eliminado de favoritos.'); }
        catch (e) { toast(e.message); }
    }
    function reportPrompt(propertyId) {
        modal('Reportar publicación', `<label class="form-label" for="reason">Motivo del reporte</label><textarea id="reason" class="form-control" placeholder="Describe si parece fraudulenta, engañosa o inapropiada..."></textarea>`, [
            { label: 'Cancelar', class: 'btn-outline' },
            { label: 'Enviar reporte', class: 'btn-danger', action: async (m) => { const reason = m.querySelector('#reason').value.trim(); try { await api('/api/reports', { method: 'POST', body: { type: 'publicación', propertyId, reason } }); toast('Reporte enviado al administrador.'); } catch (e) { toast(e.message); } } }
        ]);
    }
    function reportReviewPrompt(propertyId, reviewId) {
        modal('Reportar reseña', `<label class="form-label" for="reason">Motivo del reporte</label><textarea id="reason" class="form-control" placeholder="Describe si la reseña parece falsa, ofensiva o duplicada..."></textarea>`, [
            { label: 'Cancelar', class: 'btn-outline' },
            { label: 'Enviar reporte', class: 'btn-danger', action: async (m) => { const reason = m.querySelector('#reason').value.trim(); try { await api('/api/reports', { method: 'POST', body: { type: 'reseña', propertyId, reviewId, reason } }); toast('Reporte enviado al administrador.'); } catch (e) { toast(e.message); } } }
        ]);
    }

    async function refreshMessageBadges() {
        const links = document.querySelectorAll('[data-messages-link]'); if (!links.length) return;
        links.forEach(a => { const old = a.querySelector('.msg-badge'); if (old) old.remove(); });
        if (!ME || ME.role === 'admin') return;
        try {
            const { unread } = await api('/api/conversations/unread-count');
            if (unread > 0) links.forEach(a => { const b = document.createElement('span'); b.className = 'msg-badge'; b.textContent = unread; a.appendChild(b); });
        } catch (e) { /* silencioso */ }
    }

    async function initCommon() {
        setTheme(getTheme());
        document.querySelectorAll('[data-logout]').forEach(a => a.addEventListener('click', async e => { e.preventDefault(); try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {} location.href = path('index.html'); }));
        await loadMe();
        const userBadges = document.querySelectorAll('[data-current-user]');
        if (userBadges.length) userBadges.forEach(el => el.textContent = ME ? ME.name : 'Invitado');
        renderUserChip();
        refreshMessageBadges();
    }

    async function initIndex() {
        try {
            const { properties } = await api('/api/properties?sort=relevance');
            const featured = properties.filter(p => p.verified).slice(0, 3);
            const holder = byId('featured-properties');
            if (holder) holder.innerHTML = featured.map(p => propertyCard(p, 'mini')).join('') || '<p class="muted">Aún no hay publicaciones activas.</p>';
            const map = buildBaseMap('home-map');
            renderPropertyMarkers(map, properties, 'estudiante/detalle.html?id=');
        } catch (e) { toast('No se pudieron cargar las publicaciones destacadas.'); }
        const form = byId('home-search-form');
        if (form) form.addEventListener('submit', e => { e.preventDefault(); const q = byId('home-search').value.trim(); location.href = 'estudiante/dashboard.html?q=' + encodeURIComponent(q); });
    }

    function initLogin() {
        let role = 'estudiante';
        document.querySelectorAll('[data-role-tab]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); role = btn.dataset.roleTab; document.querySelectorAll('[data-role-tab]').forEach(b => b.className = 'btn-outline'); btn.className = 'btn-primary'; }));
        const form = byId('login-form');
        if (form) form.addEventListener('submit', async e => {
            e.preventDefault();
            const email = byId('login-email').value.trim(); const password = byId('login-password').value;
            try {
                const { user } = await api('/api/auth/login', { method: 'POST', body: { email, password, role } });
                if (user.role === 'estudiante') location.href = 'estudiante/dashboard.html';
                else if (user.role === 'arrendador') location.href = 'arrendador/dashboard.html';
                else location.href = 'admin/dashboard.html';
            } catch (err) { toast(err.message); }
        });
        const forgot = byId('forgot-link');
        if (forgot) forgot.addEventListener('click', e => {
            e.preventDefault();
            modal('Recuperar contraseña', `<p class="muted">Ingresa el correo con el que te registraste. Si existe una cuenta, se generará un enlace de recuperación de acceso.</p><label class="form-label" for="recover-email">Correo electrónico</label><input id="recover-email" class="form-control" type="email" placeholder="correo@espe.edu.ec">`, [
                { label: 'Cancelar', class: 'btn-outline' },
                {
                    label: 'Enviar enlace', class: 'btn-primary', action: async (m) => {
                        const email = m.querySelector('#recover-email').value.trim();
                        try {
                            const r = await api('/api/auth/forgot', { method: 'POST', body: { email } });
                            toast(r.message);
                            if (r.resetToken) setTimeout(() => openResetModal(r.resetToken), 400);
                        } catch (e) { toast(e.message); }
                    }
                }
            ]);
        });
    }
    function openResetModal(token) {
        modal('Restablecer contraseña', `<p class="muted">Enlace de recuperación (RF-004) abierto para esta cuenta.</p><label class="form-label" for="new-pass">Nueva contraseña</label><input id="new-pass" type="password" class="form-control" minlength="6" placeholder="Mínimo 6 caracteres">`, [
            { label: 'Cancelar', class: 'btn-outline' },
            {
                label: 'Guardar nueva contraseña', class: 'btn-primary', action: async (m) => {
                    const pass = m.querySelector('#new-pass').value;
                    try { const r = await api('/api/auth/reset', { method: 'POST', body: { token, password: pass } }); toast(r.message); }
                    catch (e) { toast(e.message); }
                }
            }
        ]);
    }

    function initRegister() {
        let role = 'estudiante';
        const est = byId('campos-estudiante'), arr = byId('campos-arrendador');
        const uni = byId('reg-university'), career = byId('reg-career');
        document.querySelectorAll('[data-reg-role]').forEach(btn => btn.addEventListener('click', e => {
            e.preventDefault(); role = btn.dataset.regRole;
            document.querySelectorAll('[data-reg-role]').forEach(b => b.className = 'btn-outline'); btn.className = 'btn-primary';
            if (est) est.style.display = role === 'estudiante' ? 'block' : 'none';
            if (arr) arr.style.display = role === 'arrendador' ? 'block' : 'none';
            if (uni) uni.required = role === 'estudiante';
            if (career) career.required = role === 'estudiante';
        }));
        const form = byId('form-registro');
        if (form) form.addEventListener('submit', async e => {
            e.preventDefault();
            const fd = new FormData();
            fd.append('role', role);
            fd.append('name', byId('reg-name').value.trim());
            fd.append('email', byId('reg-email').value.trim());
            fd.append('password', byId('reg-password').value);
            fd.append('phone', byId('reg-phone')?.value.trim() || '');
            if (role === 'estudiante') { fd.append('university', byId('reg-university').value); fd.append('career', byId('reg-career').value); }
            if (role === 'arrendador') {
                const cedula = byId('reg-doc-cedula')?.files[0]; const predial = byId('reg-doc-predial')?.files[0];
                if (!cedula || !predial) { toast('Debes adjuntar cédula de identidad y respaldo del inmueble.'); return; }
                fd.append('cedula', cedula); fd.append('predial', predial);
            }
            try {
                const r = await api('/api/auth/register', { method: 'POST', body: fd, isForm: true });
                toast(r.message); setTimeout(() => location.href = 'login.html', 900);
            } catch (err) { toast(err.message); }
        });
    }

    async function initStudentDashboard() {
        const user = await requireRole('estudiante'); if (!user) return;
        let resultsMap = null, markersLayer = null;
        function ensureMap() { if (resultsMap || !byId('map-results')) return; resultsMap = buildBaseMap('map-results'); if (resultsMap) markersLayer = L.layerGroup().addTo(resultsMap); }

        async function refreshStats() {
            const stats = byId('student-stats'); if (!stats) return;
            try {
                const [{ user: me }, { properties: favs }, { unread }, { count: visits }] = await Promise.all([
                    api('/api/auth/me'), api('/api/properties/favorites/mine'), api('/api/conversations/unread-count'), api('/api/visits/mine')
                ]);
                stats.innerHTML = `<div class="stat-card"><h3>${me.searches || 0}</h3><p>Búsquedas guardadas</p></div><div class="stat-card"><h3>${favs.length}</h3><p>Favoritos</p></div><div class="stat-card"><h3>${unread}</h3><p>Mensajes sin leer</p></div><div class="stat-card"><h3>${visits}</h3><p>Visitas programadas</p></div>`;
            } catch (e) { /* ignorar */ }
        }
        refreshStats();

        const q = queryParam('q'); if (q && byId('filter-q')) byId('filter-q').value = q;

        function collectFilters() {
            const services = Array.from(document.querySelectorAll('[data-service-filter]:checked')).map(x => x.value);
            const params = new URLSearchParams({
                q: byId('filter-q')?.value || '', min: byId('filter-min')?.value || 0, max: byId('filter-max')?.value || 999999,
                type: byId('filter-type')?.value || '', dist: byId('filter-dist')?.value || 999, rating: byId('filter-rating')?.value || 0,
                sort: byId('sort-results')?.value || 'relevance', services: services.join(',')
            });
            return params;
        }
        async function filterProperties() {
            try {
                const { properties } = await api('/api/properties?' + collectFilters().toString());
                renderResults(properties);
            } catch (e) { toast('No se pudieron cargar los resultados.'); }
        }
        function renderResults(list) {
            const count = byId('result-count'); if (count) count.textContent = `${list.length} resultados encontrados`;
            const out = byId('properties-results'); if (out) out.innerHTML = list.length ? list.map(p => propertyCard(p)).join('') : '<div class="alert warning">No hay viviendas con esos filtros. Intenta ampliar precio, distancia o servicios.</div>';
            renderMap(list);
        }
        function renderMap(list) {
            ensureMap(); if (!markersLayer) return;
            markersLayer.clearLayers();
            list.forEach(p => {
                const mk = L.marker([p.lat, p.lng], { icon: priceIcon(p.price) }).addTo(markersLayer);
                mk.bindPopup(`<strong>${safe(p.title)}</strong><br>${money(p.price)}/mes · ${p.distance} km del campus<br><a href="detalle.html?id=${p.id}">Ver publicación</a>`);
            });
            if (resultsMap) setTimeout(() => resultsMap.invalidateSize(), 150);
        }
        filterProperties();

        const filterBox = byId('student-filter-form');
        if (filterBox) {
            filterBox.addEventListener('input', filterProperties);
            filterBox.addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/profile/searches', { method: 'POST' }); } catch (err) {} toast('Búsqueda guardada.'); refreshStats(); });
        }
        const sort = byId('sort-results'); if (sort) sort.addEventListener('change', filterProperties);

        document.addEventListener('click', async e => {
            const btn = e.target.closest('[data-action]'); if (!btn) return;
            if (btn.dataset.action === 'favorite') { await toggleFavorite(btn.dataset.id); filterProperties(); }
            if (btn.dataset.action === 'report') reportPrompt(btn.dataset.id);
            if (btn.dataset.action === 'show-favorites') { e.preventDefault(); showFavorites(); }
            if (btn.dataset.action === 'show-search') { e.preventDefault(); location.hash = 'buscar'; byId('search-section').style.display = 'block'; byId('favorites-section').style.display = 'none'; byId('profile-section').style.display = 'none'; }
            if (btn.dataset.action === 'show-profile') { e.preventDefault(); showProfile(); }
        });

        async function showFavorites() {
            const section = byId('favorites-section'), search = byId('search-section'), profile = byId('profile-section');
            search.style.display = 'none'; profile.style.display = 'none'; section.style.display = 'block';
            try {
                const { properties } = await api('/api/properties/favorites/mine');
                byId('favorites-list').innerHTML = properties.length ? properties.map(p => propertyCard(p)).join('') : '<div class="alert info">Todavía no tienes viviendas favoritas.</div>';
            } catch (e) { toast('No se pudieron cargar tus favoritos.'); }
        }

        async function showProfile() {
            byId('search-section').style.display = 'none'; byId('favorites-section').style.display = 'none'; byId('profile-section').style.display = 'block';
            const { user: fresh } = await api('/api/auth/me');
            const docs = fresh.docs || {};
            byId('profile-panel').innerHTML = `<div class="card"><h3>Mi perfil</h3><p class="muted">Has iniciado sesión como <strong>${safe(fresh.name)}</strong> · Rol: <strong>${ROLE_LABELS.estudiante}</strong></p><p class="muted">Correo: ${safe(fresh.email)} (no editable). Universidad: ${safe(fresh.university || '')}</p><div class="form-row"><div class="form-group"><label class="form-label">Nombre</label><input id="profile-name" class="form-control" value="${safe(fresh.name)}"></div><div class="form-group"><label class="form-label">Teléfono</label><input id="profile-phone" class="form-control" value="${safe(fresh.phone || '')}"></div></div><div class="form-group"><label class="form-label">Carrera</label><input id="profile-career" class="form-control" value="${safe(fresh.career || '')}"></div><button class="btn-primary" id="save-profile">Guardar cambios</button></div>
            <div class="card" style="margin-top:1rem;">${themeToggleMarkup()}</div>
            <div class="card" style="margin-top:1rem;"><h3>Documentos para formalizar contrato</h3><p class="muted">Matrícula, récord policial y rol de pagos del representante.</p>
            <div class="form-row" style="margin-top:.75rem;"><div class="form-group"><label class="form-label">Matrícula ${docs.matricula ? '<span class="badge success">Subida</span>' : '<span class="badge warning">Pendiente</span>'}</label><input type="file" id="doc-matricula" class="form-control" accept="image/*,.pdf"></div><div class="form-group"><label class="form-label">Récord policial ${docs.record ? '<span class="badge success">Subida</span>' : '<span class="badge warning">Pendiente</span>'}</label><input type="file" id="doc-record" class="form-control" accept="image/*,.pdf"></div></div>
            <div class="form-group"><label class="form-label">Rol de pagos del representante ${docs.rolPagos ? '<span class="badge success">Subida</span>' : '<span class="badge warning">Pendiente</span>'}</label><input type="file" id="doc-rolpagos" class="form-control" accept="image/*,.pdf"></div>
            <button class="btn-outline" id="save-docs" style="margin-top:.5rem;">Guardar documentos</button></div>`;
            wireThemeToggles(byId('profile-panel'));
            byId('save-profile').onclick = async () => {
                try { await api('/api/profile', { method: 'PUT', body: { name: byId('profile-name').value, phone: byId('profile-phone').value, career: byId('profile-career').value } }); toast('Perfil actualizado.'); }
                catch (e) { toast(e.message); }
            };
            byId('save-docs').onclick = async () => {
                const fd = new FormData();
                const m = byId('doc-matricula').files[0], r = byId('doc-record').files[0], rp = byId('doc-rolpagos').files[0];
                if (m) fd.append('matricula', m); if (r) fd.append('record', r); if (rp) fd.append('rolPagos', rp);
                try { await api('/api/profile/docs', { method: 'POST', body: fd, isForm: true }); toast('Documentos actualizados.'); showProfile(); }
                catch (e) { toast(e.message); }
            };
        }
    }

    async function initDetail() {
        const user = await requireRole('estudiante'); if (!user) return;
        const id = queryParam('id'); if (!id) { location.href = 'dashboard.html'; return; }
        let p;
        try { ({ property: p } = await api('/api/properties/' + id)); } catch (e) { toast('No se encontró la publicación.'); setTimeout(() => location.href = 'dashboard.html', 800); return; }

        const detail = byId('property-detail'); if (!detail) return;
        const photos = p.photos || [];
        const galleryMain = photos[0] ? `<img src="${photos[0]}" alt="Foto principal">` : 'FOTO PRINCIPAL';
        const gallerySide2 = photos[1] ? `<img src="${photos[1]}" alt="Foto 2">` : 'FOTO 2';
        const gallerySide3 = photos[2] ? `<img src="${photos[2]}" alt="Foto 3">` : 'FOTO 3';
        const extraCount = photos.length > 3 ? photos.length - 3 : 0;
        detail.innerHTML = `
            <section class="detail-gallery" data-gallery-open style="cursor:pointer" title="Ver todas las fotos"><div class="photo-placeholder${photos[0] ? ' has-photo' : ''}">${galleryMain}</div><div class="side"><div class="photo-placeholder${photos[1] ? ' has-photo' : ''}">${gallerySide2}</div><div class="photo-placeholder${photos[2] ? ' has-photo' : ''}" style="position:relative">${gallerySide3}${extraCount > 0 ? `<span class="gallery-more">+${extraCount} fotos</span>` : ''}</div></div></section>
            <section class="detail-layout">
                <div>
                    <div class="card" style="margin-bottom:1rem;"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><h1>${safe(p.title)}</h1><p class="muted">${stars(p.rating)} ${p.rating || 'Nuevo'} (${p.reviewCount} reseñas) · ${p.distance} km del campus</p><p>${safe(p.address)}</p></div><div style="text-align:right"><h2>${money(p.price)}<span class="small muted">/mes</span></h2><button class="btn-outline" data-detail-action="favorite">${p.isFavorite ? '♥ Guardado' : '♡ Guardar'}</button></div></div></div>
                    <div class="card" style="margin-bottom:1rem"><h3>Descripción</h3><p>${safe(p.description)}</p></div>
                    <div class="card" style="margin-bottom:1rem"><h3>Servicios incluidos</h3><div class="service-list" style="margin-top:.7rem">${p.services.map(s => `<span class="service-pill">${safe(s)}</span>`).join('')}</div></div>
                    <div class="card" style="margin-bottom:1rem"><h3>Reseñas y reputación</h3><div id="reviews-list" style="margin-top:1rem"></div><form id="review-form" style="margin-top:1rem"><div class="form-row"><div class="form-group"><label class="form-label">Calificación</label><select id="review-rating" class="form-control"><option value="5">5 - Excelente</option><option value="4">4 - Buena</option><option value="3">3 - Regular</option><option value="2">2 - Mala</option><option value="1">1 - Muy mala</option></select></div><div class="form-group"><label class="form-label">Comentario</label><input id="review-text" class="form-control" placeholder="Escribe tu experiencia"></div></div><button class="btn-primary">Publicar reseña</button><p class="help-text">Solo puedes reseñar viviendas con las que hayas tenido contacto (mensaje o visita).</p></form></div>
                    <div class="card"><h3>Contrato y pago</h3><p class="muted">Flujo de contrato digital y cobro por transferencia o tarjeta de débito dentro de la aplicación.</p><div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem"><button class="btn-outline" data-detail-action="contract">Generar contrato</button><button class="btn-primary" data-detail-action="pay">Registrar pago</button></div></div>
                </div>
                <aside class="card sticky-card"><h3>Información del arrendador</h3><div style="display:flex;align-items:center;gap:1rem;margin:1rem 0"><div class="badge info" style="width:54px;height:54px;border-radius:50%;justify-content:center;font-size:1rem">${safe((p.owner && p.owner.avatar) || 'AR')}</div><div><strong>${safe(p.owner ? p.owner.name : '')}</strong><p class="small muted">${stars(p.owner ? p.owner.rating : 0)} ${(p.owner && p.owner.rating) || 'Sin calificar'} en general</p><p class="small muted">${p.owner && p.owner.verified ? '✓ Verificado por administrador' : 'Pendiente de verificación'}</p></div></div><button class="btn-primary" style="width:100%;margin-bottom:.75rem" data-detail-action="message">Enviar mensaje</button><button class="btn-outline" style="width:100%;margin-bottom:.75rem" data-detail-action="visit">Solicitar visita</button><button class="btn-ghost" style="width:100%;margin-bottom:1rem" data-detail-action="report">Reportar publicación</button><h4>Ubicación</h4><div id="detail-map" class="real-map" style="min-height:220px;margin:.5rem 0"></div><p class="small muted">${safe(p.address)}</p></aside>
            </section>`;
        const detailMap = buildBaseMap('detail-map', { lat: p.lat, lng: p.lng, zoom: 15 });
        renderPropertyMarkers(detailMap, [p], '#');

        async function renderReviews() {
            const list = byId('reviews-list');
            try {
                const { reviews } = await api(`/api/properties/${p.id}/reviews`);
                list.innerHTML = reviews.length ? reviews.map(r => `<div class="review-card"><div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><strong>${safe(r.userName)}</strong><span class="muted small">${stars(r.rating)} · ${r.createdAt}</span></div>${r.reportFlag ? '<span class="badge report-flag">⚠ Reportes múltiples</span>' : ''}<p>${safe(r.text)}</p><button class="btn-ghost small" data-review-report="${r.id}">Reportar reseña</button></div>`).join('') : '<div class="alert info">Aún no hay reseñas.</div>';
            } catch (e) { list.innerHTML = '<div class="alert warning">No se pudieron cargar las reseñas.</div>'; }
        }
        renderReviews();

        document.addEventListener('click', async e => {
            const rBtn = e.target.closest('[data-review-report]'); if (rBtn) { reportReviewPrompt(p.id, rBtn.dataset.reviewReport); return; }
            if (e.target.closest('[data-gallery-open]')) { openGallery(photos); return; }
            const btn = e.target.closest('[data-detail-action]'); if (!btn) return;
            const action = btn.dataset.detailAction;
            if (action === 'favorite') { await toggleFavorite(p.id); location.reload(); }
            if (action === 'report') reportPrompt(p.id);
            if (action === 'message') createOrOpenConversation(p.id, 'Hola, estoy interesado/a en esta vivienda. ¿Sigue disponible?');
            if (action === 'visit') scheduleVisit(p.id);
            if (action === 'contract') generateContract(p);
            if (action === 'pay') simulatePayment(p);
        });

        byId('review-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                await api(`/api/properties/${p.id}/reviews`, { method: 'POST', body: { rating: byId('review-rating').value, text: byId('review-text').value.trim() } });
                toast('Reseña publicada y promedio actualizado.'); renderReviews();
            } catch (err) { toast(err.message); }
        });
    }

    async function createOrOpenConversation(propertyId, initialText) {
        try { const r = await api('/api/conversations', { method: 'POST', body: { propertyId, text: initialText } }); location.href = 'mensajes.html?c=' + r.conversationId; }
        catch (e) { toast(e.message); }
    }
    function scheduleVisit(propertyId) {
        modal('Solicitar visita', `<div class="form-row"><div class="form-group"><label class="form-label">Fecha</label><input type="date" id="visit-date" class="form-control"></div><div class="form-group"><label class="form-label">Hora</label><input type="time" id="visit-time" class="form-control" value="18:00"></div></div>`, [
            { label: 'Cancelar', class: 'btn-outline' },
            { label: 'Guardar visita', class: 'btn-primary', action: async (m) => { try { await api('/api/visits', { method: 'POST', body: { propertyId, date: m.querySelector('#visit-date').value, time: m.querySelector('#visit-time').value } }); toast('Visita programada.'); } catch (e) { toast(e.message); } } }
        ]);
    }
    function generateContract(p) {
        const user = currentUser();
        modal('Contrato digital generado', `<p class="muted">Plantilla de contrato de arrendamiento estudiantil.</p><div class="alert info"><strong>Arrendador:</strong> ${safe(p.owner ? p.owner.name : '')}<br><strong>Arrendatario:</strong> ${safe(user.name)}<br><strong>Inmueble:</strong> ${safe(p.title)}<br><strong>Canon mensual:</strong> ${money(p.price)}<br><strong>Método:</strong> transferencia bancaria o tarjeta de débito. No se aceptan pagos en efectivo.</div><p>Este flujo representa la formalización segura del arriendo dentro de RoomiU.</p>`, [{ label: 'Cerrar', class: 'btn-primary' }]);
    }
    function simulatePayment(p) {
        modal('Registrar pago de arriendo', `<p>Selecciona un método de pago para registrar un comprobante.</p><select id="pay-method" class="form-control"><option>Transferencia bancaria</option><option>Tarjeta de débito</option></select><p style="margin-top:1rem"><strong>Total:</strong> ${money(p.price)}</p>`, [
            { label: 'Cancelar', class: 'btn-outline' },
            { label: 'Confirmar pago', class: 'btn-success', action: async (m) => { try { await api('/api/payments', { method: 'POST', body: { propertyId: p.id, amount: p.price, method: m.querySelector('#pay-method').value } }); toast('Pago registrado y comprobante generado.'); } catch (e) { toast(e.message); } } }
        ]);
    }

    async function initMessages(role = 'estudiante') {
        const user = await requireRole(role); if (!user) return;
        const list = byId('conversation-list'), thread = byId('chat-panel');
        let activeId = queryParam('c');

        async function renderList() {
            try {
                const { conversations } = await api('/api/conversations');
                if (!list) return;
                if (!conversations.length) {
                    list.innerHTML = '<p class="muted small">Aún no tienes conversaciones.</p>';
                    if (thread) thread.innerHTML = '<div class="empty-state"><div><h3>Sin conversaciones</h3><p class="muted">Tu historial aparecerá aquí cuando inicies o recibas mensajes.</p></div></div>';
                    activeId = null;
                    return;
                }
                const selected = activeId && conversations.some(c => c.id === activeId) ? activeId : conversations[0].id;
                activeId = selected;
                list.innerHTML = conversations.map(c => `<button class="conversation-item ${c.id === activeId ? 'active' : ''}" data-open-conv="${c.id}">
                    <div class="conversation-main">
                        <strong>${safe(c.otherName)}</strong>
                        ${c.unread ? '<span class="msg-badge">1</span>' : ''}
                    </div>
                    <p class="small muted">${safe(c.propertyTitle || '')}</p>
                    <p class="small">${safe((c.lastMessage || '').slice(0, 80))}</p>
                </button>`).join('');
                if (thread && (!thread.dataset.currentConversation || thread.dataset.currentConversation !== activeId)) {
                    await renderThread(activeId);
                }
            } catch (e) { toast('No se pudieron cargar tus conversaciones.'); }
        }

        async function renderThread(id) {
            activeId = id;
            const url = new URL(location.href);
            url.searchParams.set('c', id);
            history.replaceState({}, '', `${url.pathname}${url.search}`);
            try {
                const { conversation, messages } = await api('/api/conversations/' + id);
                if (!thread) return;
                thread.dataset.currentConversation = id;
                thread.innerHTML = `<div class="chat-thread">
                    <div class="chat-thread-header">
                        <h3>${safe(conversation.otherName)}</h3>
                        <p class="small muted">${safe(conversation.propertyTitle || '')}</p>
                    </div>
                    <div class="message-log" id="message-log">${messages.length ? messages.map(m => `<div class="message-bubble ${m.mine ? 'mine' : ''}"><p>${safe(m.text)}</p><span class="message-meta">${safe(m.at)}</span></div>`).join('') : '<p class="muted small">Aún no hay mensajes en esta conversación.</p>'}</div>
                    <form id="reply-form" class="reply-form">
                        <input id="reply-text" class="form-control" placeholder="Escribe una respuesta...">
                        <button class="btn-primary" type="submit">Enviar</button>
                    </form>
                </div>`;
                const log = byId('message-log'); if (log) log.scrollTop = log.scrollHeight;
                byId('reply-form')?.addEventListener('submit', async e => {
                    e.preventDefault();
                    const text = byId('reply-text').value.trim();
                    if (!text) return;
                    try {
                        await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { text } });
                        await renderThread(id);
                        await renderList();
                    } catch (err) { toast(err.message); }
                });
                refreshMessageBadges();
            } catch (e) { toast('No se pudo abrir la conversación.'); }
        }

        list?.addEventListener('click', async e => {
            const b = e.target.closest('[data-open-conv]');
            if (b) {
                await renderThread(b.dataset.openConv);
                await renderList();
            }
        });

        await renderList();
    }

    async function initLandlordDashboard() {
        const user = await requireRole('arrendador'); if (!user) return;
        const alertEl = byId('landlord-alert');
        async function renderAlert() {
            const { user: fresh } = await api('/api/auth/me');
            let html = '';
            if (!fresh.verified) html += '<div class="alert warning"><strong>Cuenta pendiente de verificación.</strong> Puedes preparar publicaciones, pero no se mostrarán públicamente hasta que el administrador apruebe tus documentos.</div>';
            if (fresh.verificationNotice && !fresh.verificationNotice.seen) {
                const ok = fresh.verificationNotice.result === 'approved';
                html += `<div class="alert ${ok ? 'success' : 'danger'}"><strong>${ok ? 'Tu cuenta fue verificada.' : 'Tu verificación fue rechazada.'}</strong> ${ok ? 'Ya puedes activar y publicar tus viviendas.' : 'Revisa tus documentos y contacta al administrador.'}</div>`;
                api('/api/profile/verification-seen', { method: 'POST' }).catch(() => {});
            }
            if (alertEl) alertEl.innerHTML = html;
        }
        renderAlert();

        async function render() {
            try {
                const [{ properties: mine }, { unread }] = await Promise.all([api('/api/properties/mine'), api('/api/conversations/unread-count')]);
                const active = mine.filter(p => p.active).length; const monthly = mine.filter(p => p.active).reduce((a, b) => a + b.price, 0);
                const ownerRating = mine.length ? mine[0].owner.rating : 0;
                byId('landlord-stats').innerHTML = `<div class="stat-card"><h3>${active}</h3><p>Propiedades activas</p></div><div class="stat-card"><h3>${mine.length}</h3><p>Total publicadas</p></div><div class="stat-card"><h3>${unread}</h3><p>Mensajes sin leer</p></div><div class="stat-card"><h3>${money(monthly)}</h3><p>Ingresos potenciales</p></div><div class="stat-card"><h3>${ownerRating || '—'}</h3><p>Calificación promedio</p></div>`;
                const list = byId('landlord-properties');
                list.innerHTML = mine.length ? mine.map(p => `<article class="property-card"><div class="photo-placeholder${photoClass(p.photos)}">${photoOrPlaceholder(p.photos)}</div><div class="property-details"><h3>${safe(p.title)}</h3><p class="small muted">${safe(p.type)} · ${p.distance} km · ${money(p.price)}/mes</p><p>${p.active ? '<span class="badge success">Activo</span>' : '<span class="badge warning">Inactivo</span>'} ${p.verified ? '<span class="badge success">Verificado</span>' : '<span class="badge warning">Pendiente verificación</span>'} ${reportFlagBadge(p)}</p><div class="service-list" style="margin-top:.5rem">${p.services.map(s => `<span class="service-pill">${safe(s)}</span>`).join('')}</div></div><div class="property-actions"><a class="btn-outline" href="publicar.html?id=${p.id}">Editar</a><button class="${p.active ? 'btn-outline' : 'btn-primary'}" data-landlord-action="toggle" data-id="${p.id}">${p.active ? 'Desactivar' : 'Activar'}</button><button class="btn-danger" data-landlord-action="delete" data-id="${p.id}">Eliminar</button></div></article>`).join('') : '<div class="alert info">Aún no tienes propiedades.</div>';
            } catch (e) { toast('No se pudieron cargar tus propiedades.'); }
        }

        document.addEventListener('click', async e => {
            const tabBtn = e.target.closest('[data-action="show-properties"], [data-action="show-profile"], [data-action="show-reviews"]');
            if (tabBtn) {
                e.preventDefault();
                const tab = tabBtn.dataset.action;
                byId('properties-section').style.display = tab === 'show-properties' ? 'block' : 'none';
                byId('landlord-reviews-section').style.display = tab === 'show-reviews' ? 'block' : 'none';
                byId('landlord-profile-section').style.display = tab === 'show-profile' ? 'block' : 'none';
                document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
                tabBtn.closest('li')?.classList.add('active');
                if (tab === 'show-profile') renderLandlordProfile();
                if (tab === 'show-reviews') renderLandlordReviews();
                return;
            }
            const b = e.target.closest('[data-landlord-action]'); if (!b) return;
            if (b.dataset.landlordAction === 'toggle') { try { await api(`/api/properties/${b.dataset.id}/toggle`, { method: 'PATCH' }); toast('Estado actualizado.'); render(); } catch (err) { toast(err.message); } }
            if (b.dataset.landlordAction === 'delete') { if (confirm('¿Eliminar definitivamente esta publicación?')) { try { await api(`/api/properties/${b.dataset.id}`, { method: 'DELETE' }); toast('Publicación eliminada.'); render(); } catch (err) { toast(err.message); } } }
        });

        async function renderLandlordReviews() {
            try {
                const { rating, reviews } = await api('/api/landlord/reviews');
                byId('landlord-reviews-panel').innerHTML = `<div class="card"><h3>Historial de reseñas</h3><p class="muted">Calificación general: ${stars(rating)} ${rating || 'Sin calificar'} (${reviews.length} reseñas). Se conservan aunque elimines una publicación.</p>
                <div style="margin-top:1rem">${reviews.length ? reviews.map(r => `<div class="review-card"><div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><strong>${safe(r.propertyTitle || 'Publicación')}</strong><span class="muted small">${stars(r.rating)} · ${r.createdAt}</span></div><p class="small muted">${r.propertyDeleted ? '<span class="badge warning">Publicación eliminada</span> ' : ''}Por ${safe(r.userName)}</p><p>${safe(r.text)}</p></div>`).join('') : '<div class="alert info">Aún no tienes reseñas.</div>'}</div></div>`;
            } catch (e) { toast('No se pudo cargar el historial.'); }
        }
        async function renderLandlordProfile() {
            const { user: fresh } = await api('/api/auth/me');
            byId('landlord-profile-panel').innerHTML = `<div class="card"><h3>Mi perfil</h3><p class="muted">Has iniciado sesión como <strong>${safe(fresh.name)}</strong> · Rol: <strong>${ROLE_LABELS.arrendador}</strong></p><p class="muted">Correo: ${safe(fresh.email)} (no editable).</p><div class="form-row"><div class="form-group"><label class="form-label">Nombre</label><input id="lp-name" class="form-control" value="${safe(fresh.name)}"></div><div class="form-group"><label class="form-label">Teléfono</label><input id="lp-phone" class="form-control" value="${safe(fresh.phone || '')}"></div></div><p class="small muted">${fresh.verified ? '✓ Cuenta verificada' : 'Pendiente de verificación por el administrador'}</p><button class="btn-primary" id="lp-save">Guardar cambios</button></div>
            <div class="card" style="margin-top:1rem;"><h3>Documentos de verificación</h3><p class="muted">Sube tus documentos para que el administrador revise tu cuenta.</p><div class="form-row" style="margin-top:.75rem;"><div class="form-group"><label class="form-label">Cédula de identidad ${fresh.docs?.cedula ? '<span class="badge success">Subida</span>' : '<span class="badge warning">Pendiente</span>'}</label><input type="file" id="lp-doc-cedula" class="form-control" accept="image/*,.pdf"></div><div class="form-group"><label class="form-label">Escritura / predial ${fresh.docs?.predial ? '<span class="badge success">Subida</span>' : '<span class="badge warning">Pendiente</span>'}</label><input type="file" id="lp-doc-predial" class="form-control" accept="image/*,.pdf"></div></div><button class="btn-outline" id="lp-save-docs" style="margin-top:.5rem;">Guardar documentos</button></div>
            <div class="card" style="margin-top:1rem;">${themeToggleMarkup()}</div>`;
            byId('lp-save').onclick = async () => { try { await api('/api/profile', { method: 'PUT', body: { name: byId('lp-name').value.trim(), phone: byId('lp-phone').value.trim() } }); toast('Perfil actualizado.'); } catch (e) { toast(e.message); } };
            byId('lp-save-docs').onclick = async () => {
                const fd = new FormData();
                const cedula = byId('lp-doc-cedula').files[0];
                const predial = byId('lp-doc-predial').files[0];
                if (cedula) fd.append('cedula', cedula);
                if (predial) fd.append('predial', predial);
                try { await api('/api/profile/docs', { method: 'POST', body: fd, isForm: true }); toast('Documentos enviados para revisión.'); renderLandlordProfile(); }
                catch (e) { toast(e.message); }
            };
            wireThemeToggles(byId('landlord-profile-panel'));
        }
        render();
    }

    async function initPublish() {
        const user = await requireRole('arrendador'); if (!user) return;
        const editId = queryParam('id');
        let p = null;
        if (editId) {
            try { const { properties } = await api('/api/properties/mine'); p = properties.find(x => x.id === editId) || null; }
            catch (e) { /* ignorar */ }
        }
        const noteEl = byId('publish-verification-note');
        if (noteEl) noteEl.innerHTML = user.verified
            ? '<div class="alert success">Tu cuenta está verificada: la publicación quedará activa de inmediato.</div>'
            : '<div class="alert warning">Tu cuenta aún no está verificada por el administrador. Puedes guardar la publicación, pero no se mostrará públicamente hasta la aprobación.</div>';

        // existingPhotos: [{id?, path, isNew, file}] — id sólo existe para fotos ya guardadas en el servidor.
        let existingPhotos = p ? (p.photos || []).map((path, i) => ({ key: 'existing-' + i, path, existingId: (p.photoIds && p.photoIds[i]) || null })) : [];
        let newFiles = [];
        function renderPhotoPreview() {
            const box = byId('photos-preview'); if (!box) return;
            const items = [
                ...existingPhotos.map(ph => ({ key: ph.key, src: ph.path, kind: 'existing' })),
                ...newFiles.map((f, i) => ({ key: 'new-' + i, src: URL.createObjectURL(f), kind: 'new' }))
            ];
            box.innerHTML = items.map(it => `<div class="photo-thumb"><img src="${it.src}" alt="Foto"><button type="button" class="remove-photo" data-remove-photo="${it.key}">×</button></div>`).join('');
        }
        byId('photos-preview')?.addEventListener('click', e => {
            const btn = e.target.closest('[data-remove-photo]'); if (!btn) return;
            const key = btn.dataset.removePhoto;
            if (key.startsWith('existing-')) existingPhotos = existingPhotos.filter(ph => ph.key !== key);
            else { const idx = Number(key.replace('new-', '')); newFiles.splice(idx, 1); }
            renderPhotoPreview();
        });
        byId('prop-photos-input')?.addEventListener('change', e => {
            const room = 10 - (existingPhotos.length + newFiles.length);
            if (room <= 0) { toast('Ya alcanzaste el máximo de 10 fotos.'); e.target.value = ''; return; }
            newFiles = newFiles.concat(Array.from(e.target.files).slice(0, room));
            renderPhotoPreview(); e.target.value = '';
        });

        let pickedLat = p ? p.lat : ESPE_LAT, pickedLng = p ? p.lng : ESPE_LNG;
        buildPickableMap('publish-map', pickedLat, pickedLng, (latlng) => {
            pickedLat = latlng.lat; pickedLng = latlng.lng;
        });

        if (p) {
            byId('publish-title').textContent = 'EDITAR PROPIEDAD';
            byId('prop-title').value = p.title; byId('prop-description').value = p.description; byId('prop-type').value = p.type;
            byId('prop-price').value = p.price; byId('prop-distance').value = p.distance; byId('prop-address').value = p.address; byId('prop-bedrooms').value = p.bedrooms || 1;
            document.querySelectorAll('[data-prop-service]').forEach(c => c.checked = p.services.includes(c.value));
            renderPhotoPreview();
        }

        const form = byId('publish-form');
        form?.addEventListener('submit', async e => {
            e.preventDefault();
            const services = Array.from(document.querySelectorAll('[data-prop-service]:checked')).map(x => x.value);
            if (services.length < 1) { toast('Selecciona al menos un servicio.'); return; }
            const totalPhotos = existingPhotos.length + newFiles.length;
            if (totalPhotos < 2 || totalPhotos > 10) { toast('RF-007: debes tener entre 2 y 10 fotos de la vivienda.'); return; }
            const title = byId('prop-title').value.trim(), description = byId('prop-description').value.trim(), address = byId('prop-address').value.trim(), price = byId('prop-price').value;
            if (!title || !description || !price || !address) { toast('Completa todos los campos obligatorios.'); return; }

            const fd = new FormData();
            fd.append('title', title); fd.append('description', description); fd.append('type', byId('prop-type').value);
            fd.append('price', price); fd.append('distance', byId('prop-distance').value || 0); fd.append('address', address);
            fd.append('bedrooms', byId('prop-bedrooms').value || 1); fd.append('lat', pickedLat); fd.append('lng', pickedLng);
            fd.append('services', JSON.stringify(services));
            newFiles.forEach(f => fd.append('photos', f));

            try {
                if (p) {
                    fd.append('keepPhotoIds', JSON.stringify(existingPhotos.map(ph => ph.existingId).filter(Boolean)));
                    await api('/api/properties/' + p.id, { method: 'PUT', body: fd, isForm: true });
                    toast('Publicación actualizada correctamente.');
                } else {
                    const r = await api('/api/properties', { method: 'POST', body: fd, isForm: true });
                    toast(r.message);
                }
                setTimeout(() => location.href = 'dashboard.html', 700);
            } catch (err) { toast(err.message); }
        });
        byId('save-draft')?.addEventListener('click', () => toast('Recuerda guardar el formulario con "Enviar / guardar publicación" para conservar los cambios.'));
    }

    async function initAdmin() {
        const admin = await requireRole('admin'); if (!admin) return;

        byId('admin-profile-panel').innerHTML = `<h3>Mi perfil</h3><p class="muted">Has iniciado sesión como <strong>${safe(admin.name)}</strong> · Rol: <strong>${ROLE_LABELS.admin}</strong></p><p class="muted small">Correo: ${safe(admin.email)}</p><hr style="border:none;border-top:1px solid var(--border-color);margin:1rem 0;">${themeToggleMarkup()}`;
        wireThemeToggles(byId('admin-profile-panel'));

        async function render() {
            try {
                const [stats, pending, reports, users, log] = await Promise.all([
                    api('/api/admin/stats'), api('/api/admin/pending-landlords'), api('/api/admin/reports'), api('/api/admin/users'), api('/api/admin/audit-log')
                ]);
                byId('admin-stats').innerHTML = `<div class="stat-card"><h3>${stats.totalUsers}</h3><p>Usuarios totales</p></div><div class="stat-card"><h3>${stats.verifiedLandlords}</h3><p>Arrendadores verificados</p></div><div class="stat-card"><h3>${stats.activeProperties}</h3><p>Publicaciones activas</p></div><div class="stat-card"><h3>${stats.pendingReports}</h3><p>Reportes pendientes</p></div><div class="stat-card"><h3>${stats.recentRegistrations}</h3><p>Nuevos registros (7 días)</p></div>`;
                const bar = (label, part, total) => { const pct = total ? Math.round(part / total * 100) : 0; return `<div class="metric-bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span>${part}/${total} (${pct}%)</span></div>`; };
                const metricsEl = byId('admin-metrics');
                if (metricsEl) metricsEl.innerHTML = `<h2>Resumen visual</h2><div class="metric-bars">${bar('Arrendadores verificados', stats.verifiedLandlords, stats.totalLandlords)}${bar('Publicaciones activas', stats.activeProperties, stats.totalProperties)}${bar('Reportes resueltos', stats.resolvedReports, stats.totalReports)}${bar('Estudiantes registrados', stats.students, stats.totalUsers)}</div>`;

                byId('pending-landlords').innerHTML = pending.landlords.length ? pending.landlords.map(u => `<div class="user-row"><div><strong>${safe(u.name)}</strong><p class="small muted">${safe(u.email)} · docs: cédula ${u.docs.cedula ? '✓' : '—'}, predial ${u.docs.predial ? '✓' : '—'}</p></div><div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap"><button class="btn-outline" data-admin-action="view-docs" data-id="${u.id}">Ver documentos</button><button class="btn-success" data-admin-action="approve" data-id="${u.id}">Aprobar</button><button class="btn-danger" data-admin-action="reject" data-id="${u.id}">Rechazar</button></div></div>`).join('') : '<div class="alert success">No hay solicitudes pendientes.</div>';

                byId('reports-list').innerHTML = reports.reports.length ? reports.reports.map(r => `<div class="report-card"><strong>${safe(r.type)}: ${safe(r.propertyTitle)}</strong> ${r.status === 'pendiente' ? '<span class="badge danger">Pendiente</span>' : '<span class="badge success">Revisado</span>'} ${r.reportCount >= 2 ? `<span class="badge report-flag">⚠ ${r.reportCount} reportes</span>` : ''}<p class="small muted">${safe(r.reason)}</p><div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap"><button class="btn-outline" data-report-action="keep" data-id="${r.id}">Mantener</button><button class="btn-danger" data-report-action="hide" data-id="${r.id}">Ocultar</button><button class="btn-danger" data-report-action="delete" data-id="${r.id}">Eliminar contenido</button></div></div>`).join('') : '<div class="alert info">No hay reportes registrados.</div>';

                byId('users-table').innerHTML = users.users.map(u => `<tr><td>${safe(u.name)}</td><td>${safe(u.role)}</td><td>${u.active ? '<span class="badge success">Activo</span>' : '<span class="badge danger">Inactivo</span>'}</td><td>${u.role === 'arrendador' ? (u.verified ? '<span class="badge success">Verificado</span>' : '<span class="badge warning">Pendiente</span>') : '<span class="small muted">—</span>'}</td><td style="display:flex;gap:.5rem;flex-wrap:wrap">${u.role === 'arrendador' ? `<button class="btn-outline" data-admin-action="view-docs" data-id="${u.id}">Ver documentos</button>` : ''}<button class="btn-outline" data-user-action="toggle" data-id="${u.id}">${u.active ? 'Desactivar' : 'Activar'}</button>${u.role !== 'admin' ? `<button class="btn-danger" data-user-action="delete" data-id="${u.id}">Eliminar</button>` : ''}</td></tr>`).join('');

                byId('audit-log').innerHTML = log.log.length ? log.log.map(a => `<div class="audit-entry"><strong>${safe(a.action)}</strong> — ${safe(a.target)}<br><span class="small">Motivo: ${safe(a.reason)} · ${safe(a.adminName)} · ${safe(a.at)}</span></div>`).join('') : '<p class="muted small">Aún no hay acciones registradas.</p>';
            } catch (e) { toast('No se pudo cargar el panel de administración.'); }
        }

        document.addEventListener('click', async e => {
            const docsBtn = e.target.closest('[data-admin-action="view-docs"]');
            if (docsBtn) {
                try {
                    const d = await api('/api/admin/users/' + docsBtn.dataset.id + '/docs');
                    const block = (label, src) => {
                        if (!src) return `<div style="margin-bottom:1rem"><strong>${label}</strong><p class="small muted">Esta cuenta no tiene ese documento cargado.</p></div>`;
                        const ext = String(src).split('.').pop()?.toLowerCase();
                        const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(ext || '');
                        return `<div style="margin-bottom:1rem"><strong>${label}</strong>${isImage ? `<br><img src="${src}" alt="${label}" style="max-width:100%;max-height:70vh;display:block;border-radius:10px;margin-top:.4rem;border:1px solid var(--border-color)">` : `<br><iframe src="${src}" title="${label}" style="width:100%;min-height:70vh;border:1px solid var(--border-color);border-radius:10px;margin-top:.4rem"></iframe><p class="small muted" style="margin-top:.4rem;">Si el PDF no se muestra, ábrelo en una pestaña nueva.</p>`}</div>`;
                    };
                    modal('Documentos de verificación', `<div style="max-height:75vh;overflow-y:auto;">${block('Cédula de identidad', d.cedula)}${block('Escritura / predial del inmueble', d.predial)}</div>`, [{ label: 'Cerrar', class: 'btn-primary' }]);
                } catch (err) { toast(err.message); }
                return;
            }
            const verifyBtn = e.target.closest('[data-admin-action="approve"], [data-admin-action="reject"]');
            if (verifyBtn) {
                const approve = verifyBtn.dataset.adminAction === 'approve';
                promptReason(approve ? 'Aprobar arrendador' : 'Rechazar arrendador', async reason => {
                    try { await api(`/api/admin/landlords/${verifyBtn.dataset.id}/verify`, { method: 'POST', body: { approve, reason } }); toast(approve ? 'Arrendador aprobado. Se le notificará al ingresar.' : 'Arrendador rechazado. Se le notificará al ingresar.'); render(); }
                    catch (err) { toast(err.message); }
                });
                return;
            }
            const reportBtn = e.target.closest('[data-report-action]');
            if (reportBtn) {
                const action = reportBtn.dataset.reportAction;
                const run = async (reason) => { try { await api('/api/admin/reports/' + reportBtn.dataset.id, { method: 'PATCH', body: { action, reason } }); toast(action === 'delete' ? 'Contenido eliminado.' : action === 'hide' ? 'Publicación ocultada.' : 'Reporte marcado como revisado.'); render(); } catch (err) { toast(err.message); } };
                if (action === 'delete') promptReason('Eliminar contenido reportado', run); else run();
                return;
            }
            const userBtn = e.target.closest('[data-user-action]');
            if (userBtn) {
                const action = userBtn.dataset.userAction;
                if (action === 'toggle') promptReason('Cambiar estado de usuario', async reason => { try { await api('/api/admin/users/' + userBtn.dataset.id + '/toggle', { method: 'PATCH', body: { reason } }); toast('Estado de usuario actualizado.'); render(); } catch (err) { toast(err.message); } });
                if (action === 'delete') promptReason('Eliminar usuario', async reason => { if (!confirm('¿Eliminar definitivamente esta cuenta?')) return; try { await api('/api/admin/users/' + userBtn.dataset.id, { method: 'DELETE', body: { reason } }); toast('Usuario eliminado.'); render(); } catch (err) { toast(err.message); } });
                return;
            }
        });
        render();
    }

    // ---- Enrutador por página ----
    document.addEventListener('DOMContentLoaded', async () => {
        await initCommon();
        const page = pageName();
        if (page === 'index.html' || page === '') initIndex();
        else if (page === 'login.html') initLogin();
        else if (page === 'registro.html') initRegister();
        else if (page === 'dashboard.html' && location.pathname.includes('/estudiante/')) initStudentDashboard();
        else if (page === 'detalle.html') initDetail();
        else if (page === 'mensajes.html' && location.pathname.includes('/estudiante/')) initMessages('estudiante');
        else if (page === 'dashboard.html' && location.pathname.includes('/arrendador/')) initLandlordDashboard();
        else if (page === 'publicar.html') initPublish();
        else if (page === 'mensajes.html' && location.pathname.includes('/arrendador/')) initMessages('arrendador');
        else if (page === 'dashboard.html' && location.pathname.includes('/admin/')) initAdmin();
    });
})();
