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
