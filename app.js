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
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div class="container">
            <a class="navbar-brand" href="#" onclick="router.navigate('home')">THEGIOIQR</a>
            <button class="navbar-toggler" type="button" onclick="document.getElementById('mainNavbar').classList.toggle('show')">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="mainNavbar">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="#" onclick="router.navigate('home')">Trang chủ</a></li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#">Công cụ QR</a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="router.navigate('qr_gen')">Tạo QR Miễn phí</a></li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#">An toàn LOTO</a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="navigateToLoto()">Mô phỏng LOTO</a></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </nav>`;
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
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div class="container">
            <button class="navbar-toggler border-0" type="button" onclick="toggleMobileMenu()">
                <i class="fa-solid fa-bars-staggered"></i>
            </button>
            <a class="navbar-brand mx-auto" href="#" onclick="router.navigate('home')">THEGIOIQR</a>
            
            <div class="collapse navbar-collapse" id="mainNavbar">
                <div class="sidebar-section user-profile d-lg-none">
                    <img src="https://via.placeholder.com/50" alt="User">
                    <h6>Trần Văn Thủy</h6>
                    <small>thegioiqr2026@gmail.com</small>
                </div>

                <div class="sidebar-section">
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="#" onclick="router.navigate('home')"><i class="fa fa-home me-2"></i>Trang chủ</a></li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#">Công cụ QR</a>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="router.navigate('qr_gen'); logUsage('Truy cập Tạo QR')">Tạo QR Miễn phí</a></li>
                            </ul>
                        </li>
                        <li class="nav-item"><a class="nav-link" href="#" onclick="navigateToLoto(); logUsage('Truy cập LOTO')">Mô phỏng LOTO</a></li>
                    </ul>
                </div>

                <div class="sidebar-section">
                    <p class="small text-muted mb-2">HỖ TRỢ</p>
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="#"><i class="fa fa-book me-2"></i>Hướng dẫn</a></li>
                        <li class="nav-item"><a class="nav-link" href="#"><i class="fa fa-info-circle me-2"></i>Thông tin tác giả</a></li>
                    </ul>
                </div>

                <div class="sidebar-section logout-section mt-auto">
                    <button class="btn btn-outline-danger w-100" onclick="logUsage('Đăng xuất')"><i class="fa fa-sign-out-alt me-2"></i>Đăng xuất</button>
                </div>
            </div>
        </div>
    </nav>`;
}

function toggleMobileMenu() {
    document.getElementById('mainNavbar').classList.toggle('show');
    document.getElementById('overlay').classList.toggle('active');
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
