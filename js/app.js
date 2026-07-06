(function () {
    'use strict';

    const DB_KEY = 'roomiu.db.v2';
    const SESSION_KEY = 'roomiu.session.v1';
    const ROOT = location.pathname.includes('/estudiante/') || location.pathname.includes('/arrendador/') || location.pathname.includes('/admin/') ? '../' : '';
    const ESPE_LAT = -0.9331, ESPE_LNG = -78.6157;

    const seedData = {
        users: [
            { id:'u1', role:'estudiante', name:'Ana Torres', email:'estudiante@espe.edu.ec', password:'123456', university:'Universidad de las Fuerzas Armadas ESPE', career:'Ingeniería en Software', phone:'0981112223', active:true, verified:true, avatar:'AT', favorites:['p1'], searches:2, docs:{ matricula:true, record:false, rolPagos:false }, createdAt:'2026-05-12' },
            { id:'u2', role:'arrendador', name:'Roberto Suárez', email:'arrendador@roomiu.ec', password:'123456', phone:'0992223334', active:true, verified:true, avatar:'RS', docs:{ cedula:true, predial:true }, createdAt:'2026-05-15' },
            { id:'u3', role:'arrendador', name:'Carmen López', email:'carmen@roomiu.ec', password:'123456', phone:'0987654321', active:true, verified:false, avatar:'CL', docs:{ cedula:true, predial:false }, createdAt:'2026-07-01' },
            { id:'u4', role:'admin', name:'Administrador ESPE', email:'admin@roomiu.ec', password:'admin123', phone:'', active:true, verified:true, avatar:'AD', createdAt:'2026-01-10' }
        ],
        properties: [
            { id:'p1', ownerId:'u2', title:'Habitación individual cerca de ESPE Latacunga', description:'Habitación segura, amoblada y con ambiente tranquilo para estudiantes. Incluye escritorio, armario, uso de cocina y acceso independiente. Ideal para estudiantes foráneos que buscan cercanía al campus.', type:'Habitación Individual', price:120, distance:0.8, address:'Barrio San Felipe, Latacunga', lat:-0.931, lng:-78.616, services:['WiFi','Agua Caliente','Luz','Cocina','Amoblado'], active:true, verified:true, bedrooms:1, photosData:[], createdAt:'2026-06-20' },
            { id:'p2', ownerId:'u2', title:'Departamento amoblado - sector La Estación', description:'Departamento de dos dormitorios con sala, cocina, baño privado e internet. Cercano a paradas de transporte y tiendas.', type:'Departamento', price:320, distance:2.4, address:'Sector La Estación, Latacunga', lat:-0.925, lng:-78.608, services:['WiFi','Agua Caliente','Luz','Lavandería','Amoblado'], active:true, verified:true, bedrooms:2, photosData:[], createdAt:'2026-06-22' },
            { id:'p3', ownerId:'u3', title:'Cuarto económico - La Vaquería', description:'Cuarto básico con servicios incluidos. La cuenta del arrendador está pendiente de verificación, por lo tanto se muestra con advertencia.', type:'Cuarto', price:150, distance:1.6, address:'La Vaquería, Latacunga', lat:-0.940, lng:-78.620, services:['WiFi','Agua','Luz'], active:true, verified:false, bedrooms:1, photosData:[], createdAt:'2026-06-25' },
            { id:'p4', ownerId:'u2', title:'Casa compartida - Nueva Vida', description:'Casa con tres habitaciones disponibles, patio y cocina compartida. Publicación actualmente pausada por disponibilidad.', type:'Casa', price:360, distance:3.2, address:'Nueva Vida, Latacunga', lat:-0.947, lng:-78.633, services:['WiFi','Agua Caliente','Luz','Cocina','Lavandería'], active:false, verified:true, bedrooms:3, photosData:[], createdAt:'2026-05-30' }
        ],
        reviews: [
            { id:'r1', propertyId:'p1', userId:'u1', userName:'María G.', rating:5, text:'Excelente lugar, tranquilo y cerca de la ESPE.', createdAt:'2026-06-28' },
            { id:'r2', propertyId:'p1', userId:'u5', userName:'Carlos M.', rating:4, text:'El arrendador es atento y la zona se siente segura.', createdAt:'2026-06-29' },
            { id:'r3', propertyId:'p2', userId:'u6', userName:'Daniela P.', rating:5, text:'Departamento cómodo y con buena conexión a internet.', createdAt:'2026-06-30' },
            { id:'r4', propertyId:'p3', userId:'u7', userName:'Luis A.', rating:3, text:'Buena opción por precio, pero falta completar verificación.', createdAt:'2026-07-01' }
        ],
        reports: [
            { id:'rep1', type:'publicación', propertyId:'p3', reviewId:null, reporterId:'u1', reason:'La publicación no tiene documentación completa del arrendador.', status:'pendiente', createdAt:'2026-07-02' },
            { id:'rep2', type:'reseña', propertyId:'p1', reviewId:'r2', reporterId:'u2', reason:'Comentario duplicado en la publicación.', status:'revisado', createdAt:'2026-06-25' }
        ],
        auditLog: [],
        messages: [
            { id:'c1', propertyId:'p1', studentId:'u1', landlordId:'u2', unreadFor:'u2', messages:[
                { from:'u1', text:'¿Aún está disponible la habitación? ¿Podría visitarla hoy?', at:'2026-07-03 17:20' },
                { from:'u2', text:'Sí, la habitación sigue disponible. ¿A qué hora le gustaría visitarla?', at:'2026-07-03 17:25' },
                { from:'u1', text:'A las 18h estaría bien para mí.', at:'2026-07-03 17:29' },
                { from:'u2', text:'Perfecto, le espero a las 18h en la dirección indicada.', at:'2026-07-03 17:31' }
            ] }
        ],
        visits: [ { id:'v1', propertyId:'p1', studentId:'u1', date:'2026-07-06', time:'18:00', status:'programada' } ],
        payments: [ { id:'pay1', propertyId:'p1', studentId:'u1', amount:120, method:'Transferencia bancaria', status:'registrado', createdAt:'2026-07-04' } ]
    };

    function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
    function getDB(){
        let raw = localStorage.getItem(DB_KEY);
        if(!raw){ localStorage.setItem(DB_KEY, JSON.stringify(seedData)); return clone(seedData); }
        try { return JSON.parse(raw); } catch(e){ localStorage.setItem(DB_KEY, JSON.stringify(seedData)); return clone(seedData); }
    }
    function setDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    function resetDB(){ localStorage.setItem(DB_KEY, JSON.stringify(seedData)); toast('Información inicial restablecida.'); setTimeout(()=>location.reload(), 500); }
    function getSession(){ return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    function setSession(session){ sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
    function clearSession(){ sessionStorage.removeItem(SESSION_KEY); }
    function byId(id){ return document.getElementById(id); }
    function money(n){ return '$' + Number(n || 0).toLocaleString('es-EC'); }
    function stars(n){ const r = Math.round(Number(n) || 0); return '★★★★★'.slice(0,r) + '☆☆☆☆☆'.slice(0,5-r); }
    function avgRating(propertyId){
        const db = getDB(); const rs = db.reviews.filter(r=>r.propertyId===propertyId);
        if(!rs.length) return 0;
        return +(rs.reduce((a,b)=>a + Number(b.rating),0)/rs.length).toFixed(1);
    }
    function reviewCount(propertyId){ return getDB().reviews.filter(r=>r.propertyId===propertyId).length; }
    function ownerOf(property){ return getDB().users.find(u=>u.id===property.ownerId) || {}; }
    function ownerAvgRating(ownerId){
        const db=getDB(); const ids=db.properties.filter(p=>p.ownerId===ownerId).map(p=>p.id);
        const rs=db.reviews.filter(r=>ids.includes(r.propertyId));
        if(!rs.length) return 0;
        return +(rs.reduce((a,b)=>a+Number(b.rating),0)/rs.length).toFixed(1);
    }
    function hasContact(userId, propertyId){
        const db=getDB();
        return db.messages.some(c=>c.propertyId===propertyId && c.studentId===userId) || db.visits.some(v=>v.propertyId===propertyId && v.studentId===userId);
    }
    // RF-006: acceso por rol. currentUser() solo devuelve el usuario de la sesión activa, sin crear sesiones automáticas.
    function currentUser(){
        const s = getSession(); if(!s) return null;
        return getDB().users.find(u=>u.id===s.userId) || null;
    }
    function requireRole(role){
        const u = currentUser();
        if(!u || u.role !== role || !u.active){
            clearSession();
            location.href = path('login.html');
            return null;
        }
        return u;
    }
    function logAudit(adminId, action, targetLabel, reason){
        const db=getDB(); const admin=db.users.find(u=>u.id===adminId);
        db.auditLog.unshift({ id:'a'+Date.now(), adminId, adminName:admin?admin.name:'Admin', action, target:targetLabel, reason:reason||'Sin motivo especificado', at:new Date().toLocaleString('es-EC') });
        setDB(db);
    }
    function promptReason(title, onConfirm){
        modal(title, `<label class="form-label" for="reason-input">Motivo de la acción</label><textarea id="reason-input" class="form-control" placeholder="Describe brevemente el motivo..."></textarea>`, [
            {label:'Cancelar', class:'btn-outline'},
            {label:'Confirmar', class:'btn-primary', action:(m)=>onConfirm(m.querySelector('#reason-input').value.trim())}
        ]);
    }
    function toast(message){
        let t = document.createElement('div'); t.className='toast'; t.textContent = message; document.body.appendChild(t);
        setTimeout(()=>t.remove(), 2800);
    }
    function modal(title, html, actions){
        document.body.classList.add('modal-open');
        const back = document.createElement('div'); back.className='modal-backdrop';
        back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><header><h3>${title}</h3><button class="btn-ghost" data-close>×</button></header><div class="body">${html}</div><div class="actions"></div></div>`;
        const act = back.querySelector('.actions');
        (actions || [{label:'Cerrar', class:'btn-primary', action:()=>{}}]).forEach(a=>{
            const b=document.createElement('button'); b.className=a.class || 'btn-primary'; b.textContent=a.label; b.addEventListener('click',()=>{ if(a.action) a.action(back); if(!a.keepOpen){ back.remove(); document.body.classList.remove('modal-open'); }}); act.appendChild(b);
        });
        back.addEventListener('click', e=>{ if(e.target===back || e.target.dataset.close!==undefined){ back.remove(); document.body.classList.remove('modal-open'); }});
        document.body.appendChild(back); return back;
    }
    function path(name){ return ROOT + name; }
    function safe(text){ return String(text ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
    function queryParam(name){ return new URLSearchParams(location.search).get(name); }
    function pageName(){ return location.pathname.split('/').pop() || 'index.html'; }
    function activeProperties(){ return getDB().properties.filter(p=>p.active); }

    function propertyCard(p, mode='student'){
        const rating = avgRating(p.id); const owner = ownerOf(p); const count = reviewCount(p.id);
        const services = p.services.slice(0,4).map(s=>`<span class="service-pill">${safe(s)}</span>`).join('');
        const verified = p.verified && owner.verified ? '<span class="badge success">✓ Verificado</span>' : '<span class="badge warning">Pendiente verificación</span>';
        const reportFlag = reportCountFor(p.id) >= 2 ? '<span class="badge report-flag">⚠ Reportes múltiples</span>' : '';
        if(mode === 'mini'){
            return `<article class="property-card-mini">
                <div class="photo-placeholder">${photoOrPlaceholder(p.photosData)}</div><div class="content">
                <h3>${safe(p.title)}</h3><p class="small muted">${stars(rating)} ${rating || 'Nuevo'} (${count} reseñas) · ${p.distance} km</p>
                <div class="service-list">${services}</div><footer><strong>${money(p.price)}/mes</strong><a class="btn-primary" href="estudiante/detalle.html?id=${p.id}">Ver</a></footer></div></article>`;
        }
        const fav = isFavorite(p.id) ? '♥' : '♡';
        return `<article class="property-card" data-property-id="${p.id}">
            <div class="photo-placeholder">${photoOrPlaceholder(p.photosData)}</div>
            <div class="property-details">${reportFlag}
                <h3>${safe(p.title)}</h3>
                <p class="small muted">${stars(rating)} ${rating || 'Nuevo'} (${count} reseñas) · ${p.distance} km de la ESPE</p>
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
    function isFavorite(propertyId){ const u=currentUser(); return !!(u && (u.favorites || []).includes(propertyId)); }
    function toggleFavorite(propertyId){
        const db=getDB(); const s=getSession(); if(!s){ toast('Inicia sesión para guardar favoritos.'); return; }
        const u=db.users.find(x=>x.id===s.userId); if(!u) return;
        u.favorites = u.favorites || [];
        const i=u.favorites.indexOf(propertyId);
        if(i>=0){ u.favorites.splice(i,1); toast('Eliminado de favoritos.'); } else { u.favorites.push(propertyId); toast('Guardado en favoritos.'); }
        setDB(db);
    }
    function addReport(propertyId, reason, type='publicación', reviewId=null){
        const db=getDB(); const u=currentUser();
        db.reports.unshift({ id:'rep'+Date.now(), type, propertyId, reviewId, reporterId:u?.id || 'anon', reason:reason || 'Reporte sin detalle', status:'pendiente', createdAt:new Date().toISOString().slice(0,10) });
        setDB(db); toast('Reporte enviado al administrador.');
    }
    function reportPrompt(propertyId){
        modal('Reportar publicación', `<label class="form-label" for="reason">Motivo del reporte</label><textarea id="reason" class="form-control" placeholder="Describe si parece fraudulenta, engañosa o inapropiada..."></textarea>`, [
            {label:'Cancelar', class:'btn-outline'},
            {label:'Enviar reporte', class:'btn-danger', action:(m)=>{ const reason=m.querySelector('#reason').value.trim(); addReport(propertyId, reason || 'Contenido sospechoso', 'publicación'); }}
        ]);
    }
    function reportReviewPrompt(propertyId, reviewId){
        modal('Reportar reseña', `<label class="form-label" for="reason">Motivo del reporte</label><textarea id="reason" class="form-control" placeholder="Describe si la reseña parece falsa, ofensiva o duplicada..."></textarea>`, [
            {label:'Cancelar', class:'btn-outline'},
            {label:'Enviar reporte', class:'btn-danger', action:(m)=>{ const reason=m.querySelector('#reason').value.trim(); addReport(propertyId, reason || 'Reseña sospechosa', 'reseña', reviewId); }}
        ]);
    }
    function reportCountFor(propertyId, reviewId=null){
        const db=getDB();
        return db.reports.filter(r=> reviewId ? r.reviewId===reviewId : (r.propertyId===propertyId && !r.reviewId)).length;
    }

    // ---- Mapa real (Leaflet / OpenStreetMap) ----
    function hasLeaflet(){ return typeof window.L !== 'undefined'; }
    function mapFallback(containerId, message){
        const el = byId(containerId); if(el) el.innerHTML = `<div class="map-fallback">${safe(message || 'Mapa no disponible. Verifica tu conexión a internet.')}</div>`;
    }
    function campusIcon(){ return L.divIcon({ className:'espe-pin', html:'<span>Campus ESPE</span>', iconSize:[100,26], iconAnchor:[50,26] }); }
    function priceIcon(price){ return L.divIcon({ className:'price-pin', html:`<span>${money(price)}</span>`, iconSize:[70,26], iconAnchor:[35,26] }); }
    function buildBaseMap(containerId, opts={}){
        if(!hasLeaflet()){ mapFallback(containerId); return null; }
        const el = byId(containerId); if(!el) return null;
        const map = L.map(containerId, { scrollWheelZoom:false }).setView([opts.lat||ESPE_LAT, opts.lng||ESPE_LNG], opts.zoom||14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; OpenStreetMap' }).addTo(map);
        if(opts.showCampus!==false) L.marker([ESPE_LAT, ESPE_LNG], { icon:campusIcon() }).addTo(map).bindPopup('Campus ESPE Latacunga');
        setTimeout(()=>map.invalidateSize(), 250);
        return map;
    }
    function renderPropertyMarkers(map, list, hrefPrefix){
        if(!map) return null;
        const layer = L.layerGroup().addTo(map);
        list.forEach(p=>{
            const mk = L.marker([p.lat, p.lng], { icon:priceIcon(p.price) }).addTo(layer);
            mk.bindPopup(`<strong>${safe(p.title)}</strong><br>${money(p.price)}/mes · ${p.distance} km del campus<br><a href="${hrefPrefix}${p.id}">Ver publicación</a>`);
        });
        return layer;
    }
    function buildPickableMap(containerId, initialLat, initialLng, onPick){
        if(!hasLeaflet()){ mapFallback(containerId, 'No se puede cargar el selector de ubicación sin conexión a internet.'); return null; }
        const lat = initialLat || ESPE_LAT, lng = initialLng || ESPE_LNG;
        const map = L.map(containerId, { scrollWheelZoom:false }).setView([lat,lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; OpenStreetMap' }).addTo(map);
        L.marker([ESPE_LAT, ESPE_LNG], { icon:campusIcon() }).addTo(map).bindPopup('Campus ESPE Latacunga');
        const marker = L.marker([lat,lng], { draggable:true }).addTo(map);
        marker.on('dragend', e=>onPick(e.target.getLatLng()));
        map.on('click', e=>{ marker.setLatLng(e.latlng); onPick(e.latlng); });
        setTimeout(()=>map.invalidateSize(), 250);
        onPick({lat, lng});
        return map;
    }

    // ---- Fotos reales (subida a base64 en el navegador) ----
    function readFilesAsDataURLs(fileList){
        const files = Array.from(fileList || []).slice(0, 10);
        return Promise.all(files.map(f=>new Promise((resolve, reject)=>{
            const reader = new FileReader();
            reader.onload = ()=>resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(f);
        })));
    }
    function photoOrPlaceholder(photosData, label){
        if(photosData && photosData.length){ return `<img src="${photosData[0]}" alt="Foto de la vivienda">`; }
        return label || 'FOTO';
    }

    function refreshMessageBadges(){
        const links = document.querySelectorAll('[data-messages-link]'); if(!links.length) return;
        const u = currentUser(); links.forEach(a=>{ const old=a.querySelector('.msg-badge'); if(old) old.remove(); });
        if(!u) return;
        const db = getDB();
        let unread = 0;
        if(u.role==='estudiante') unread = db.messages.filter(c=>c.studentId===u.id && c.unreadFor===u.id).length;
        if(u.role==='arrendador') unread = db.messages.filter(c=>c.landlordId===u.id && c.unreadFor===u.id).length;
        if(unread > 0){ links.forEach(a=>{ const b=document.createElement('span'); b.className='msg-badge'; b.textContent=unread; a.appendChild(b); }); }
    }
    function initCommon(){
        document.querySelectorAll('[data-logout]').forEach(a=>a.addEventListener('click', e=>{ e.preventDefault(); clearSession(); location.href=path('index.html'); }));
        document.querySelectorAll('[data-reset-data]').forEach(a=>a.addEventListener('click', e=>{ e.preventDefault(); resetDB(); }));
        const userBadges = document.querySelectorAll('[data-current-user]');
        if(userBadges.length){ const u=currentUser(); userBadges.forEach(el=> el.textContent = u ? u.name : 'Invitado'); }
        refreshMessageBadges();
    }

    function initIndex(){
        const featured = activeProperties().filter(p=>p.verified).slice(0,3);
        const holder = byId('featured-properties');
        if(holder){ holder.innerHTML = featured.map(p=>propertyCard(p,'mini')).join(''); }
        const form = byId('home-search-form');
        if(form){ form.addEventListener('submit', e=>{ e.preventDefault(); const q=byId('home-search').value.trim(); location.href = 'estudiante/dashboard.html?q=' + encodeURIComponent(q); }); }
        const map = buildBaseMap('home-map');
        renderPropertyMarkers(map, activeProperties(), 'estudiante/detalle.html?id=');
    }

    function initLogin(){
        let role = 'estudiante';
        document.querySelectorAll('[data-role-tab]').forEach(btn=>btn.addEventListener('click', e=>{ e.preventDefault(); role=btn.dataset.roleTab; document.querySelectorAll('[data-role-tab]').forEach(b=>b.className='btn-outline'); btn.className='btn-primary'; }));
        const form = byId('login-form');
        if(form) form.addEventListener('submit', e=>{
            e.preventDefault();
            const db=getDB(); const email=byId('login-email').value.trim().toLowerCase(); const pass=byId('login-password').value;
            const user=db.users.find(u=>u.email.toLowerCase()===email && u.password===pass && u.role===role);
            if(!user || !user.active){ toast('No se pudo iniciar sesión. Revisa credenciales, rol o estado de la cuenta.'); return; }
            setSession({userId:user.id, role:user.role});
            if(user.role==='estudiante') location.href='estudiante/dashboard.html';
            else if(user.role==='arrendador') location.href='arrendador/dashboard.html';
            else location.href='admin/dashboard.html';
        });
        const forgot = byId('forgot-link');
        if(forgot) forgot.addEventListener('click', e=>{ e.preventDefault(); modal('Recuperar contraseña', `<p>Avance funcional RF-004: se simula el envío de un enlace de recuperación al correo registrado.</p><input id="recover-email" class="form-control" type="email" placeholder="correo@espe.edu.ec">`, [{label:'Cancelar', class:'btn-outline'}, {label:'Enviar enlace', class:'btn-primary', action:()=>toast('Se simuló el envío del enlace de recuperación.')}]); });
    }

    function initRegister(){
        let role='estudiante';
        const est = byId('campos-estudiante'), arr=byId('campos-arrendador');
        document.querySelectorAll('[data-reg-role]').forEach(btn=>btn.addEventListener('click', e=>{ e.preventDefault(); role=btn.dataset.regRole; document.querySelectorAll('[data-reg-role]').forEach(b=>b.className='btn-outline'); btn.className='btn-primary'; if(est) est.style.display=role==='estudiante'?'block':'none'; if(arr) arr.style.display=role==='arrendador'?'block':'none'; }));
        const form=byId('form-registro');
        if(form) form.addEventListener('submit', async e=>{
            e.preventDefault();
            const db=getDB();
            const name=byId('reg-name').value.trim(); const email=byId('reg-email').value.trim().toLowerCase(); const pass=byId('reg-password').value; const phone=byId('reg-phone')?.value.trim() || '';
            if(!name || !email || pass.length<6){ toast('Completa nombre, correo y una contraseña mínima de 6 caracteres.'); return; }
            if(db.users.some(u=>u.email.toLowerCase()===email)){ toast('Ya existe una cuenta con ese correo.'); return; }
            if(role==='estudiante' && (!byId('reg-university').value.trim() || !byId('reg-career').value.trim())){ toast('Completa universidad y carrera.'); return; }
            const user={ id:'u'+Date.now(), role, name, email, password:pass, phone, active:true, verified:role==='estudiante', avatar:name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(), favorites:[], createdAt:new Date().toISOString().slice(0,10) };
            if(role==='estudiante'){ user.university=byId('reg-university').value; user.career=byId('reg-career').value; user.docs={matricula:false, record:false, rolPagos:false}; }
            if(role==='arrendador'){
                const cedulaFile=byId('reg-doc-cedula')?.files[0]; const predialFile=byId('reg-doc-predial')?.files[0];
                if(!cedulaFile || !predialFile){ toast('Debes adjuntar cédula de identidad y respaldo del inmueble para poder verificarte.'); return; }
                const [cedulaData, predialData] = await readFilesAsDataURLs([cedulaFile, predialFile]);
                user.verified=false; user.docs={ cedula:true, predial:true, cedulaFile:cedulaData, predialFile:predialData };
            }
            db.users.push(user); setDB(db);
            toast(role==='arrendador' ? 'Registro creado. Queda pendiente de verificación del administrador.' : 'Registro creado correctamente.');
            setTimeout(()=>location.href='login.html', 900);
        });
    }

    function initStudentDashboard(){
        const user=requireRole('estudiante'); if(!user) return;
        const db=getDB();
        let resultsMap=null, markersLayer=null;
        function ensureMap(){ if(resultsMap || !byId('map-results')) return; resultsMap=buildBaseMap('map-results'); if(resultsMap) markersLayer=L.layerGroup().addTo(resultsMap); }
        const stats=byId('student-stats');
        function refreshStats(){
            if(!stats) return;
            const db2=getDB(); const u=db2.users.find(x=>x.id===user.id) || user;
            const fav=(u.favorites||[]).length;
            const unread=db2.messages.filter(c=>c.studentId===u.id && c.unreadFor===u.id).length;
            const visits=db2.visits.filter(v=>v.studentId===u.id).length;
            stats.innerHTML=`<div class="stat-card"><h3>${u.searches||0}</h3><p>Búsquedas guardadas</p></div><div class="stat-card"><h3>${fav}</h3><p>Favoritos</p></div><div class="stat-card"><h3>${unread}</h3><p>Mensajes sin leer</p></div><div class="stat-card"><h3>${visits}</h3><p>Visitas programadas</p></div>`;
        }
        refreshStats();
        const q=queryParam('q'); if(q && byId('filter-q')) byId('filter-q').value=q;
        function collectFilters(){
            return {
                q:(byId('filter-q')?.value || '').toLowerCase().trim(), min:Number(byId('filter-min')?.value || 0), max:Number(byId('filter-max')?.value || 99999),
                type:byId('filter-type')?.value || '', dist:Number(byId('filter-dist')?.value || 999), rating:Number(byId('filter-rating')?.value || 0), sort:byId('sort-results')?.value || 'relevance',
                services:Array.from(document.querySelectorAll('[data-service-filter]:checked')).map(x=>x.value)
            };
        }
        function filterProperties(){
            const f=collectFilters();
            let list=activeProperties().filter(p=>{
                const txt=(p.title+' '+p.address+' '+p.type+' '+p.description).toLowerCase();
                const r=avgRating(p.id);
                return (!f.q || txt.includes(f.q)) && p.price>=f.min && p.price<=f.max && (!f.type || p.type===f.type) && p.distance<=f.dist && r>=f.rating && f.services.every(s=>p.services.includes(s));
            });
            if(f.sort==='price') list.sort((a,b)=>a.price-b.price);
            if(f.sort==='distance') list.sort((a,b)=>a.distance-b.distance);
            if(f.sort==='rating') list.sort((a,b)=>avgRating(b.id)-avgRating(a.id));
            renderResults(list);
        }
        function renderResults(list){
            const count=byId('result-count'); if(count) count.textContent=`${list.length} resultados encontrados`;
            const out=byId('properties-results'); if(out) out.innerHTML = list.length ? list.map(p=>propertyCard(p)).join('') : '<div class="alert warning">No hay viviendas con esos filtros. Validación ampliar precio, distancia o servicios.</div>';
            renderMap(list);
        }
        function renderMap(list){
            ensureMap(); if(!markersLayer) return;
            markersLayer.clearLayers();
            list.forEach(p=>{
                const mk=L.marker([p.lat,p.lng], { icon:priceIcon(p.price) }).addTo(markersLayer);
                mk.bindPopup(`<strong>${safe(p.title)}</strong><br>${money(p.price)}/mes · ${p.distance} km del campus<br><a href="detalle.html?id=${p.id}">Ver publicación</a>`);
            });
            if(resultsMap) setTimeout(()=>resultsMap.invalidateSize(), 150);
        }
        const filterBox=byId('student-filter-form'); if(filterBox){ filterBox.addEventListener('input', filterProperties); filterBox.addEventListener('submit', e=>{ e.preventDefault(); const db2=getDB(); const u=db2.users.find(x=>x.id===user.id); u.searches=(u.searches||0)+1; setDB(db2); user.searches=u.searches; toast('Búsqueda guardada.'); refreshStats(); }); }
        const sort=byId('sort-results'); if(sort) sort.addEventListener('change', filterProperties);
        document.addEventListener('click', e=>{
            const btn=e.target.closest('[data-action]'); if(!btn) return;
            if(btn.dataset.action==='favorite'){ toggleFavorite(btn.dataset.id); filterProperties(); }
            if(btn.dataset.action==='report'){ reportPrompt(btn.dataset.id); }
            if(btn.dataset.action==='show-favorites'){ e.preventDefault(); showFavorites(); }
            if(btn.dataset.action==='show-search'){ e.preventDefault(); location.hash='buscar'; byId('search-section').style.display='block'; byId('favorites-section').style.display='none'; byId('profile-section').style.display='none'; }
            if(btn.dataset.action==='show-profile'){ e.preventDefault(); showProfile(); }
        });
        function showFavorites(){
            const section=byId('favorites-section'), search=byId('search-section'), profile=byId('profile-section');
            search.style.display='none'; profile.style.display='none'; section.style.display='block';
            const favs=activeProperties().filter(p=>(user.favorites||[]).includes(p.id));
            byId('favorites-list').innerHTML=favs.length?favs.map(p=>propertyCard(p)).join(''):'<div class="alert info">Todavía no tienes viviendas favoritas.</div>';
        }
        function showProfile(){
            byId('search-section').style.display='none'; byId('favorites-section').style.display='none'; byId('profile-section').style.display='block';
            const docs=user.docs||{};
            byId('profile-panel').innerHTML=`<div class="card"><h3>Mi perfil</h3><p class="muted">Correo: ${safe(user.email)} (no editable). Universidad: ${safe(user.university||'')}</p><div class="form-row"><div class="form-group"><label class="form-label">Nombre</label><input id="profile-name" class="form-control" value="${safe(user.name)}"></div><div class="form-group"><label class="form-label">Teléfono</label><input id="profile-phone" class="form-control" value="${safe(user.phone||'')}"></div></div><div class="form-group"><label class="form-label">Carrera</label><input id="profile-career" class="form-control" value="${safe(user.career||'')}"></div><button class="btn-primary" id="save-profile">Guardar cambios</button></div>
            <div class="card" style="margin-top:1rem;"><h3>Documentos para formalizar contrato</h3><p class="muted">Matrícula, récord policial y rol de pagos del representante.</p>
            <div class="form-row" style="margin-top:.75rem;"><div class="form-group"><label class="form-label">Matrícula ${docs.matricula?'<span class="badge success">Subida</span>':'<span class="badge warning">Pendiente</span>'}</label><input type="file" id="doc-matricula" class="form-control" accept="image/*,.pdf"></div><div class="form-group"><label class="form-label">Récord policial ${docs.record?'<span class="badge success">Subida</span>':'<span class="badge warning">Pendiente</span>'}</label><input type="file" id="doc-record" class="form-control" accept="image/*,.pdf"></div></div>
            <div class="form-group"><label class="form-label">Rol de pagos del representante ${docs.rolPagos?'<span class="badge success">Subida</span>':'<span class="badge warning">Pendiente</span>'}</label><input type="file" id="doc-rolpagos" class="form-control" accept="image/*,.pdf"></div>
            <button class="btn-outline" id="save-docs" style="margin-top:.5rem;">Guardar documentos</button></div>`;
            byId('save-profile').onclick=()=>{ const db=getDB(); const u=db.users.find(x=>x.id===user.id); u.name=byId('profile-name').value; u.phone=byId('profile-phone').value; u.career=byId('profile-career').value; setDB(db); toast('Perfil actualizado.'); };
            byId('save-docs').onclick=async ()=>{
                const db=getDB(); const u=db.users.find(x=>x.id===user.id); u.docs=u.docs||{};
                const m=byId('doc-matricula').files[0], r=byId('doc-record').files[0], rp=byId('doc-rolpagos').files[0];
                if(m) u.docs.matricula=true; if(r) u.docs.record=true; if(rp) u.docs.rolPagos=true;
                setDB(db); toast('Documentos actualizados.'); showProfile();
            };
        }
        filterProperties();
    }

    function initDetail(){
        const user=requireRole('estudiante'); if(!user) return;
        const db=getDB();
        const id=queryParam('id') || 'p1';
        const p=db.properties.find(x=>x.id===id) || db.properties[0];
        const owner=ownerOf(p); const rating=avgRating(p.id); const count=reviewCount(p.id); const ownerRating=ownerAvgRating(p.ownerId);
        const detail=byId('property-detail'); if(!detail) return;
        const photos=p.photosData||[];
        const galleryMain = photos[0] ? `<img src="${photos[0]}" alt="Foto principal">` : 'FOTO PRINCIPAL';
        const gallerySide2 = photos[1] ? `<img src="${photos[1]}" alt="Foto 2">` : 'FOTO 2';
        const gallerySide3 = photos[2] ? `<img src="${photos[2]}" alt="Foto 3">` : 'FOTO 3';
        detail.innerHTML=`
            <section class="detail-gallery"><div class="photo-placeholder">${galleryMain}</div><div class="side"><div class="photo-placeholder">${gallerySide2}</div><div class="photo-placeholder">${gallerySide3}</div></div></section>
            <section class="detail-layout">
                <div>
                    <div class="card" style="margin-bottom:1rem;"><div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap"><div><h1>${safe(p.title)}</h1><p class="muted">${stars(rating)} ${rating || 'Nuevo'} (${count} reseñas) · ${p.distance} km del campus</p><p>${safe(p.address)}</p></div><div style="text-align:right"><h2>${money(p.price)}<span class="small muted">/mes</span></h2><button class="btn-outline" data-detail-action="favorite">${isFavorite(p.id)?'♥ Guardado':'♡ Guardar'}</button></div></div></div>
                    <div class="card" style="margin-bottom:1rem"><h3>Descripción</h3><p>${safe(p.description)}</p></div>
                    <div class="card" style="margin-bottom:1rem"><h3>Servicios incluidos</h3><div class="service-list" style="margin-top:.7rem">${p.services.map(s=>`<span class="service-pill">${safe(s)}</span>`).join('')}</div></div>
                    <div class="card" style="margin-bottom:1rem"><h3>Reseñas y reputación</h3><div id="reviews-list" style="margin-top:1rem"></div><form id="review-form" style="margin-top:1rem"><div class="form-row"><div class="form-group"><label class="form-label">Calificación</label><select id="review-rating" class="form-control"><option value="5">5 - Excelente</option><option value="4">4 - Buena</option><option value="3">3 - Regular</option><option value="2">2 - Mala</option><option value="1">1 - Muy mala</option></select></div><div class="form-group"><label class="form-label">Comentario</label><input id="review-text" class="form-control" placeholder="Escribe tu experiencia"></div></div><button class="btn-primary">Publicar reseña</button><p class="help-text">Solo puedes reseñar viviendas con las que hayas tenido contacto (mensaje o visita).</p></form></div>
                    <div class="card"><h3>Contrato y pago</h3><p class="muted">Flujo de contrato digital y cobro por transferencia o tarjeta de débito dentro de la aplicación.</p><div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem"><button class="btn-outline" data-detail-action="contract">Generar contrato</button><button class="btn-primary" data-detail-action="pay">Registrar pago</button></div></div>
                </div>
                <aside class="card sticky-card"><h3>Información del arrendador</h3><div style="display:flex;align-items:center;gap:1rem;margin:1rem 0"><div class="badge info" style="width:54px;height:54px;border-radius:50%;justify-content:center;font-size:1rem">${safe(owner.avatar || 'AR')}</div><div><strong>${safe(owner.name)}</strong><p class="small muted">${stars(ownerRating)} ${ownerRating||'Sin calificar'} en general</p><p class="small muted">${owner.verified?'✓ Verificado por administrador':'Pendiente de verificación'}</p></div></div><button class="btn-primary" style="width:100%;margin-bottom:.75rem" data-detail-action="message">Enviar mensaje</button><button class="btn-outline" style="width:100%;margin-bottom:.75rem" data-detail-action="visit">Solicitar visita</button><button class="btn-ghost" style="width:100%;margin-bottom:1rem" data-detail-action="report">Reportar publicación</button><h4>Ubicación</h4><div id="detail-map" class="real-map" style="min-height:220px;margin:.5rem 0"></div><p class="small muted">${safe(p.address)}</p></aside>
            </section>`;
        const detailMap = buildBaseMap('detail-map', { lat:p.lat, lng:p.lng, zoom:15 });
        renderPropertyMarkers(detailMap, [p], '#');
        function renderReviews(){
            const list=byId('reviews-list'); const rs=getDB().reviews.filter(r=>r.propertyId===p.id);
            list.innerHTML=rs.length?rs.map(r=>{ const flagged=reportCountFor(p.id, r.id)>=2; return `<div class="review-card"><div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><strong>${safe(r.userName)}</strong><span class="muted small">${stars(r.rating)} · ${r.createdAt}</span></div>${flagged?'<span class="badge report-flag">⚠ Reportes múltiples</span>':''}<p>${safe(r.text)}</p><button class="btn-ghost small" data-review-report="${r.id}">Reportar reseña</button></div>`; }).join(''):'<div class="alert info">Aún no hay reseñas.</div>';
        }
        renderReviews();
        document.addEventListener('click', e=>{
            const rBtn=e.target.closest('[data-review-report]'); if(rBtn){ reportReviewPrompt(p.id, rBtn.dataset.reviewReport); return; }
            const btn=e.target.closest('[data-detail-action]'); if(!btn) return;
            const action=btn.dataset.detailAction;
            if(action==='favorite'){ toggleFavorite(p.id); location.reload(); }
            if(action==='report') reportPrompt(p.id);
            if(action==='message') createOrOpenConversation(p.id, 'Hola, estoy interesado/a en esta vivienda. ¿Sigue disponible?');
            if(action==='visit') scheduleVisit(p.id);
            if(action==='contract') generateContract(p);
            if(action==='pay') simulatePayment(p);
        });
        byId('review-form')?.addEventListener('submit', e=>{
            e.preventDefault(); const db=getDB(); const exists=db.reviews.find(r=>r.propertyId===p.id && r.userId===user.id);
            if(exists){ toast('Ya registraste una reseña para esta publicación.'); return; }
            if(!hasContact(user.id, p.id)){ toast('Debes contactar al arrendador o programar una visita antes de dejar una reseña.'); return; }
            db.reviews.unshift({ id:'r'+Date.now(), propertyId:p.id, userId:user.id, userName:user.name, rating:Number(byId('review-rating').value), text:byId('review-text').value.trim() || 'Sin comentario', createdAt:new Date().toISOString().slice(0,10) }); setDB(db); toast('Reseña publicada y promedio actualizado.'); renderReviews();
        });
    }
    function createOrOpenConversation(propertyId, initialText){
        const db=getDB(); const user=currentUser(); const p=db.properties.find(x=>x.id===propertyId); let c=db.messages.find(x=>x.propertyId===propertyId && x.studentId===user.id);
        if(!c){ c={ id:'c'+Date.now(), propertyId, studentId:user.id, landlordId:p.ownerId, unreadFor:p.ownerId, messages:[] }; db.messages.push(c); }
        if(initialText){ c.messages.push({ from:user.id, text:initialText, at:new Date().toLocaleString('es-EC') }); c.unreadFor=p.ownerId; }
        setDB(db); location.href='mensajes.html?c='+c.id;
    }
    function scheduleVisit(propertyId){
        modal('Solicitar visita', `<div class="form-row"><div class="form-group"><label class="form-label">Fecha</label><input type="date" id="visit-date" class="form-control"></div><div class="form-group"><label class="form-label">Hora</label><input type="time" id="visit-time" class="form-control" value="18:00"></div></div>`, [{label:'Cancelar', class:'btn-outline'}, {label:'Guardar visita', class:'btn-primary', action:(m)=>{ const db=getDB(); const user=currentUser(); db.visits.push({id:'v'+Date.now(), propertyId, studentId:user.id, date:m.querySelector('#visit-date').value || new Date().toISOString().slice(0,10), time:m.querySelector('#visit-time').value || '18:00', status:'programada'}); setDB(db); toast('Visita programada.'); }}]);
    }
    function generateContract(p){
        const user=currentUser(), owner=ownerOf(p);
        modal('Contrato digital generado', `<p class="muted">Plantilla de contrato de arrendamiento estudiantil.</p><div class="alert info"><strong>Arrendador:</strong> ${safe(owner.name)}<br><strong>Arrendatario:</strong> ${safe(user.name)}<br><strong>Inmueble:</strong> ${safe(p.title)}<br><strong>Canon mensual:</strong> ${money(p.price)}<br><strong>Método:</strong> transferencia bancaria o tarjeta de débito. No se aceptan pagos en efectivo.</div><p>Este flujo representa la formalización segura del arriendo dentro de RoomiU.</p>`, [{label:'Cerrar', class:'btn-primary'}]);
    }
    function simulatePayment(p){
        const user=currentUser();
        modal('Registrar pago de arriendo', `<p>Selecciona un método de pago para registrar un comprobante registrado.</p><select id="pay-method" class="form-control"><option>Transferencia bancaria</option><option>Tarjeta de débito</option></select><p style="margin-top:1rem"><strong>Total:</strong> ${money(p.price)}</p>`, [{label:'Cancelar', class:'btn-outline'}, {label:'Confirmar pago', class:'btn-success', action:(m)=>{ const db=getDB(); db.payments.push({id:'pay'+Date.now(), propertyId:p.id, studentId:user.id, amount:p.price, method:m.querySelector('#pay-method').value, status:'registrado', createdAt:new Date().toISOString().slice(0,10)}); setDB(db); toast('Pago registrado y comprobante generado.'); }}]);
    }

    function initMessages(role='estudiante'){
        const roleFallback=role;
        const user=requireRole(role); if(!user) return;
        const db=getDB();
        const conversations=db.messages.filter(c=>roleFallback==='arrendador'?c.landlordId===user.id:c.studentId===user.id);
        let selected=queryParam('c') || conversations[0]?.id;
        function render(){
            const db=getDB(); const convs=db.messages.filter(c=>roleFallback==='arrendador'?c.landlordId===user.id:c.studentId===user.id);
            const list=byId('conversation-list'), chat=byId('chat-panel'); if(!list || !chat) return;
            list.innerHTML=convs.length?convs.map(c=>{
                const other=db.users.find(u=>u.id===(roleFallback==='arrendador'?c.studentId:c.landlordId)); const p=db.properties.find(p=>p.id===c.propertyId); const last=c.messages[c.messages.length-1];
                return `<div class="conversation-card ${c.id===selected?'active':''}" data-conv="${c.id}"><strong>${safe(other?.name||'Usuario')}</strong>${c.unreadFor===user.id?'<span class="badge danger" style="float:right">Nuevo</span>':''}<p class="small muted">${safe(p?.title||'Publicación')}</p><p class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safe(last?.text||'Sin mensajes')}</p></div>`;
            }).join(''):'<div class="alert info">No tienes conversaciones todavía.</div>';
            const c=db.messages.find(x=>x.id===selected) || convs[0]; if(!c){ chat.innerHTML='<div class="alert info">Selecciona una conversación.</div>'; return; }
            c.unreadFor = c.unreadFor===user.id ? null : c.unreadFor; setDB(db); refreshMessageBadges();
            const other=db.users.find(u=>u.id===(roleFallback==='arrendador'?c.studentId:c.landlordId)); const p=db.properties.find(p=>p.id===c.propertyId);
            chat.innerHTML=`<div><h3>${safe(other?.name || 'Usuario')}</h3><p class="small muted">Ref: ${safe(p?.title || 'Publicación')}</p></div><div class="chat-body">${c.messages.map(m=>`<div class="bubble ${m.from===user.id?'me':''}">${safe(m.text)}<div class="small" style="opacity:.75;margin-top:.25rem">${safe(m.at)}</div></div>`).join('')}</div><form id="chat-form" class="chat-input"><input id="chat-text" class="form-control" placeholder="Escribe un mensaje..." autocomplete="off"><button class="btn-primary">Enviar</button></form>`;
            byId('chat-form').onsubmit=e=>{ e.preventDefault(); const text=byId('chat-text').value.trim(); if(!text) return; const db=getDB(); const c=db.messages.find(x=>x.id===selected); c.messages.push({from:user.id,text,at:new Date().toLocaleString('es-EC')}); c.unreadFor=(roleFallback==='arrendador'?c.studentId:c.landlordId); setDB(db); render(); };
        }
        document.addEventListener('click', e=>{ const c=e.target.closest('[data-conv]'); if(c){ selected=c.dataset.conv; render(); }});
        render();
    }

    function initLandlordDashboard(){
        const user=requireRole('arrendador'); if(!user) return;
        const alert=byId('landlord-alert');
        function renderAlert(){
            const db=getDB(); const u=db.users.find(x=>x.id===user.id);
            let html='';
            if(!u.verified) html+='<div class="alert warning"><strong>Cuenta pendiente de verificación.</strong> Puedes preparar publicaciones, pero no se mostrarán públicamente hasta que el administrador apruebe tus documentos.</div>';
            if(u.verificationNotice && !u.verificationNotice.seen){
                const ok=u.verificationNotice.result==='approved';
                html+=`<div class="alert ${ok?'success':'danger'}"><strong>${ok?'Tu cuenta fue verificada.':'Tu verificación fue rechazada.'}</strong> ${ok?'Ya puedes activar y publicar tus viviendas.':'Revisa tus documentos y contacta al administrador.'}</div>`;
                u.verificationNotice.seen=true; setDB(db);
            }
            if(alert) alert.innerHTML=html;
        }
        renderAlert();
        function render(){
            const db=getDB(); const mine=db.properties.filter(p=>p.ownerId===user.id); const active=mine.filter(p=>p.active).length; const unread=db.messages.filter(c=>c.landlordId===user.id && c.unreadFor===user.id).length; const monthly=mine.filter(p=>p.active).reduce((a,b)=>a+b.price,0); const ownerRating=ownerAvgRating(user.id);
            byId('landlord-stats').innerHTML=`<div class="stat-card"><h3>${active}</h3><p>Propiedades activas</p></div><div class="stat-card"><h3>${mine.length}</h3><p>Total publicadas</p></div><div class="stat-card"><h3>${unread}</h3><p>Mensajes sin leer</p></div><div class="stat-card"><h3>${money(monthly)}</h3><p>Ingresos potenciales</p></div><div class="stat-card"><h3>${ownerRating||'—'}</h3><p>Calificación promedio</p></div>`;
            const list=byId('landlord-properties');
            list.innerHTML=mine.length?mine.map(p=>{ const flagged=reportCountFor(p.id)>=2; return `<article class="property-card"><div class="photo-placeholder">${photoOrPlaceholder(p.photosData)}</div><div class="property-details"><h3>${safe(p.title)}</h3><p class="small muted">${safe(p.type)} · ${p.distance} km · ${money(p.price)}/mes</p><p>${p.active?'<span class="badge success">Activo</span>':'<span class="badge warning">Inactivo</span>'} ${p.verified?'<span class="badge success">Verificado</span>':'<span class="badge warning">Pendiente verificación</span>'} ${flagged?'<span class="badge report-flag">⚠ Reportes múltiples</span>':''}</p><div class="service-list" style="margin-top:.5rem">${p.services.map(s=>`<span class="service-pill">${safe(s)}</span>`).join('')}</div></div><div class="property-actions"><a class="btn-outline" href="publicar.html?id=${p.id}">Editar</a><button class="${p.active?'btn-outline':'btn-primary'}" data-landlord-action="toggle" data-id="${p.id}">${p.active?'Desactivar':'Activar'}</button><button class="btn-danger" data-landlord-action="delete" data-id="${p.id}">Eliminar</button></div></article>`; }).join(''):'<div class="alert info">Aún no tienes propiedades.</div>';
        }
        document.addEventListener('click', e=>{
            const tabBtn=e.target.closest('[data-action="show-properties"], [data-action="show-profile"]');
            if(tabBtn){ e.preventDefault();
                const showProfile=tabBtn.dataset.action==='show-profile';
                byId('properties-section').style.display = showProfile?'none':'block';
                byId('landlord-profile-section').style.display = showProfile?'block':'none';
                document.querySelectorAll('.sidebar li').forEach(li=>li.classList.remove('active'));
                tabBtn.closest('li')?.classList.add('active');
                if(showProfile) renderLandlordProfile();
                return;
            }
            const b=e.target.closest('[data-landlord-action]'); if(!b) return; const db=getDB(); const p=db.properties.find(x=>x.id===b.dataset.id); if(!p) return;
            if(b.dataset.landlordAction==='toggle'){ if(!user.verified){ toast('Tu cuenta debe estar verificada antes de activar publicaciones.'); return; } p.active=!p.active; setDB(db); toast('Estado actualizado.'); render(); }
            if(b.dataset.landlordAction==='delete'){ if(confirm('¿Eliminar definitivamente esta publicación?')){ db.properties=db.properties.filter(x=>x.id!==p.id); setDB(db); toast('Publicación eliminada.'); render(); } }
        });
        function renderLandlordProfile(){
            const db=getDB(); const u=db.users.find(x=>x.id===user.id);
            byId('landlord-profile-panel').innerHTML=`<div class="card"><h3>Mi perfil</h3><p class="muted">Correo: ${safe(u.email)} (no editable).</p><div class="form-row"><div class="form-group"><label class="form-label">Nombre</label><input id="lp-name" class="form-control" value="${safe(u.name)}"></div><div class="form-group"><label class="form-label">Teléfono</label><input id="lp-phone" class="form-control" value="${safe(u.phone||'')}"></div></div><p class="small muted">${u.verified?'✓ Cuenta verificada':'Pendiente de verificación por el administrador'}</p><button class="btn-primary" id="lp-save">Guardar cambios</button></div>`;
            byId('lp-save').onclick=()=>{ const db=getDB(); const u2=db.users.find(x=>x.id===user.id); u2.name=byId('lp-name').value.trim()||u2.name; u2.phone=byId('lp-phone').value.trim(); setDB(db); toast('Perfil actualizado.'); };
        }
        render();
    }

    function initPublish(){
        const user=requireRole('arrendador'); if(!user) return;
        const db=getDB(); const editId=queryParam('id'); const p=db.properties.find(x=>x.id===editId && x.ownerId===user.id);
        const noteEl=byId('publish-verification-note');
        if(noteEl) noteEl.innerHTML = user.verified ? '' : '<div class="alert warning">Tu cuenta aún no está verificada. Puedes preparar la publicación, pero no se activará hasta que el administrador apruebe tu cédula y respaldo del inmueble.</div>';
        let currentPhotos = (p && p.photosData) ? p.photosData.slice() : [];
        let pickedLat = p ? p.lat : ESPE_LAT, pickedLng = p ? p.lng : ESPE_LNG;
        if(p){ byId('publish-title').textContent='EDITAR PROPIEDAD'; byId('prop-title').value=p.title; byId('prop-description').value=p.description; byId('prop-type').value=p.type; byId('prop-price').value=p.price; byId('prop-distance').value=p.distance; byId('prop-address').value=p.address; byId('prop-bedrooms').value=p.bedrooms || 1; document.querySelectorAll('[data-prop-service]').forEach(c=>c.checked=p.services.includes(c.value)); }
        function renderPhotoPreview(){
            const box=byId('photos-preview'); if(!box) return;
            box.innerHTML = currentPhotos.map((src,i)=>`<div class="photo-thumb"><img src="${src}" alt="Foto ${i+1}"><button type="button" class="remove-photo" data-remove-photo="${i}">×</button></div>`).join('');
        }
        renderPhotoPreview();
        byId('prop-photos-input')?.addEventListener('change', async e=>{
            const newOnes = await readFilesAsDataURLs(e.target.files);
            currentPhotos = currentPhotos.concat(newOnes).slice(0,10);
            renderPhotoPreview();
            e.target.value='';
        });
        byId('photos-preview')?.addEventListener('click', e=>{
            const btn=e.target.closest('[data-remove-photo]'); if(!btn) return;
            currentPhotos.splice(Number(btn.dataset.removePhoto),1); renderPhotoPreview();
        });
        buildPickableMap('publish-map', pickedLat, pickedLng, latlng=>{ pickedLat=latlng.lat; pickedLng=latlng.lng; byId('prop-lat').value=latlng.lat; byId('prop-lng').value=latlng.lng; });
        const form=byId('publish-form');
        form?.addEventListener('submit', e=>{ e.preventDefault(); const db=getDB(); const services=Array.from(document.querySelectorAll('[data-prop-service]:checked')).map(x=>x.value); if(services.length<1){ toast('Selecciona al menos un servicio.'); return; }
            if(currentPhotos.length<2 || currentPhotos.length>10){ toast('El requisito RF-007 exige mínimo 2 y máximo 10 fotos.'); return; }
            const data={ ownerId:user.id, title:byId('prop-title').value.trim(), description:byId('prop-description').value.trim(), type:byId('prop-type').value, price:Number(byId('prop-price').value), distance:Number(byId('prop-distance').value), address:byId('prop-address').value.trim(), services, bedrooms:Number(byId('prop-bedrooms').value||1), photosData:currentPhotos.slice(), active:user.verified, verified:user.verified, lat:Number(byId('prop-lat').value)||pickedLat, lng:Number(byId('prop-lng').value)||pickedLng, createdAt:p?p.createdAt:new Date().toISOString().slice(0,10) };
            if(!data.title || !data.description || !data.price || !data.address){ toast('Completa todos los campos obligatorios.'); return; }
            if(p){ Object.assign(p,data); } else { data.id='p'+Date.now(); db.properties.push(data); }
            setDB(db); toast(user.verified?'Publicación guardada y activa.':'Publicación guardada como borrador hasta verificación.'); setTimeout(()=>location.href='dashboard.html', 700);
        });
        byId('save-draft')?.addEventListener('click', ()=>toast('Progreso guardado en el navegador.'));
    }

    function initAdmin(){
        const admin=requireRole('admin'); if(!admin) return;
        function render(){
            const db=getDB(); const users=db.users; const props=db.properties; const reports=db.reports;
            const weekAgo=Date.now()-7*24*60*60*1000;
            const recent=users.filter(u=>u.createdAt && new Date(u.createdAt).getTime()>=weekAgo).length;
            byId('admin-stats').innerHTML=`<div class="stat-card"><h3>${users.length}</h3><p>Usuarios totales</p></div><div class="stat-card"><h3>${users.filter(u=>u.role==='arrendador'&&u.verified).length}</h3><p>Arrendadores verificados</p></div><div class="stat-card"><h3>${props.filter(p=>p.active).length}</h3><p>Publicaciones activas</p></div><div class="stat-card"><h3>${reports.filter(r=>r.status==='pendiente').length}</h3><p>Reportes pendientes</p></div><div class="stat-card"><h3>${recent}</h3><p>Nuevos registros (7 días)</p></div>`;
            byId('pending-landlords').innerHTML=users.filter(u=>u.role==='arrendador'&&!u.verified).map(u=>`<div class="user-row"><div><strong>${safe(u.name)}</strong><p class="small muted">${safe(u.email)} · docs: cédula ${u.docs?.cedula?'✓':'—'}, predial ${u.docs?.predial?'✓':'—'}</p></div><div style="display:flex;gap:.5rem;margin-top:.75rem"><button class="btn-success" data-admin-action="approve" data-id="${u.id}">Aprobar</button><button class="btn-danger" data-admin-action="reject" data-id="${u.id}">Rechazar</button></div></div>`).join('') || '<div class="alert success">No hay solicitudes pendientes.</div>';
            byId('reports-list').innerHTML=reports.map(r=>{
                const p=props.find(x=>x.id===r.propertyId);
                const count = reportCountFor(r.propertyId, r.reviewId||null);
                const flagged = count>=2;
                return `<div class="report-card"><strong>${safe(r.type)}: ${safe(p?.title||'Sin publicación')}</strong> ${r.status==='pendiente'?'<span class="badge danger">Pendiente</span>':'<span class="badge success">Revisado</span>'} ${flagged?`<span class="badge report-flag">⚠ ${count} reportes</span>`:''}<p class="small muted">${safe(r.reason)}</p><div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap"><button class="btn-outline" data-admin-action="keep" data-id="${r.id}">Mantener</button><button class="btn-danger" data-admin-action="hide" data-id="${r.id}">Ocultar</button><button class="btn-danger" data-admin-action="delete-content" data-id="${r.id}">Eliminar contenido</button></div></div>`;
            }).join('') || '<div class="alert info">No hay reportes registrados.</div>';
            byId('users-table').innerHTML=users.map(u=>`<tr><td>${safe(u.name)}</td><td>${safe(u.role)}</td><td>${u.active?'<span class="badge success">Activo</span>':'<span class="badge danger">Inactivo</span>'}</td><td>${u.verified?'<span class="badge success">Verificado</span>':'<span class="badge warning">Pendiente</span>'}</td><td style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn-outline" data-admin-action="toggle-user" data-id="${u.id}">${u.active?'Desactivar':'Activar'}</button>${u.role!=='admin'?`<button class="btn-danger" data-admin-action="delete-user" data-id="${u.id}">Eliminar</button>`:''}</td></tr>`).join('');
            const log=db.auditLog||[];
            byId('audit-log').innerHTML=log.length?log.slice(0,15).map(a=>`<div class="audit-entry"><strong>${safe(a.action)}</strong> — ${safe(a.target)}<br><span class="small">Motivo: ${safe(a.reason)} · ${safe(a.adminName)} · ${safe(a.at)}</span></div>`).join(''):'<p class="muted small">Aún no hay acciones registradas.</p>';
        }
        document.addEventListener('click', e=>{
            const b=e.target.closest('[data-admin-action]'); if(!b) return; const id=b.dataset.id; const action=b.dataset.adminAction;
            if(action==='approve' || action==='reject'){
                promptReason(action==='approve'?'Aprobar arrendador':'Rechazar arrendador', reason=>{
                    const db=getDB(); const u=db.users.find(x=>x.id===id); const wasApprove=action==='approve';
                    u.verified=wasApprove; u.active=wasApprove;
                    u.verificationNotice={ result: wasApprove?'approved':'rejected', seen:false, at:new Date().toLocaleString('es-EC') };
                    db.properties.filter(p=>p.ownerId===id).forEach(p=>{ p.verified=u.verified; p.active=u.verified && p.active; });
                    setDB(db); logAudit(admin.id, wasApprove?'Aprobó arrendador':'Rechazó arrendador', u.name, reason);
                    toast(wasApprove?'Arrendador aprobado. Se le notificará al ingresar.':'Arrendador rechazado. Se le notificará al ingresar.'); render();
                }); return;
            }
            if(action==='toggle-user'){
                promptReason('Cambiar estado de usuario', reason=>{
                    const db=getDB(); const u=db.users.find(x=>x.id===id); u.active=!u.active; setDB(db);
                    logAudit(admin.id, u.active?'Activó usuario':'Desactivó usuario', u.name, reason);
                    toast('Estado de usuario actualizado.'); render();
                }); return;
            }
            if(action==='delete-user'){
                promptReason('Eliminar usuario', reason=>{
                    const db=getDB(); const u=db.users.find(x=>x.id===id); if(!u) return;
                    if(!confirm(`¿Eliminar definitivamente la cuenta de ${u.name}?`)) return;
                    db.users=db.users.filter(x=>x.id!==id);
                    if(u.role==='arrendador') db.properties=db.properties.filter(p=>p.ownerId!==id);
                    setDB(db); logAudit(admin.id, 'Eliminó usuario', u.name, reason);
                    toast('Usuario eliminado.'); render();
                }); return;
            }
            if(action==='keep' || action==='hide'){
                const db=getDB(); const r=db.reports.find(x=>x.id===id); r.status='revisado';
                if(action==='hide'){ const p=db.properties.find(x=>x.id===r.propertyId); if(p) p.active=false; toast('Publicación ocultada.'); logAudit(admin.id, 'Ocultó publicación reportada', p?.title||r.propertyId, 'Reporte revisado'); }
                else { toast('Reporte marcado como revisado.'); logAudit(admin.id, 'Mantuvo contenido reportado', r.propertyId, 'Reporte revisado sin acción'); }
                setDB(db); render(); return;
            }
            if(action==='delete-content'){
                promptReason('Eliminar contenido reportado', reason=>{
                    const db=getDB(); const r=db.reports.find(x=>x.id===id); if(!r) return;
                    let label=r.propertyId;
                    if(r.type==='reseña' && r.reviewId){ db.reviews=db.reviews.filter(x=>x.id!==r.reviewId); label='reseña '+r.reviewId; }
                    else { const p=db.properties.find(x=>x.id===r.propertyId); label=p?p.title:r.propertyId; db.properties=db.properties.filter(x=>x.id!==r.propertyId); }
                    r.status='revisado'; setDB(db); logAudit(admin.id, 'Eliminó contenido reportado', label, reason);
                    toast('Contenido eliminado.'); render();
                }); return;
            }
        });
        render();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initCommon();
        const p=pageName();
        if(p==='index.html') initIndex();
        if(p==='login.html') initLogin();
        if(p==='registro.html') initRegister();
        if(location.pathname.includes('/estudiante/dashboard.html')) initStudentDashboard();
        if(location.pathname.includes('/estudiante/detalle.html')) initDetail();
        if(location.pathname.includes('/estudiante/mensajes.html')) initMessages('estudiante');
        if(location.pathname.includes('/arrendador/dashboard.html')) initLandlordDashboard();
        if(location.pathname.includes('/arrendador/publicar.html')) initPublish();
        if(location.pathname.includes('/arrendador/mensajes.html')) initMessages('arrendador');
        if(location.pathname.includes('/admin/dashboard.html')) initAdmin();
    });
})();
