import firebaseConfig from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, deleteDoc, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const APP_VERSION = "0.20"; // Update Fix
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzDnntVSx2XEPLR5JSOVZYnw47Z-LNCojlDehl4tLmIVI3n_DnPD0T4qoV_WPruJjzc/exec"; 

const appInstance = initializeApp(firebaseConfig);
const auth = getAuth(appInstance);
const db = getFirestore(appInstance);
const provider = new GoogleAuthProvider();

let currentUser = null;
let userData = null;
let currentQrData = {}; 
let myQrList = [];
const root = document.getElementById('app-root'); 

const app = {
    async init() {
        const verEl = document.getElementById('app-version');
        if(verEl) verEl.innerText = APP_VERSION;

        const urlParams = new URLSearchParams(window.location.search);
        const qrId = urlParams.get('id');

        if (qrId) {
            await this.loadPage('viewer');
            this.loadViewerData(qrId);
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    currentUser = user;
                    await this.syncUser(user);
                    this.updateSidebar(true);
                } else {
                    this.updateSidebar(false);
                }
            });
        } else {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    currentUser = user;
                    await this.syncUser(user);
                    await this.loadPage('dashboard');
                    this.updateSidebar(true);
                    this.nav('create'); 
                    this.checkUnreadMessages(); 
                } else {
                    await this.loadPage('login');
                    this.updateSidebar(false);
                }
                document.getElementById('loading-overlay').classList.add('hidden');
            });
        }
    },

    async loadPage(pageName) {
        try {
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) throw new Error("Page not found");
            root.innerHTML = await response.text();
        } catch (e) {
            console.error(e);
            root.innerHTML = "<p class='text-center p-5'>Lỗi tải trang. Vui lòng F5.</p>";
        }
    },

    // --- AUTH ---
    async login() { try { await signInWithPopup(auth, provider); } catch (e) { alert(e.message); } },
    async logout() { await signOut(auth); window.location.reload(); },
    
    async syncUser(user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            userData = snap.data();
            if (userData.lastDate !== new Date().toDateString()) {
                await updateDoc(userRef, { lastDate: new Date().toDateString(), dailyCount: 0 });
                userData.dailyCount = 0;
            }
        } else {
            userData = { uid: user.uid, email: user.email, displayName: user.displayName, dailyLimit: 5, dailyCount: 0, lastDate: new Date().toDateString(), isVip: false, createdAt: new Date().toISOString() };
            await setDoc(userRef, userData);
        }
    },
    updateSidebar(isLogin) {
        if (isLogin) {
            document.getElementById('menu-user').classList.remove('hidden'); document.getElementById('menu-guest').classList.add('hidden');
            document.getElementById('u-name').innerText = userData.displayName; document.getElementById('u-quota').innerText = `${userData.dailyCount}/${userData.dailyLimit}`;
        } else { document.getElementById('menu-user').classList.add('hidden'); document.getElementById('menu-guest').classList.remove('hidden'); }
    },
    async checkUnreadMessages() {
        try {
            const q = query(collection(db, "messages"), where("toUid", "==", currentUser.uid), where("read", "==", false));
            const snap = await getDocs(q);
            const badge = document.getElementById('msg-badge');
            if(badge) {
                badge.classList.toggle('hidden', snap.size === 0); 
                badge.innerText = snap.size;
            }
        } catch (e) {}
    },

    // --- NAVIGATION (ĐÃ SỬA LỖI & TỐI ƯU) ---
    async nav(tabId) {
        const sidebarEl = document.getElementById('sidebar');
        const sidebarInstance = bootstrap.Offcanvas.getInstance(sidebarEl);
        if (sidebarInstance) sidebarInstance.hide();

        // 1. Xử lý các trang đặc biệt
        if (tabId === 'feedback') { await this.loadPage('feedback'); return; }
        if (tabId === 'back_to_viewer') {
            await this.loadPage('viewer');
            if (currentQrData.id) this.loadViewerData(currentQrData.id);
            return;
        }
        if (tabId === 'guide') { await this.loadPage('huongdan'); return; }

        // 2. Reset URL nếu đang ở chế độ xem
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('id')) {
            window.history.pushState({}, document.title, window.location.pathname);
            await this.loadPage('dashboard');
        }

        // 3. Đảm bảo Dashboard đã load
        // Sửa lỗi: Kiểm tra kỹ xem view-create có tồn tại không, nếu không thì load lại dashboard
        if (!document.getElementById('view-create')) { 
            await this.loadPage('dashboard'); 
        }

        // 4. Chuyển Tab (Ẩn tất cả -> Hiện tab chọn)
        ['view-create', 'view-list', 'view-inbox'].forEach(id => {
            const el = document.getElementById(id); 
            if(el) el.classList.add('hidden');
        });
        
        const target = document.getElementById('view-' + tabId);
        if(target) {
            target.classList.remove('hidden');
        } else {
            console.error("Không tìm thấy tab: " + tabId);
            // Fallback: Nếu lỗi không tìm thấy view thì load lại dashboard
            await this.loadPage('dashboard');
            document.getElementById('view-create').classList.remove('hidden');
            return; 
        }

        // 5. Load dữ liệu cho từng tab
        if (tabId === 'list') this.loadListQR();
        if (tabId === 'inbox') this.loadInbox();
    },

    // --- LOGIC ---
    addBranding(containerId) {
        const div = document.getElementById(containerId); const canvas = div.querySelector('canvas'); if (!canvas) return null;
        const ctx = canvas.getContext('2d'); const size = canvas.width;
        const text = "THEGIOIQR"; const fontSize = size * 0.08; ctx.font = `900 ${fontSize}px Inter, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const textWidth = ctx.measureText(text).width; const boxWidth = textWidth + (size * 0.05); const boxHeight = fontSize * 1.8; const centerX = size / 2; const centerY = size / 2;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);
        ctx.strokeStyle = "#4361ee"; ctx.lineWidth = 2; ctx.strokeRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);
        ctx.fillStyle = "#4361ee"; ctx.fillText(text, centerX, centerY); return canvas.toDataURL("image/png");
    },

    async createQR() {
        if (userData.dailyCount >= userData.dailyLimit) return alert("Hết lượt."); const title = document.getElementById('inp-title').value; const link = document.getElementById('inp-link').value; const desc = document.getElementById('inp-desc').value; if (!link) return alert("Thiếu link!");
        const btn = document.querySelector('#view-create button'); const txt = btn.innerText; btn.innerText = "Đang xử lý..."; btn.disabled = true; document.getElementById('loading-overlay').classList.remove('hidden');
        try {
            const docRef = await addDoc(collection(db, "qr_codes"), { title, desc, link, createdBy: currentUser.uid, ownerName: userData.displayName, createdAt: new Date().toISOString(), views: 0, viewLimit: userData.isVip ? 999999 : 100, qrImageURL: "" });
            const sUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            document.getElementById('qr-img').innerHTML = ""; new QRCode(document.getElementById('qr-img'), { text: sUrl, width: 250, height: 250, correctLevel: QRCode.CorrectLevel.H }); await new Promise(r => setTimeout(r, 300));
            const imgData = this.addBranding('qr-img');
            if (imgData) {
                 btn.innerText = "Lưu Drive...";
                 const res = await fetch(GAS_API_URL, { method: "POST", body: JSON.stringify({ base64: imgData, filename: `QR_${docRef.id}.png` }) });
                 const rs = await res.json(); if(rs.status==="success") await updateDoc(docRef, { qrImageURL: rs.url });
            }
            await updateDoc(doc(db, "users", currentUser.uid), { dailyCount: userData.dailyCount + 1 }); userData.dailyCount++; document.getElementById('u-quota').innerText = `${userData.dailyCount}/${userData.dailyLimit}`;
            document.getElementById('new-qr').classList.remove('hidden'); document.getElementById('inp-title').value = ""; document.getElementById('inp-link').value = "";
        } catch (e) { alert(e.message); } finally { document.getElementById('loading-overlay').classList.add('hidden'); btn.innerText = txt; btn.disabled = false; }
    },
    
    dlQR() { const img = document.querySelector('#qr-img img'); if(img) { const a = document.createElement('a'); a.download = 'TheGioiQR.png'; a.href = img.src; a.click(); } },
    
    // --- LOAD LIST QR (FIX LỖI) ---
    async loadListQR() {
        const container = document.getElementById('list-container');
        if (!container) return; // Bảo vệ nếu container chưa load
        
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
        
        if (!currentUser) {
            container.innerHTML = '<p class="text-center text-danger">Vui lòng đăng nhập lại.</p>';
            return;
        }

        try {
            const q = query(collection(db, "qr_codes"), where("createdBy", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            
            myQrList = [];
            snap.forEach(doc => myQrList.push({ id: doc.id, ...doc.data() }));
            
            this.renderQRList(myQrList);
        } catch (e) {
            console.error(e);
            // Nếu lỗi Index, hiển thị hướng dẫn
            if (e.message.includes("index")) {
                container.innerHTML = '<p class="text-center text-danger small">Lỗi: Thiếu Index Database.<br>Vui lòng mở Console (F12) để lấy link tạo Index.</p>';
            } else {
                container.innerHTML = '<p class="text-center text-muted">Chưa có dữ liệu.</p>';
            }
        }
    },

    renderQRList(list) {
        const c = document.getElementById('list-container'); 
        if(!c) return;
        if(list.length===0) {c.innerHTML='<div class="text-center text-muted py-4">Bạn chưa tạo mã QR nào.</div>'; return;} 
        c.innerHTML="";
        
        list.forEach(d => {
            // Check an toàn dữ liệu
            const title = d.title || 'Không tiêu đề';
            const views = d.views || 0;
            const limit = d.viewLimit || 100;
            const date = d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : '---';
            const imgUrl = d.qrImageURL || '';

            c.innerHTML += `
            <div class="qr-list-item shadow-sm border-0 mb-3" style="border-radius:12px;padding:15px;background:#fff;">
                <div class="d-flex justify-content-between mb-1">
                    <strong class="text-primary text-truncate" style="max-width:65%">${title}</strong>
                    <span class="badge bg-success rounded-pill">${views}/${limit}</span>
                </div>
                <div class="small text-muted mb-2">${date}</div>
                <div class="d-flex justify-content-between pt-2 border-top">
                    <div class="text-truncate small text-muted pe-2" style="max-width:50%">${d.desc||''}</div>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm text-dark" onclick="app.showStoredQR('${d.id}','${imgUrl}','${title}')" title="Xem mã"><i class="fas fa-qrcode"></i></button>
                        <button class="btn btn-sm text-secondary" onclick="window.open('?id=${d.id}','_blank')" title="Xem trang"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm text-primary" onclick="app.openEdit('${d.id}')"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-sm text-danger" onclick="app.deleteQR('${d.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
        });
    },

    filterList() { const t = document.getElementById('search-qr').value.toLowerCase(); this.renderQRList(myQrList.filter(q => (q.title||"").toLowerCase().includes(t))); },
    
    showStoredQR(id, url, title) { 
        document.getElementById('modal-qr-title').innerText = title; 
        const t = document.getElementById('modal-qr-target'); 
        t.innerHTML = "";
        
        if(url && url.length > 10) { 
            // Có link ảnh từ Drive
            t.innerHTML = `<img src="${url}" style="width:200px; height:auto; border-radius:10px;" crossorigin="anonymous">`; 
            new bootstrap.Modal(document.getElementById('qrShowModal')).show(); 
        } else { 
            // Không có link, tạo lại
            this.showQR(id, title); 
        } 
    },
    
    showQR(id, title) { 
        document.getElementById('modal-qr-target').innerHTML=""; 
        const u = `${window.location.origin}${window.location.pathname}?id=${id}`; 
        document.getElementById('modal-qr-title').innerText=title; 
        new bootstrap.Modal(document.getElementById('qrShowModal')).show(); 
        setTimeout(()=>{ 
            new QRCode(document.getElementById('modal-qr-target'),{text:u,width:250,height:250,correctLevel:QRCode.CorrectLevel.H}); 
            setTimeout(()=>{this.addBranding('modal-qr-target')},100); 
        },300); 
    },
    
    downloadExistingQR() { const d=document.getElementById('modal-qr-target'); const i=d.querySelector('img'); const c=d.querySelector('canvas'); if(i&&i.src) { fetch(i.src).then(r=>r.blob()).then(b=>{const u=window.URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='QR.png';document.body.appendChild(a);a.click();window.URL.revokeObjectURL(u);}).catch(()=>alert('Giữ ảnh để lưu')); return; } if(c) {const a=document.createElement('a');a.download='QR.png';a.href=c.toDataURL('image/png');a.click();} },
    
    async openEdit(id) { try{const d = await getDoc(doc(db,"qr_codes",id)); if(d.exists()){const dt=d.data(); document.getElementById('edit-id').value=id;document.getElementById('edit-title').value=dt.title;document.getElementById('edit-desc').value=dt.desc;document.getElementById('edit-link').value=dt.link;new bootstrap.Modal(document.getElementById('editModal')).show();} }catch(e){} },
    async saveEdit() { const id=document.getElementById('edit-id').value; const t=document.getElementById('edit-title').value; const d=document.getElementById('edit-desc').value; const l=document.getElementById('edit-link').value; await updateDoc(doc(db,"qr_codes",id),{title:t,desc:d,link:l}); bootstrap.Modal.getInstance(document.getElementById('editModal')).hide(); this.loadListQR(); alert('Đã cập nhật!'); },
    async deleteQR(id) { if(confirm('Bạn có chắc muốn xóa?')) { await deleteDoc(doc(db,"qr_codes",id)); this.loadListQR(); } },
    
    async loadInbox() {
        const c = document.getElementById('inbox-container'); if(!c) return; c.innerHTML='Loading...';
        try {
            const q = query(collection(db,"messages"), where("toUid","==",currentUser.uid), orderBy("createdAt","desc"));
            const s = await getDocs(q); document.getElementById('msg-badge').classList.add('hidden');
            if(s.empty) {c.innerHTML='<p class="text-center text-muted">Hộp thư trống.</p>'; return;} 
            c.innerHTML="";
            s.forEach(async d => {
                const m = d.data(); if(m.read===false) await updateDoc(doc(db,"messages",d.id),{read:true});
                const bd = m.type==='feedback' ? 'border-success bg-success bg-opacity-10' : 'border-primary bg-white';
                const ic = m.type==='feedback' ? '⭐' : '💬';
                c.innerHTML += `<div class="p-3 mb-2 rounded border border-2 ${bd}"><div class="d-flex justify-content-between"><strong>${ic} ${m.senderName}</strong><small>${new Date(m.createdAt).toLocaleDateString()}</small></div><p class="mb-1 small">${m.content}</p><small class="text-muted">Mã: ${m.qrTitle}</small></div>`;
            });
            this.checkUnreadMessages();
        } catch(e) { c.innerHTML='Lỗi tải inbox'; }
    },
    async loadViewerData(id) {
        try {
            const s = await getDoc(doc(db,"qr_codes",id)); if(!s.exists()) throw new Error('404');
            const d = s.data(); currentQrData = {id:id, owner:d.createdBy, title:d.title};
            if(d.views>=d.viewLimit) { document.getElementById('main-content').classList.add('hidden'); document.getElementById('limit-warning').classList.remove('hidden'); }
            else updateDoc(doc(db,"qr_codes",id), {views: increment(1)});
            document.getElementById('v-title').innerText = d.title; document.getElementById('v-desc').innerText = d.desc; document.getElementById('v-owner').innerText = d.ownerName; document.getElementById('v-btn').href = d.link;
            const u = await getDoc(doc(db,"users",d.createdBy)); if(u.exists()&&u.data().isVip) document.getElementById('banner-container').classList.add('hidden');
            document.getElementById('loading-overlay').classList.add('hidden');
        } catch(e) { document.getElementById('app-root').innerHTML='<h4 class="text-center p-5">Mã không tồn tại</h4>'; document.getElementById('loading-overlay').classList.add('hidden'); }
    },
    async sendMsg() {
        if (!currentQrData.owner) return alert("Lỗi owner"); const s=document.getElementById('msg-sender').value||"Ẩn danh"; const c=document.getElementById('msg-content').value; if(!c)return alert("Nhập nội dung!");
        await addDoc(collection(db,"messages"),{toUid:currentQrData.owner,type:'message',senderName:s,content:c,qrTitle:currentQrData.title,createdAt:new Date().toISOString(),read:false});
        alert("Đã gửi tin!"); bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
    },
    async sendFeedback() {
        if (!currentQrData.owner) return alert("Lỗi owner");
        const r = document.querySelector('input[name="fb-rating"]:checked').value || "neutral";
        const tags = []; document.querySelectorAll('.tag-check:checked').forEach(c=>tags.push(c.value));
        const note = document.getElementById('fb-note').value;
        const c = `[${r.toUpperCase()}] ${tags.join(', ')} ${note?'- '+note:''}`;
        const btn = document.querySelector('button[onclick="app.sendFeedback()"]'); btn.innerText="Gửi..."; btn.disabled=true;
        try {
            await addDoc(collection(db,"messages"),{toUid:currentQrData.owner,type:'feedback',senderName:"Góp ý",content:c,qrTitle:currentQrData.title,createdAt:new Date().toISOString(),read:false});
            alert("Đã gửi!"); this.nav('back_to_viewer');
        } catch(e) { alert(e.message); btn.innerText="Gửi"; btn.disabled=false; }
    },
    showLogin() { window.location.href = window.location.protocol + "//" + window.location.host + window.location.pathname; }
};
window.app = app; app.init();
