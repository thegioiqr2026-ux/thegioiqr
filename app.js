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

// --- Nạp Header với Sidebar 4 phần ---
function loadHeader() {
    document.getElementById('header-component').innerHTML = `
    <div class="menu-overlay" id="overlay" onclick="toggleMobileMenu()"></div>
    
    <nav class="navbar navbar-expand-lg fixed-top shadow-sm">
        <div class="container">
            <button class="navbar-toggler border-0" type="button" onclick="toggleMobileMenu()">
                <span class="fa-solid fa-bars-staggered" style="color: #0062ff; font-size: 1.5rem;"></span>
            </button>
            
            <a class="navbar-brand d-flex align-items-center" href="#" onclick="router.navigate('home')">
                <div class="bg-primary text-white p-2 rounded-3 me-2" style="width:35px; height:35px; display:flex; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-qrcode"></i>
                </div>
                <span style="font-weight: 700; color: #2d3436;">THEGIOIQR</span>
            </a>

            <div class="collapse navbar-collapse" id="mainNavbar">
                <div class="sidebar-section user-profile d-lg-none">
                    <div class="d-flex align-items-center mb-2">
                        <img src="https://ui-avatars.com/api/?name=Tran+Van+Thuy&background=random" class="rounded-circle me-3 border border-2 border-white" width="50">
                        <div class="overflow-hidden">
                            <div class="fw-bold text-truncate">Trần Văn Thủy</div>
                            <small class="opacity-75 text-truncate d-block">thegioiqr2026@gmail.com</small>
                        </div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <p class="small text-muted d-lg-none mb-3" style="font-size: 10px; font-weight: 800; letter-spacing: 1px;">MENU CHÍNH</p>
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="router.navigate('home')">
                                <i class="fa-solid fa-house d-lg-none me-2"></i> Trang chủ
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="router.navigate('qr_gen')">
                                <i class="fa-solid fa-qrcode d-lg-none me-2"></i> Công cụ QR
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" onclick="navigateToLoto()">
                                <i class="fa-solid fa-lock d-lg-none me-2"></i> Mô phỏng LOTO
                            </a>
                        </li>
                    </ul>
                </div>

                <div class="sidebar-section mt-auto d-lg-none bg-light">
                    <p class="small text-muted mb-3" style="font-size: 10px; font-weight: 800; letter-spacing: 1px;">THÔNG TIN & HỖ TRỢ</p>
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="#"><i class="fa-solid fa-circle-info me-2"></i> Hướng dẫn sử dụng</a></li>
                        <li class="nav-item"><a class="nav-link" href="#"><i class="fa-solid fa-user-gear me-2"></i> Thông tin tác giả</a></li>
                    </ul>
                </div>

                <div class="sidebar-section d-lg-none mb-3">
                    <button class="btn btn-outline-danger w-100 rounded-pill" onclick="logUsage('Logout')">
                        <i class="fa-solid fa-power-off me-2"></i> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    </nav>
    <div style="height: 75px;"></div>
    `;
}

// Logic điều khiển đóng mở Sidebar
function toggleMobileMenu() {
    const menu = document.getElementById('mainNavbar');
    const overlay = document.getElementById('overlay');
    
    if (menu.classList.contains('show')) {
        menu.classList.remove('show');
        overlay.classList.remove('active');
    } else {
        menu.classList.add('show');
        overlay.classList.add('active');
    }
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
