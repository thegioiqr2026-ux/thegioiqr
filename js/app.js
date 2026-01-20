import firebaseConfig from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, deleteDoc, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const APP_VERSION = "0.8"; // Cập nhật Version
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
            // Chế độ Viewer
            await this.loadPage('viewer');
            this.loadViewerData(qrId);
            // Vẫn kiểm tra Auth để cập nhật Menu (nếu lỡ họ đã đăng nhập rồi mà quét mã)
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
            // Chế độ Admin
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
            root.innerHTML = "<p class='text-center p-5'>Lỗi tải trang.</p>";
        }
    },

    // --- AUTH ---
    async login() {
        try { await signInWithPopup(auth, provider); } 
        catch (e) { alert("Lỗi đăng nhập: " + e.message); }
    },

    async logout() {
        await signOut(auth);
        window.location.reload();
    },

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
            userData = {
                uid: user.uid, email: user.email, displayName: user.displayName,
                dailyLimit: 5, dailyCount: 0, lastDate: new Date().toDateString(),
                isVip: false, createdAt: new Date().toISOString()
            };
            await setDoc(userRef, userData);
        }
    },

    updateSidebar(isLogin) {
        if (isLogin) {
            document.getElementById('menu-user').classList.remove('hidden');
            document.getElementById('menu-guest').classList.add('hidden');
            document.getElementById('u-name').innerText = userData.displayName;
            document.getElementById('u-quota').innerText = `${userData.dailyCount}/${userData.dailyLimit}`;
        } else {
            document.getElementById('menu-user').classList.add('hidden');
            document.getElementById('menu-guest').classList.remove('hidden');
        }
    },

    async checkUnreadMessages() {
        try {
            const q = query(collection(db, "messages"), where("toUid", "==", currentUser.uid), where("read", "==", false));
            const snap = await getDocs(q);
            const count = snap.size;
            const badge = document.getElementById('msg-badge');
            if (badge) {
                if (count > 0) {
                    badge.innerText = count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (error) { console.warn("Index Warning", error); }
    },

    // --- NAV ---
    async nav(tabId) {
        const sidebarEl = document.getElementById('sidebar');
        const sidebarInstance = bootstrap.Offcanvas.getInstance(sidebarEl);
        if (sidebarInstance) sidebarInstance.hide();

        // Nếu đang ở chế độ xem QR mà bấm menu -> Chuyển về Dashboard
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('id')) {
            // Xóa ID khỏi URL và load lại Dashboard mà không reload trang
            window.history.pushState({}, document.title, window.location.pathname);
            await this.loadPage('dashboard');
        }

        if (tabId === 'guide') { await this.loadPage('huongdan'); return; }
        if (!document.getElementById('view-create')) { await this.loadPage('dashboard'); }

        ['view-create', 'view-list', 'view-inbox'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        
        const target = document.getElementById('view-' + tabId);
        if(target) target.classList.remove('hidden');

        if (tabId === 'list') this.loadListQR();
        if (tabId === 'inbox') this.loadInbox();
    },

    async createQR() {
        if (userData.dailyCount >= userData.dailyLimit) return alert("Hết lượt tạo hôm nay.");
        const title = document.getElementById('inp-title').value;
        const link = document.getElementById('inp-link').value;
        const desc = document.getElementById('inp-desc').value;
        if (!link) return alert("Thiếu link!");

        document.getElementById('loading-overlay').classList.remove('hidden');
        try {
            const docRef = await addDoc(collection(db, "qr_codes"), {
                title, desc, link, createdBy: currentUser.uid, ownerName: userData.displayName,
                createdAt: new Date().toISOString(), views: 0, viewLimit: userData.isVip ? 999999 : 100
            });
            await updateDoc(doc(db, "users", currentUser.uid), { dailyCount: userData.dailyCount + 1 });
            userData.dailyCount++;
            document.getElementById('u-quota').innerText = `${userData.dailyCount}/${userData.dailyLimit}`;

            const shortUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            document.getElementById('qr-img').innerHTML = "";
            new QRCode(document.getElementById('qr-img'), { text: shortUrl, width: 160, height: 160 });
            document.getElementById('new-qr').classList.remove('hidden');
            document.getElementById('inp-title').value = ""; document.getElementById('inp-link').value = "";
        } catch (e) { alert("Lỗi: " + e.message); } finally { document.getElementById('loading-overlay').classList.add('hidden'); }
    },

    dlQR() {
        const img = document.querySelector('#qr-img img');
        if(img) { const a = document.createElement('a'); a.download = 'QR.png'; a.href = img.src; a.click(); }
    },

    async loadListQR() {
        const container = document.getElementById('list-container');
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
        const q = query(collection(db, "qr_codes"), where("createdBy", "==", currentUser.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        myQrList = [];
        snap.forEach(doc => { myQrList.push({ id: doc.id, ...doc.data() }); });
        this.renderQRList(myQrList);
    },

    renderQRList(dataList) {
        const container = document.getElementById('list-container');
        if (dataList.length === 0) { container.innerHTML = `<div class="text-center text-muted mt-4"><p>Không tìm thấy mã nào.</p></div>`; return; }

        container.innerHTML = "";
        dataList.forEach(d => {
            const percent = d.viewLimit > 0 ? (d.views / d.viewLimit) * 100 : 0;
            let badgeClass = 'bg-success';
            if (percent > 70) badgeClass = 'bg-warning text-dark';
            if (percent >= 100) badgeClass = 'bg-danger';
            
            let descDisplay = d.desc || "Chưa có mô tả";
            if(descDisplay.length > 35) descDisplay = descDisplay.substring(0, 35) + "...";
            const dateStr = new Date(d.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'});

            container.innerHTML += `
                <div class="qr-list-item shadow-sm border-0 mb-3" style="border-radius: 12px; padding: 15px; background: #fff;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-truncate text-primary" style="max-width: 65%; font-size: 1.05rem;">${d.title || 'Không tiêu đề'}</strong>
                        <span class="badge ${badgeClass} rounded-pill fw-normal" style="font-size: 0.75rem;"><i class="fas fa-eye me-1"></i>${d.views}/${d.viewLimit}</span>
                    </div>
                    <div class="small text-muted mb-2" style="font-size: 0.75rem;"><i class="far fa-clock me-1"></i> ${dateStr}</div>
                    <div class="d-flex justify-content-between align-items-center border-top pt-2">
                        <div class="text-muted small text-truncate pe-2" style="max-width: 60%;">${descDisplay}</div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm text-secondary" onclick="window.open('?id=${d.id}', '_blank')"><i class="fas fa-eye fa-lg"></i></button>
                            <button class="btn btn-sm text-primary" onclick="app.openEdit('${d.id}')"><i class="fas fa-pen fa-lg"></i></button>
                            <button class="btn btn-sm text-danger" onclick="app.deleteQR('${d.id}')"><i class="fas fa-trash fa-lg"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    filterList() {
        const term = document.getElementById('search-qr').value.toLowerCase();
        const filtered = myQrList.filter(qr => (qr.title || "").toLowerCase().includes(term));
        this.renderQRList(filtered);
    },

    async openEdit(id) {
        document.getElementById('loading-overlay').classList.remove('hidden');
        try {
            const docRef = doc(db, "qr_codes", id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                document.getElementById('edit-id').value = id;
                document.getElementById('edit-title').value = data.title;
                document.getElementById('edit-desc').value = data.desc;
                document.getElementById('edit-link').value = data.link;
                new bootstrap.Modal(document.getElementById('editModal')).show();
            }
        } catch (e) { console.error(e); } finally { document.getElementById('loading-overlay').classList.add('hidden'); }
    },

    async saveEdit() {
        const id = document.getElementById('edit-id').value;
        const title = document.getElementById('edit-title').value;
        const desc = document.getElementById('edit-desc').value;
        const link = document.getElementById('edit-link').value;
        if(!link) return alert("Thiếu link!");
        try {
            await updateDoc(doc(db, "qr_codes", id), { title, desc, link, updatedAt: new Date().toISOString() });
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            this.loadListQR();
            alert("Đã cập nhật!");
        } catch (e) { alert("Lỗi: " + e.message); }
    },

    async deleteQR(id) {
        if(confirm("Xóa mã này?")) {
            await deleteDoc(doc(db, "qr_codes", id));
            this.loadListQR();
        }
    },

    async loadInbox() {
        const container = document.getElementById('inbox-container');
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
        
        try {
            const q = query(collection(db, "messages"), where("toUid", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            document.getElementById('msg-badge').classList.add('hidden');
            container.innerHTML = snap.empty ? '<p class="text-center text-muted">Hộp thư trống.</p>' : '';
            if(!snap.empty) container.innerHTML = '';
            snap.forEach(async docSnap => {
                const m = docSnap.data();
                if (m.read === false) { await updateDoc(doc(db, "messages", docSnap.id), { read: true }); }
                container.innerHTML += `
                    <div class="bg-white p-3 rounded shadow-sm mb-2 border ${m.read ? '' : 'border-primary border-2'}">
                        <div class="d-flex justify-content-between mb-1">
                            <strong>${m.senderName}</strong>
                            <small class="text-muted">${new Date(m.createdAt).toLocaleDateString('vi-VN')}</small>
                        </div>
                        <p class="mb-1 small">${m.content}</p>
                        <small class="text-primary fst-italic" style="font-size:0.75rem">Mã: ${m.qrTitle}</small>
                    </div>
                `;
            });
            this.checkUnreadMessages();
        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="text-center text-danger p-3">Lỗi tải hộp thư.</div>`;
        }
    },

    async loadViewerData(id) {
        try {
            const qrRef = doc(db, "qr_codes", id);
            const snap = await getDoc(qrRef);
            if (!snap.exists()) throw new Error("404");
            const d = snap.data();
            currentQrData = { id: id, owner: d.createdBy, title: d.title };
            
            if (d.views >= d.viewLimit) {
                document.getElementById('main-content').classList.add('hidden');
                document.getElementById('limit-warning').classList.remove('hidden');
                document.getElementById('loading-overlay').classList.add('hidden');
                return;
            }
            updateDoc(qrRef, { views: increment(1) });
            document.getElementById('v-title').innerText = d.title || "Tài liệu";
            document.getElementById('v-desc').innerText = d.desc || "";
            document.getElementById('v-owner').innerText = d.ownerName || "TheGioiQR User";
            document.getElementById('v-btn').href = d.link;
            const ownerSnap = await getDoc(doc(db, "users", d.createdBy));
            if (ownerSnap.exists() && ownerSnap.data().isVip) {
                document.getElementById('banner-container').classList.add('hidden');
            }
            document.getElementById('loading-overlay').classList.add('hidden');
        } catch (e) {
            document.getElementById('app-root').innerHTML = `<div class="text-center mt-5 p-4"><h4>Mã không tồn tại.</h4></div>`;
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    },

    async sendMsg() {
        if (!currentQrData.owner) return alert("Lỗi: Không tìm thấy chủ sở hữu mã này.");
        const sender = document.getElementById('msg-sender').value || "Học viên";
        const content = document.getElementById('msg-content').value;
        if(!content) return alert("Vui lòng nhập nội dung!");

        await addDoc(collection(db, "messages"), {
            toUid: currentQrData.owner, senderName: sender, content: content,
            qrTitle: currentQrData.title, createdAt: new Date().toISOString(), read: false
        });
        alert("Đã gửi tin!");
        bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
    },
    
    // --- SỬA LỖI ĐĂNG NHẬP (QUAN TRỌNG) ---
    // Hàm này sẽ xóa parameter ?id=... để thoát chế độ Viewer
    showLogin() {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.location.href = cleanUrl;
    }
};

window.app = app;
app.init();
