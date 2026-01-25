const router = {
    navigate: function(pageId) {
        const renderZone = document.getElementById('page-render');
        if (PageContent[pageId]) {
            renderZone.innerHTML = PageContent[pageId];
            window.scrollTo(0, 0);
            // Đóng menu mobile nếu đang mở
            document.getElementById('mainNavbar')?.classList.remove('show');
        }
    }
};

// Hàm nạp Header
function loadHeader() {
    document.getElementById('header-component').innerHTML = `
    <div class="menu-overlay" id="overlay" onclick="toggleMobileMenu()"></div>
    <nav class="navbar navbar-expand-lg fixed-top">
        <div class="container">
            <button class="navbar-toggler border-0" type="button" onclick="toggleMobileMenu()">
                <span class="fa-solid fa-bars-staggered" style="color: #0062ff; font-size: 1.5rem;"></span>
            </button>
            
            <a class="navbar-brand d-flex align-items-center" href="#" onclick="router.navigate('home')">
                <div class="bg-primary text-white p-2 rounded-3 me-2" style="width:35px; height:35px; display:flex; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-qrcode"></i>
                </div>
                <span style="letter-spacing: 1px; color: #2d3436;">THEGIOIQR</span>
            </a>

            <div class="collapse navbar-collapse" id="mainNavbar">
                <div class="sidebar-section user-profile d-lg-none">
                    <div class="d-flex align-items-center">
                        <img src="https://ui-avatars.com/api/?name=Tran+Van+Thuy&background=random" class="rounded-circle me-3 border border-2 border-white" width="50">
                        <div>
                            <div class="fw-bold">Trần Văn Thủy</div>
                            <small class="opacity-75">thegioiqr2026@gmail.com</small>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section w-100">
                    <p class="small text-muted d-lg-none mb-2" style="font-size: 10px; letter-spacing: 1px;">MENU CHÍNH</p>
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item"><a class="nav-link" href="#" onclick="router.navigate('home')"><i class="fa-solid fa-house d-lg-none"></i> Trang chủ</a></li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#"><i class="fa-solid fa-qrcode d-lg-none"></i> Công cụ QR</a>
                            <ul class="dropdown-menu border-0 shadow-sm">
                                <li><a class="dropdown-item" href="#" onclick="router.navigate('qr_gen')">Tạo QR Miễn phí</a></li>
                            </ul>
                        </li>
                        <li class="nav-item"><a class="nav-link" href="#" onclick="navigateToLoto()"><i class="fa-solid fa-lock d-lg-none"></i> Mô phỏng LOTO</a></li>
                    </ul>
                </div>

                <div class="sidebar-section mt-auto d-lg-none">
                    <p class="small text-muted mb-2" style="font-size: 10px; letter-spacing: 1px;">THÔNG TIN</p>
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="#"><i class="fa-solid fa-circle-question"></i> Hướng dẫn</a></li>
                        <li class="nav-item"><a class="nav-link" href="#"><i class="fa-solid fa-user-tie"></i> Tác giả</a></li>
                    </ul>
                </div>

                <div class="sidebar-section d-lg-none">
                    <button class="btn btn-light text-danger w-100 rounded-3" onclick="logUsage('Logout')">
                        <i class="fa-solid fa-right-from-bracket me-2"></i> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    </nav>
    <div style="height: 80px;"></div> `;
}
// Hàm nạp Footer
function loadFooter() {
    document.getElementById('footer-component').innerHTML = `
    <footer>
        <div class="container text-center">
            <p><strong>THEGIOIQR.COM</strong> - Version 1.2</p>
            <p class="small text-muted">thegioiqr2026@gmail.com</p>
        </div>
    </footer>`;
}

function navigateToLoto() {
    alert("Chuyển hướng đến module LOTO...");
}

// Khởi chạy
window.onload = () => {
    loadHeader();
    loadFooter();
    router.navigate('home');
};

// --- Hệ thống Ghi Log ---
function logUsage(featureName) {
    const logData = {
        user: "tranvanthuy@gmail.com", // Giả lập user từ Firebase
        feature: featureName,
        time: new Date().toLocaleString(),
        platform: window.matchMedia('(display-mode: standalone)').matches ? "PWA" : "Web"
    };
    console.log("Logging Activity:", logData);
    // Sau này sẽ push vào Firebase: db.collection('logs').add(logData);
}

// Cập nhật logic đóng/mở Sidebar v1.9
function toggleMobileMenu() {
    const menu = document.getElementById('mainNavbar');
    const overlay = document.getElementById('overlay');
    const body = document.body;
    
    if (menu.classList.contains('show')) {
        menu.classList.remove('show');
        overlay.classList.remove('active');
        body.classList.remove('menu-open');
        // Sau khi animation kết thúc, ẩn hoàn toàn overlay để không cản trở click
        setTimeout(() => {
            if (!menu.classList.contains('show')) {
                overlay.style.display = 'none';
            }
        }, 300);
    } else {
        overlay.style.display = 'block'; // Hiện display trước
        // Delay một chút để transition opacity hoạt động
        setTimeout(() => {
            menu.classList.add('show');
            overlay.classList.add('active');
            body.classList.add('menu-open');
        }, 10);
    }
}

// Cập nhật lại loadHeader để đảm bảo overlay sạch sẽ
function loadHeader() {
    document.getElementById('header-component').innerHTML = `
    <div class="menu-overlay" id="overlay" onclick="toggleMobileMenu()" style="display: none;"></div>
    
    <nav class="navbar navbar-expand-lg fixed-top shadow-sm py-2">
        <div class="container">
            <button class="navbar-toggler border-0 shadow-none" type="button" onclick="toggleMobileMenu()">
                <span class="fa-solid fa-bars-staggered" style="color: #0062ff; font-size: 1.4rem;"></span>
            </button>
            
            <a class="navbar-brand d-flex align-items-center" href="#" onclick="router.navigate('home')">
                <div class="bg-primary text-white rounded-3 me-2 d-flex align-items-center justify-content-center" style="width:32px; height:32px;">
                    <i class="fa-solid fa-qrcode" style="font-size: 0.9rem;"></i>
                </div>
                <span style="font-weight: 800; color: #2d3436; font-size: 1.1rem; letter-spacing: -0.5px;">THEGIOIQR</span>
            </a>

            <div class="collapse navbar-collapse" id="mainNavbar">
                <div class="sidebar-section user-profile d-lg-none">
                    <div class="d-flex align-items-center">
                        <img src="https://ui-avatars.com/api/?name=Tran+Van+Thuy&background=random" class="rounded-circle me-3 border border-2 border-white shadow-sm" width="45">
                        <div class="overflow-hidden">
                            <div class="fw-bold text-white text-truncate" style="font-size: 0.95rem;">Trần Văn Thủy</div>
                            <small class="text-white-50 text-truncate d-block" style="font-size: 0.75rem;">thegioiqr2026@gmail.com</small>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item"><a class="nav-link py-2" href="#" onclick="router.navigate('home')"><i class="fa-solid fa-house d-lg-none me-3"></i>Trang chủ</a></li>
                        <li class="nav-item"><a class="nav-link py-2" href="#" onclick="router.navigate('qr_gen')"><i class="fa-solid fa-qrcode d-lg-none me-3"></i>Công cụ QR</a></li>
                        <li class="nav-item"><a class="nav-link py-2" href="#" onclick="navigateToLoto()"><i class="fa-solid fa-lock d-lg-none me-3"></i>Mô phỏng LOTO</a></li>
                    </ul>
                </div>

                <div class="sidebar-section mt-auto d-lg-none bg-light pt-4 pb-2">
                    <p class="px-3 small text-muted mb-2" style="font-size: 10px; font-weight: 800;">THÔNG TIN</p>
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="#" onclick="logUsage('HDSD')"><i class="fa-solid fa-book-open me-3"></i>Hướng dẫn</a></li>
                        <li class="nav-item"><a class="nav-link" href="#" onclick="logUsage('TacGia')"><i class="fa-solid fa-id-card me-3"></i>Tác giả</a></li>
                    </ul>
                </div>

                <div class="sidebar-section d-lg-none p-3 mb-2">
                    <button class="btn btn-danger w-100 rounded-3 shadow-sm py-2" onclick="logUsage('Logout')">
                        <i class="fa-solid fa-power-off me-2"></i> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    </nav>
    <div style="height: 65px;"></div>
    `;
}

// --- Đăng ký Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

// --- Hệ thống Ghi Log Nâng cao ---
function logUsage(featureName) {
    const isOnline = navigator.onLine;
    const logData = {
        user: "tranvanthuy@gmail.com",
        feature: featureName,
        time: new Date().toLocaleString(),
        status: isOnline ? "Online" : "Offline", // Phân biệt trạng thái
        platform: window.matchMedia('(display-mode: standalone)').matches ? "PWA" : "Web"
    };

    if (isOnline) {
        sendToFirebase(logData);
    } else {
        saveLogOffline(logData);
    }
}

// Giả lập lưu vào IndexedDB khi mất mạng
function saveLogOffline(data) {
    console.warn("Đang Offline. Log đã được đưa vào hàng chờ:", data);
    let offlineLogs = JSON.parse(localStorage.getItem('offline_logs') || '[]');
    offlineLogs.push(data);
    localStorage.setItem('offline_logs', JSON.stringify(offlineLogs));
}

// Gửi dữ liệu về Firebase
function sendToFirebase(data) {
    console.log("Đang gửi log về Firebase:", data);
    // Code Firebase của bạn sẽ ở đây
}

// Tự động kiểm tra mạng để đồng bộ hóa
window.addEventListener('online', () => {
    console.log("Đã có mạng trở lại! Đang đồng bộ dữ liệu...");
    let offlineLogs = JSON.parse(localStorage.getItem('offline_logs') || '[]');
    if (offlineLogs.length > 0) {
        offlineLogs.forEach(log => {
            log.status = "Offline-to-Online"; // Đánh dấu đây là dữ liệu bù
            sendToFirebase(log);
        });
        localStorage.removeItem('offline_logs');
        alert("Dữ liệu hoạt động offline đã được đồng bộ!");
    }
});
