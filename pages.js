const PageContent = {
    home: `
        <div class="text-center mb-5">
            <h1 class="display-4 fw-bold">Giải pháp QR toàn diện</h1>
            <p class="lead text-secondary">Hệ sinh thái cho Giảng viên, HSE và Kỹ thuật</p>
        </div>
        <div class="row g-4">
            <div class="col-md-4">
                <div class="card feature-card text-center p-4" onclick="router.navigate('qr-gen')">
                    <i class="fa-solid fa-qrcode fa-3x mb-3 text-primary"></i>
                    <h4>Công cụ QR</h4>
                    <p>Tạo và quản lý mã QR động miễn phí.</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card feature-card text-center p-4" onclick="navigateToLoto()">
                    <i class="fa-solid fa-lock fa-3x mb-3 text-danger"></i>
                    <h4>Mô phỏng LOTO</h4>
                    <p>Ứng dụng thực hành khóa thẻ an toàn.</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card feature-card text-center p-4">
                    <i class="fa-solid fa-bolt fa-3x mb-3 text-warning"></i>
                    <h4>Kỹ thuật Điện</h4>
                    <p>Tra cứu QCVN và công cụ tính toán.</p>
                </div>
            </div>
        </div>
    `,
    qr_gen: `
        <div class="row justify-content-center">
            <div class="col-md-6 bg-white p-5 rounded-4 shadow">
                <h2 class="mb-4">Tạo mã QR nhanh</h2>
                <input type="text" class="form-control mb-3" placeholder="Dán link tại đây...">
                <button class="btn btn-primary w-100">Tạo mã</button>
            </div>
        </div>
    `
};
