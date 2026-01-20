import firebaseConfig from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, deleteDoc, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- KHỞI TẠO FIREBASE ---
const appInstance = initializeApp(firebaseConfig);
const auth = getAuth(appInstance);
const db = getFirestore(appInstance);
const provider = new GoogleAuthProvider();

let currentUser = null;
let userData = null;
let currentQrData = {}; // Lưu thông tin QR đang xem
const root = document.getElementById('app-root'); // Vùng chứa nội dung

// --- HỆ THỐNG APP ---
const app = {
    // 1. Hàm chạy đầu tiên khi mở web
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const qrId = urlParams.get('id');

        if (qrId) {
            // A. CHẾ ĐỘ NGƯỜI XEM (VIEWER)
            await this.loadPage('viewer');
            this.loadViewerData(qrId);
        } else {
            // B. CHẾ ĐỘ ADMIN (QUẢN TRỊ)
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    currentUser = user;
                    await this.syncUser(user);
                    await this.loadPage('dashboard'); // Mặc định vào Dashboard
                    this.updateSidebar(true);
                    this.nav('create'); // Mặc định mở tab Tạo mới
                } else {
                    await this.loadPage('login');
                    this.updateSidebar(false);
                }
                document.getElementById('loading-overlay').classList.add('hidden');
            });
        }
    },

    // 2. Hàm tải nội dung HTML từ file
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

    // --- AUTHENTICATION ---
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
            // Reset quota nếu qua ngày mới
            if (userData.lastDate !== new Date().toDateString()) {
                await updateDoc(userRef, { lastDate: new Date().toDateString(), dailyCount: 0 });
                userData.dailyCount = 0;
            }
        } else {
            // Tạo user mới
            userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                dailyLimit: 5, // Mặc định 5 mã/ngày
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

    // --- DASHBOARD FUNCTIONS ---
    nav(tabId) {
        // Ẩn tất cả các tab
        ['view-create', 'view-list', 'view-inbox'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        
        // Hiện tab được chọn
        const target = document.getElementById('view-' + tabId);
        if(target) target.classList.remove('hidden');

        // Đóng sidebar (Mobile)
        const sidebarEl = document.getElementById('sidebar');
        const sidebarInstance = bootstrap.Offcanvas.getInstance(sidebarEl);
        if (sidebarInstance) sidebarInstance.hide();

        // Load dữ liệu nếu cần
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
            // 1. Lưu vào DB
            const docRef = await addDoc(collection(db, "qr_codes"), {
                title, desc, link,
                createdBy: currentUser.uid,
                ownerName: userData.displayName,
                createdAt: new Date().toISOString(),
                views: 0,
                viewLimit: userData.isVip ? 999999 : 100 // Giới hạn lượt xem
            });

            // 2. Trừ Quota
            await updateDoc(doc(db, "users", currentUser.uid), { dailyCount: userData.dailyCount + 1 });
            userData.dailyCount++;
            document.getElementById('u-quota').innerText = `${userData.dailyCount}/${userData.dailyLimit}`;

            // 3. Tạo ảnh QR
            const shortUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            document.getElementById('qr-img').innerHTML = "";
            new QRCode(document.getElementById('qr-img'), { text: shortUrl, width: 160, height: 160 });
            
            document.getElementById('new-qr').classList.remove('hidden');
            
            // Reset form
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

    // --- QUẢN LÝ DANH SÁCH (Cập nhật hiển thị và nút bấm) ---
    async loadListQR() {
        const container = document.getElementById('list-container');
        // Hiển thị loading
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
            // Tính phần trăm giới hạn view để hiện màu (Xanh/Vàng/Đỏ)
            const percent = d.viewLimit > 0 ? (d.views / d.viewLimit) * 100 : 0;
            let badgeClass = 'bg-success';
            if (percent > 70) badgeClass = 'bg-warning text-dark';
            if (percent >= 100) badgeClass = 'bg-danger';
            
            // Xử lý mô tả: Nếu dài quá thì cắt bớt
            let descDisplay = d.desc || "Chưa có mô tả";
            if(descDisplay.length > 60) descDisplay = descDisplay.substring(0, 60) + "...";

            container.innerHTML += `
                <div class="qr-list-item position-relative">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <strong class="text-truncate me-2 text-primary" style="font-size: 1.1rem;">
                            ${d.title || 'Không tiêu đề'}
                        </strong>
                        <span class="badge ${badgeClass} rounded-pill" style="font-size: 0.7rem;">
                            <i class="fas fa-eye"></i> ${d.views}/${d.viewLimit}
                        </span>
                    </div>
                    
                    <div class="text-muted small mb-3" style="line-height: 1.4;">
                        ${descDisplay}
                    </div>

                    <div class="d-flex justify-content-end gap-2 border-top pt-2">
                        <button class="btn btn-sm btn-light text-secondary border" 
                                onclick="window.open('?id=${docSnap.id}', '_blank')" 
                                title="Xem trang đích">
                            <i class="fas fa-eye"></i>
                        </button>

                        <button class="btn btn-sm btn-light text-primary border" 
                                onclick="app.openEdit('${docSnap.id}')" 
                                title="Sửa nội dung">
                            <i class="fas fa-pen"></i>
                        </button>

                        <button class="btn btn-sm btn-light text-danger border" 
                                onclick="app.deleteQR('${docSnap.id}')" 
                                title="Xóa mã">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    },

    // --- CHỨC NĂNG SỬA & XÓA ---
    
    // 1. Mở Modal Sửa
    async openEdit(id) {
        document.getElementById('loading-overlay').classList.remove('hidden');
        try {
            const docRef = doc(db, "qr_codes", id);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                const data = snap.data();
                // Điền dữ liệu vào Form
                document.getElementById('edit-id').value = id;
                document.getElementById('edit-title').value = data.title;
                document.getElementById('edit-desc').value = data.desc;
                document.getElementById('edit-link').value = data.link;
                
                // Mở Modal
                const myModal = new bootstrap.Modal(document.getElementById('editModal'));
                myModal.show();
            } else {
                alert("Mã này không còn tồn tại!");
                this.loadListQR();
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi: " + e.message);
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    },

    // 2. Lưu Sửa
    async saveEdit() {
        const id = document.getElementById('edit-id').value;
        const title = document.getElementById('edit-title').value;
        const desc = document.getElementById('edit-desc').value;
        const link = document.getElementById('edit-link').value;

        if(!link) return alert("Link không được để trống!");

        // Disable nút để tránh bấm nhiều lần
        const btnSave = document.querySelector('#editModal .btn-primary');
        const originalText = btnSave.innerText;
        btnSave.innerText = "Đang lưu...";
        btnSave.disabled = true;

        try {
            const docRef = doc(db, "qr_codes", id);
            await updateDoc(docRef, {
                title: title,
                desc: desc,
                link: link,
                updatedAt: new Date().toISOString()
            });
            
            alert("Cập nhật thành công!");
            
            // Đóng Modal và reload list
            const modalEl = document.getElementById('editModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            
            this.loadListQR();

        } catch (e) {
            alert("Lỗi khi lưu: " + e.message);
        } finally {
            btnSave.innerText = originalText;
            btnSave.disabled = false;
        }
    },

    // 3. Xóa
    async deleteQR(id) {
        if(confirm("Bạn có chắc muốn xóa mã này? Hành động không thể hoàn tác.")) {
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
                <div class="qr-list-item bg-light border">
                    <div class="d-flex justify-content-between">
                        <strong>${m.senderName}</strong>
                        <small class="text-muted">${new Date(m.createdAt).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1 mt-1">${m.content}</p>
                    <small class="text-primary fst-italic">Từ mã: ${m.qrTitle}</small>
                </div>
            `;
        });
    },

    // --- VIEWER FUNCTIONS ---
    async loadViewerData(id) {
        try {
            const qrRef = doc(db, "qr_codes", id);
            const snap = await getDoc(qrRef);
            
            if (!snap.exists()) throw new Error("404");
            
            const d = snap.data();
            currentQrData = { id: id, owner: d.createdBy, title: d.title };
            
            // 1. Kiểm tra giới hạn View
            if (d.views >= d.viewLimit) {
                document.getElementById('main-content').classList.add('hidden');
                document.getElementById('limit-warning').classList.remove('hidden');
                document.getElementById('loading-overlay').classList.add('hidden');
                return;
            }

            // 2. Tăng lượt xem (+1)
            updateDoc(qrRef, { views: increment(1) });

            // 3. Hiển thị nội dung
            document.getElementById('v-title').innerText = d.title || "Tài liệu";
            document.getElementById('v-desc').innerText = d.desc || "";
            document.getElementById('v-owner').innerText = d.ownerName || "TheGioiQR User";
            document.getElementById('v-btn').href = d.link;

            // 4. Kiểm tra chủ sở hữu có phải VIP không (để ẩn Banner)
            const ownerSnap = await getDoc(doc(db, "users", d.createdBy));
            if (ownerSnap.exists() && ownerSnap.data().isVip) {
                const banner = document.getElementById('banner-container');
                if(banner) banner.classList.add('hidden');
            }

            document.getElementById('loading-overlay').classList.add('hidden');

        } catch (e) {
            document.getElementById('app-root').innerHTML = 
                `<div class="text-center mt-5 p-4">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h4>Mã QR không tồn tại hoặc đã bị xóa.</h4>
                </div>`;
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    },

    async sendMsg() {
        if (!currentQrData.owner) return;
        
        const sender = document.getElementById('msg-sender').value || "Ẩn danh";
        const content = document.getElementById('msg-content').value;
        
        if(!content) return alert("Vui lòng nhập nội dung!");

        await addDoc(collection(db, "messages"), {
            toUid: currentQrData.owner,
            senderName: sender,
            content: content,
            qrTitle: currentQrData.title,
            createdAt: new Date().toISOString(),
            read: false
        });

        alert("Đã gửi tin nhắn đến chủ tài liệu!");
        const modal = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
        modal.hide();
    },
    
    // Hàm gọi Login từ Sidebar
    showLogin() {
        this.nav('create'); // Chuyển về tab mặc định, Auth Listener sẽ tự chuyển trang
        window.location.reload();
    }
};

// Gán app vào window để HTML gọi được
window.app = app;

// Khởi chạy
app.init();
