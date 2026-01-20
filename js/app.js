import firebaseConfig from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, deleteDoc, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const APP_VERSION = "0.24"; // QR có khung và tiêu đề nén
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
            const response = await fetch(`pages/${pageName}.html?v=${APP_VERSION}`);
            if (!response.ok) throw new Error("Page not found");
            root.innerHTML = await response.text();
        } catch (e) {
            console.error(e);
            root.innerHTML = `<div class="text-center p-5"><i class="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i><p>Lỗi tải trang. Vui lòng F5.</p></div>`;
        }
    },

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
            if(badge) { badge.classList.toggle('hidden', snap.size === 0); badge.innerText = snap.size; }
        } catch (e) {}
    },

    async nav(tabId) {
        const sidebarEl = document.getElementById('sidebar');
        const sidebarInstance = bootstrap.Offcanvas.getInstance(sidebarEl);
        if (sidebarInstance) sidebarInstance.hide();

        if (tabId === 'feedback') { await this.loadPage('feedback'); setTimeout(() => { const t = document.getElementById('fb-qr-title'); if(t) t.innerText = currentQrData.title ? `Về: ${currentQrData.title}` : "Góp ý chung"; }, 100); return; }
        if (tabId === 'back_to_viewer') { await this.loadPage('viewer'); if (currentQrData.id) this.loadViewerData(currentQrData.id); return; }
        if (tabId === 'guide') { await this.loadPage('huongdan'); return; }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('id')) {
            window.history.pushState({}, document.title, window.location.pathname);
            await this.loadPage('dashboard');
        }

        let targetView = document.getElementById('view-' + tabId);
        if (!targetView) {
            await this.loadPage('dashboard');
            targetView = document.getElementById('view-' + tabId);
        }
        if (!targetView) {
            await this.loadPage('dashboard');
            document.getElementById('view-create').classList.remove('hidden');
            return;
        }

        ['view-create', 'view-list', 'view-inbox'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        targetView.classList.remove('hidden');

        if (tabId === 'list') this.loadListQR();
        if (tabId === 'inbox') this.loadInbox();
    },

    // --- XỬ LÝ ẢNH: THÊM KHUNG, TIÊU ĐỀ & LOGO (MỚI) ---
    async addFrameAndTitle(containerId, titleText) {
        const div = document.getElementById(containerId);
        const sourceCanvas = div.querySelector('canvas');
        if (!sourceCanvas) return null;

        // 1. Lưu ảnh QR gốc ra một đối tượng ảnh tạm thời
        const tempImg = new Image();
        tempImg.src = sourceCanvas.toDataURL();
        // Phải đợi ảnh load xong mới vẽ tiếp được
        await new Promise(r => tempImg.onload = r);

        const ctx = sourceCanvas.getContext('2d');
        const originalSize = sourceCanvas.width; // Kích thước QR gốc (VD: 250px)
        
        // --- CẤU HÌNH GIAO DIỆN ---
        const primaryColor = "#4361ee";
        const frameThickness = 6; // Độ dày khung
        const bottomBarHeight = 50; // Chiều cao vùng chứa tên bên dưới
        const titleFontSize = 18;
        // ---------------------------

        // 2. Tính toán kích thước mới cho Canvas
        const newWidth = originalSize + (frameThickness * 2);
        const newHeight = originalSize + (frameThickness * 2) + bottomBarHeight;

        // Resize Canvas
        sourceCanvas.width = newWidth;
        sourceCanvas.height = newHeight;

        // 3. Tô nền trắng toàn bộ
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, newWidth, newHeight);

        // 4. Vẽ lại ảnh QR gốc vào bên trong khung
        // Dịch chuyển vào trong một đoạn bằng độ dày khung
        ctx.drawImage(tempImg, frameThickness, frameThickness);

        // 5. Vẽ khung viền ngoài
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = frameThickness;
        // Vẽ lùi vào 1/2 độ dày để nét vẽ không bị liếm ra ngoài canvas
        ctx.strokeRect(frameThickness/2, frameThickness/2, newWidth - frameThickness, newHeight - frameThickness);

        // 6. Vẽ tiêu đề ở đáy (Có nén ngang nếu dài)
        if (titleText) {
            ctx.fillStyle = primaryColor; // Màu chữ theo màu khung
            ctx.font = `bold ${titleFontSize}px 'Inter', sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const textCenterY = newHeight - (bottomBarHeight / 2);
            const textCenterX = newWidth / 2;
            const maxTextWidth = newWidth - (frameThickness * 4); // Padding 2 bên

            // Đo chiều dài thực tế của text
            const textMetrics = ctx.measureText(titleText);
            const currentTextWidth = textMetrics.width;

            // Tính tỉ lệ nén (scaleX) nếu text quá dài
            let scaleX = 1;
            if (currentTextWidth > maxTextWidth) {
                scaleX = maxTextWidth / currentTextWidth;
            }

            // Lưu trạng thái, thực hiện biến hình (nén), vẽ, rồi khôi phục
            ctx.save();
            ctx.translate(textCenterX, textCenterY);
            ctx.scale(scaleX, 1); // Nén ngang
            ctx.fillText(titleText, 0, 0);
            ctx.restore();
        }

        // 7. Vẽ Logo trung tâm (THEGIOIQR) - Logic cũ nhưng tính toán lại vị trí tâm
        const qrCenterX = frameThickness + (originalSize / 2);
        const qrCenterY = frameThickness + (originalSize / 2);
        
        const logoText = "THEGIOIQR";
        const logoFontSize = originalSize * 0.08;
        ctx.font = `900 ${logoFontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const logoTextWidth = ctx.measureText(logoText).width;
        const boxWidth = logoTextWidth + (originalSize * 0.05);
        const boxHeight = logoFontSize * 1.8;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrCenterX - boxWidth/2, qrCenterY - boxHeight/2, boxWidth, boxHeight);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(qrCenterX - boxWidth/2, qrCenterY - boxHeight/2, boxWidth, boxHeight);
        ctx.fillStyle = primaryColor;
        ctx.fillText(logoText, qrCenterX, qrCenterY);

        return sourceCanvas.toDataURL("image/png");
    },

    async createQR() {
        if (userData.dailyCount >= userData.dailyLimit) return alert("Hết lượt."); 
        const title = document.getElementById('inp-title').value || "Tài liệu không tên"; // Fallback nếu không nhập tên
        const link = document.getElementById('inp-link').value; 
        const desc = document.getElementById('inp-desc').value; 
        if (!link) return alert("Thiếu link!");

        const btn = document.querySelector('#view-create button'); 
        const txt = btn.innerText; 
        btn.innerText = "Đang xử lý..."; btn.disabled = true; 
        document.getElementById('loading-overlay').classList.remove('hidden');

        try {
            const docRef = await addDoc(collection(db, "qr_codes"), { title, desc, link, createdBy: currentUser.uid, ownerName: userData.displayName, createdAt: new Date().toISOString(), views: 0, viewLimit: userData.isVip ? 999999 : 100, qrImageURL: "" });
            const sUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            
            // Vẽ QR gốc
            document.getElementById('qr-img').innerHTML = ""; 
            new QRCode(document.getElementById('qr-img'), { text: sUrl, width: 250, height: 250, correctLevel: QRCode.CorrectLevel.H }); 
            await new Promise(r => setTimeout(r, 300)); 
            
            // GỌI HÀM MỚI: Thêm khung và tiêu đề (Async)
            const imgData = await this.addFrameAndTitle('qr-img', title);

            if (imgData) {
                 btn.innerText = "Lưu Drive...";
                 const res = await fetch(GAS_API_URL, { method: "POST", body: JSON.stringify({ base64: imgData, filename: `QR_${docRef.id}.png` }) });
                 const rs = await res.json(); if(rs.status==="success") await updateDoc(docRef, { qrImageURL: rs.url });
            }
            await updateDoc(doc(db, "users", currentUser.uid), { dailyCount: userData.dailyCount + 1 }); userData.dailyCount++; document.getElementById('u-quota').innerText = `${userData.dailyCount}/${userData.dailyLimit}`;
            document.getElementById('new-qr').classList.remove('hidden'); document.getElementById('inp-title').value = ""; document.getElementById('inp-link').value = "";
        } catch (e) { alert(e.message); } finally { document.getElementById('loading-overlay').classList.add('hidden'); btn.innerText = txt; btn.disabled = false; }
    },
    
    // Tải ảnh mới tạo
    async dlQR() { 
        const title = document.getElementById('inp-title').value || "TaiLieu";
        // Gọi lại hàm vẽ để đảm bảo lấy đúng trạng thái cuối cùng
        const imgData = await this.addFrameAndTitle('qr-img', title); 
        if (imgData) {
            const link = document.createElement('a'); link.href = imgData;
            // Tên file tải về: TheGioiQR_TênTàiLiệu.png
            link.download = `TheGioiQR_${title.replace(/\s+/g, '_')}.png`; 
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        } else { alert("Lỗi: Không tìm thấy ảnh."); }
    },
    
    async loadListQR() {
        const c = document.getElementById('list-container'); if(!c) return;
        c.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
        if (!currentUser) { c.innerHTML = '<p class="text-center text-danger">Vui lòng đăng nhập lại.</p>'; return; }
        try {
            const q = query(collection(db, "qr_codes"), where("createdBy", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const s = await getDocs(q); myQrList = []; s.forEach(d => myQrList.push({ id: d.id, ...d.data() })); this.renderQRList(myQrList);
        } catch (e) { c.innerHTML = '<div class="text-center text-muted py-4">Chưa có dữ liệu.</div>'; console.error(e); }
    },
    
    renderQRList(list) {
        const c = document.getElementById('list-container'); if(!c) return;
        if(list.length===0) {c.innerHTML='<div class="text-center text-muted py-4">Bạn chưa tạo mã QR nào.</div>'; return;} c.innerHTML="";
        list.forEach(d => {
            const url = d.qrImageURL || '';
            c.innerHTML += `<div class="qr-list-item shadow-sm border-0 mb-3" style="border-radius:12px;padding:15px;background:#fff;"><div class="d-flex justify-content-between mb-1"><strong class="text-primary text-truncate" style="max-width:65%">${d.title||'No Title'}</strong><span class="badge bg-success rounded-pill">${d.views||0}/${d.viewLimit||100}</span></div><div class="small text-muted mb-2">${d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : '--'}</div><div class="d-flex justify-content-between pt-2 border-top"><div class="text-truncate small text-muted pe-2" style="max-width:50%">${d.desc||''}</div><div class="d-flex gap-1"><button class="btn btn-sm text-dark" onclick="app.showStoredQR('${d.id}','${url}','${d.title}')"><i class="fas fa-qrcode"></i></button><button class="btn btn-sm text-secondary" onclick="window.open('?id=${d.id}','_blank')"><i class="fas fa-eye"></i></button><button class="btn btn-sm text-primary" onclick="app.openEdit('${d.id}')"><i class="fas fa-pen"></i></button><button class="btn btn-sm text-danger" onclick="app.deleteQR('${d.id}')"><i class="fas fa-trash"></i></button></div></div></div>`;
        });
    },
    filterList() { const t = document.getElementById('search-qr').value.toLowerCase(); this.renderQRList(myQrList.filter(q => (q.title||"").toLowerCase().includes(t))); },
    
    showStoredQR(id, url, title) { 
        document.getElementById('modal-qr-title').innerText = title; const t = document.getElementById('modal-qr-target'); t.innerHTML="";
        if(url && url.length > 10) { 
            // Ảnh từ Drive đã có sẵn khung rồi, chỉ cần hiện ra
            t.innerHTML = `<img src="${url}" style="width:auto; height:auto; max-width:100%; border-radius:0;" crossorigin="anonymous">`; 
            new bootstrap.Modal(document.getElementById('qrShowModal')).show(); 
        } else { this.showQR(id, title); } 
    },
    
    showQR(id, title) { 
        document.getElementById('modal-qr-target').innerHTML=""; const u = `${window.location.origin}${window.location.pathname}?id=${id}`; 
        document.getElementById('modal-qr-title').innerText=title; new bootstrap.Modal(document.getElementById('qrShowModal')).show(); 
        setTimeout(async ()=>{ 
            new QRCode(document.getElementById('modal-qr-target'),{text:u,width:250,height:250,correctLevel:QRCode.CorrectLevel.H}); 
            setTimeout(async ()=>{
                // Gọi hàm vẽ khung mới cho trường hợp tạo lại
                await this.addFrameAndTitle('modal-qr-target', title);
            },100); 
        },300); 
    },

    async downloadExistingQR() {
        const div = document.getElementById('modal-qr-target');
        const img = div.querySelector('img');
        const canvas = div.querySelector('canvas');
        const btn = document.querySelector('#qrShowModal .btn-dark'); const oldTxt = btn.innerHTML; btn.innerHTML = "Đang xử lý..."; btn.disabled = true;
        const title = document.getElementById('modal-qr-title').innerText || "TaiLieu";

        try {
            let imgUrl = "";
            if (img && img.src) {
                try {
                    const response = await fetch(img.src, { mode: 'cors' });
                    const blob = await response.blob();
                    imgUrl = window.URL.createObjectURL(blob);
                } catch (e) {
                    window.open(img.src, '_blank');
                    alert("Do bảo mật của Google, ảnh đã mở ở tab mới.\nHãy nhấn giữ ảnh để lưu.");
                    btn.innerHTML = oldTxt; btn.disabled = false; return;
                }
            } else if (canvas) {
                // Nếu là canvas (vừa tạo lại), đảm bảo nó đã được vẽ khung
                 imgUrl = await this.addFrameAndTitle('modal-qr-target', title);
            }

            if (imgUrl) {
                const a = document.createElement('a'); a.href = imgUrl; 
                a.download = `TheGioiQR_${title.replace(/\s+/g, '_')}.png`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                if(img && img.src) window.URL.revokeObjectURL(imgUrl);
            }
        } catch (e) { alert("Lỗi: " + e.message); } finally { btn.innerHTML = oldTxt; btn.disabled = false; }
    },
    
    async openEdit(id) { try{const d = await getDoc(doc(db,"qr_codes",id)); if(d.exists()){const dt=d.data(); document.getElementById('edit-id').value=id;document.getElementById('edit-title').value=dt.title;document.getElementById('edit-desc').value=dt.desc;document.getElementById('edit-link').value=dt.link;new bootstrap.Modal(document.getElementById('editModal')).show();} }catch(e){} },
    async saveEdit() { const id=document.getElementById('edit-id').value; const t=document.getElementById('edit-title').value; const d=document.getElementById('edit-desc').value; const l=document.getElementById('edit-link').value; await updateDoc(doc(db,"qr_codes",id),{title:t,desc:d,link:l}); bootstrap.Modal.getInstance(document.getElementById('editModal')).hide(); this.loadListQR(); alert('Đã cập nhật!'); },
    async deleteQR(id) { if(confirm('Xóa?')) { await deleteDoc(doc(db,"qr_codes",id)); this.loadListQR(); } },
    
    async loadInbox() {
        const c = document.getElementById('inbox-container'); if(!c) return; c.innerHTML='Loading...';
        try {
            const q = query(collection(db,"messages"), where("toUid","==",currentUser.uid), orderBy("createdAt","desc"));
            const s = await getDocs(q); document.getElementById('msg-badge').classList.add('hidden');
            if(s.empty) {c.innerHTML='<p class="text-center text-muted">Hộp thư trống.</p>'; return;} c.innerHTML="";
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
