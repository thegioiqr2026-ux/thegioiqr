import firebaseConfig from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, deleteDoc, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CẤU HÌNH VERSION ---
const APP_VERSION = "0.5"; // Version Mới
const appInstance = initializeApp(firebaseConfig);
const auth = getAuth(appInstance);
const db = getFirestore(appInstance);
const provider = new GoogleAuthProvider();

let currentUser = null;
let userData = null;
let currentQrData = {}; 
const root = document.getElementById('app-root'); 

// --- HỆ THỐNG APP ---
const app = {
    async init() {
        const verEl = document.getElementById('app-version');
        if(verEl) verEl.innerText = APP_VERSION;

        const urlParams = new URLSearchParams(window.location.search);
        const qrId = urlParams.get('id');

        if (qrId) {
            await this.loadPage('viewer');
            this.loadViewerData(qrId);
        } else {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    currentUser = user;
                    await this.syncUser(user);
                    await this.loadPage('dashboard');
                    this.updateSidebar(true);
                    this.nav('create'); 
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
            const html = await response.text();
            root.innerHTML = html;
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
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                dailyLimit: 5,
                dailyCount: 0,
                lastDate: new Date().toDateString(),
                isVip: false,
                createdAt: new Date().toISOString()
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

    // --- NAV ---
    async nav(tabId) {
        const sidebarEl = document.getElementById('sidebar');
        const sidebarInstance = bootstrap.Offcanvas.getInstance(sidebarEl);
        if (sidebarInstance) sidebarInstance.hide();

        if (tabId === 'guide') {
            await this.loadPage('huongdan');
            return; 
        }

        if (!document.getElementById('view-create')) {
            await this.loadPage('dashboard');
        }

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
        if (userData.dailyCount >= userData.dailyLimit) return alert("Bạn đã hết lượt tạo mã hôm nay (5/5).");
        
        const title = document.getElementById('inp-title').value;
        const link = document.getElementById('inp-link').value;
        const desc = document.getElementById('inp-desc').value;

        if (!link) return alert("Vui lòng nhập Link đích!");

        document.getElementById('loading-overlay').classList.remove('hidden');

        try {
            const docRef = await addDoc(collection(db, "qr_codes"), {
                title, desc, link,
                createdBy: currentUser.uid,
                ownerName: userData.displayName,
                createdAt: new Date().toISOString(),
                views: 0,
                viewLimit: userData.isVip ? 999999 : 100
            });

            await updateDoc(doc(db, "users", currentUser.uid), { dailyCount: userData.dailyCount + 1 });
            userData.dailyCount++;
            document.getElementById('u-quota').innerText = `${userData.dailyCount}/${userData.dailyLimit}`;

            const shortUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            document.getElementById('qr-img').innerHTML = "";
            new QRCode(document.getElementById('qr-img'), { text: shortUrl, width: 160, height: 160 });
            
            document.getElementById('new-qr').classList.remove('hidden');
            document.getElementById('inp-title').value = "";
            document.getElementById('inp-link').value = "";
            
        } catch (e) {
            alert("Lỗi: " + e.message);
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    },

    dlQR() {
        const img = document.querySelector('#qr-img img');
        if(img) {
            const a = document.createElement('a');
            a.download = 'TheGioiQR.png';
            a.href = img.src;
            a.click();
        }
    },

    async loadListQR() {
        const container = document.getElementById('list-container');
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
        
        const q = query(collection(db, "qr_codes"), where("createdBy", "==", currentUser.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            container.innerHTML = `
                <div class="text-center text-muted mt-4">
                    <i class="fas fa-box-open fa-3x mb-3 opacity-50"></i>
                    <p>Bạn chưa tạo mã QR nào.</p>
                </div>`;
            return;
        }

        container.innerHTML = "";
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const percent = d.viewLimit > 0 ? (d.views / d.viewLimit) * 100 : 0;
            let badgeClass = 'bg-success';
            if (percent > 70) badgeClass = 'bg-warning text-dark';
            if (percent >= 100) badgeClass = 'bg-danger';
            
            let descDisplay = d.desc || "Chưa có mô tả";
            if(descDisplay.length > 35) descDisplay = descDisplay.substring(0, 35) + "...";

            container.innerHTML += `
                <div class="qr-list-item shadow-sm border-0 mb-3" style="border-radius: 12px; padding: 15px; background: #fff;">
                    <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                        <strong class="text-truncate text-primary" style="max-width: 65%; font-size: 1.05rem;">
                            ${d.title || 'Không tiêu đề'}
                        </strong>
                        <span class="badge ${badgeClass} rounded-pill fw-normal" style="font-size: 0.75rem;">
                            <i class="fas fa-eye me-1"></i>${d.views}/${d.viewLimit}
                        </span>
                    </div>

                    <div class="d-flex justify-content-between align-items-center">
                        <div class="text-muted small text-truncate pe-2" style="max-width: 60%;">
                            ${descDisplay}
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm text-secondary" onclick="window.open('?id=${docSnap.id}', '_blank')" title="Xem"><i class="fas fa-eye fa-lg"></i></button>
                            <button class="btn btn-sm text-primary" onclick="app.openEdit('${docSnap.id}')" title="Sửa"><i class="fas fa-pen fa-lg"></i></button>
                            <button class="btn btn-sm text-danger" onclick="app.deleteQR('${docSnap.id}')" title="Xóa"><i class="fas fa-trash fa-lg"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
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
            } else {
                alert("Mã này không còn tồn tại!");
                this.loadListQR();
            }
        } catch (e) { console.error(e); } finally { document.getElementById('loading-overlay').classList.add('hidden'); }
    },

    async saveEdit() {
        const id = document.getElementById('edit-id').value;
        const title = document.getElementById('edit-title').value;
        const desc = document.getElementById('edit-desc').value;
        const link = document.getElementById('edit-link').value;
        if(!link) return alert("Link không được để trống!");

        const btnSave = document.querySelector('#editModal .btn-primary');
        const originalText = btnSave.innerText;
        btnSave.innerText = "Đang lưu...";
        btnSave.disabled = true;

        try {
            await updateDoc(doc(db, "qr_codes", id), { title, desc, link, updatedAt: new Date().toISOString() });
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            this.loadListQR();
            alert("Đã cập nhật!");
        } catch (e) { alert("Lỗi: " + e.message); } finally { btnSave.innerText = originalText; btnSave.disabled = false; }
    },

    async deleteQR(id) {
        if(confirm("Bạn có chắc muốn xóa mã này?")) {
            await deleteDoc(doc(db, "qr_codes", id));
            this.loadListQR();
        }
    },

    async loadInbox() {
        const container = document.getElementById('inbox-container');
        container.innerHTML = 'Đang tải...';
        const q = query(collection(db, "messages"), where("toUid", "==", currentUser.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        container.innerHTML = snap.empty ? '<p class="text-center text-muted">Hộp thư trống.</p>' : '';
        if(!snap.empty) container.innerHTML = '';
        snap.forEach(docSnap => {
            const m = docSnap.data();
            container.innerHTML += `
                <div class="bg-white p-3 rounded shadow-sm mb-2 border">
                    <div class="d-flex justify-content-between mb-1">
                        <strong>${m.senderName}</strong>
                        <small class="text-muted">${new Date(m.createdAt).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1 small">${m.content}</p>
                    <small class="text-primary fst-italic" style="font-size:0.75rem">Mã: ${m.qrTitle}</small>
                </div>
            `;
        });
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
                const banner = document.getElementById('banner-container');
                if(banner) banner.classList.add('hidden');
            }
            document.getElementById('loading-overlay').classList.add('hidden');
        } catch (e) {
            document.getElementById('app-root').innerHTML = `<div class="text-center mt-5 p-4"><h4>Mã QR không tồn tại.</h4></div>`;
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    },

    async sendMsg() {
        if (!currentQrData.owner) return;
        const sender = document.getElementById('msg-sender').value || "Ẩn danh";
        const content = document.getElementById('msg-content').value;
        if(!content) return alert("Vui lòng nhập nội dung!");
        await addDoc(collection(db, "messages"), {
            toUid: currentQrData.owner, senderName: sender, content: content,
            qrTitle: currentQrData.title, createdAt: new Date().toISOString(), read: false
        });
        alert("Đã gửi tin!");
        bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
    },
    
    showLogin() {
        this.nav('create');
        window.location.reload();
    }
};

window.app = app;
app.init();
