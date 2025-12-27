const API_BASE_URL = "http://localhost:16738/api";
const IMAGE_BASE_URL = "https://down-vn.img.susercontent.com/file";

let cart = JSON.parse(localStorage.getItem("matmat_cart") || "[]");
let coupon = JSON.parse(localStorage.getItem("matmat_coupon") || "null");
let currentMethod = "zalopay";
let currentUser = JSON.parse(localStorage.getItem("matmat_user") || "null");
let products = [];
let lastOrderId = null;
window.isProcessingPayment = false;
let currentDisplayCount = 20;
const PRODUCTS_PER_PAGE = 8;

async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) throw new Error("Failed to fetch products");
    products = await response.json();
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    showToast("Không thể tải sản phẩm. Vui lòng thử lại sau.", "error");
    return [];
  }
}

async function fetchDiscountedProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products/discounts/all`);
    if (!response.ok) throw new Error("Failed to fetch discounted products");
    return await response.json();
  } catch (error) {
    console.error("Error fetching discounted products:", error);
    return [];
  }
}

async function searchProducts(keyword) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/products/search/${encodeURIComponent(keyword)}`
    );
    if (!response.ok) throw new Error("Search failed");
    return await response.json();
  } catch (error) {
    console.error("Error searching products:", error);
    showToast("Tìm kiếm thất bại", "error");
    return [];
  }
}

async function getProductsByCategory(category) {
  try {
    if (category === "all") {
      const uniqueProducts = [];
      const seenIds = new Set();

      for (const product of products) {
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          uniqueProducts.push(product);
        }
      }

      return uniqueProducts.slice(0, 20);
    }

    const response = await fetch(
      `${API_BASE_URL}/products/category/${encodeURIComponent(category)}`
    );

    if (!response.ok) throw new Error("Failed to fetch category products");

    let categoryProducts = await response.json();

    const uniqueProducts = [];
    const seenIds = new Set();

    for (const product of categoryProducts) {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id);
        uniqueProducts.push(product);
      }
    }

    return uniqueProducts;
  } catch (error) {
    console.error("Error fetching category products:", error);
    return [];
  }
}

async function createOrder(orderData) {
  try {
    console.log("Sending order to API:", orderData);

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to create order");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error in createOrder:", error);
    throw error;
  }
}

async function getUserOrders(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/user/${userId}`);
    if (!response.ok) throw new Error("Failed to fetch orders");
    return await response.json();
  } catch (error) {
    console.error("Error fetching orders:", error);
    const orders = JSON.parse(localStorage.getItem("matmat_orders") || "[]");
    return orders.filter((order) => order.userId === userId || !order.userId);
  }
}

function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
        <i class="fas fa-${
          type === "success"
            ? "check-circle"
            : type === "error"
            ? "exclamation-circle"
            : type === "warning"
            ? "exclamation-triangle"
            : "info-circle"
        }"></i>
        <span>${message}</span>
    `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function updateUserUI() {
  const user = currentUser;
  const userText = document.getElementById("userText");
  const userMenu = document.getElementById("userMenu");

  if (user) {
    const displayName = user.name || user.email.split("@")[0];
    userText.textContent = displayName;

    userMenu.innerHTML = `
      <div class="user-info">${displayName}</div>
      <div class="menu-item" onclick="viewProfile()">Thông tin cá nhân</div>
      <div class="menu-item" onclick="viewOrders()">Đơn hàng của tôi</div>
      <div class="menu-item" onclick="logout()">Đăng xuất</div>
    `;
  } else {
    userText.textContent = "Đăng nhập";
    userMenu.innerHTML = `
      <div class="menu-item" onclick="goToLoginPage()">Đăng nhập / Đăng ký</div>
    `;
  }
}

function goToLoginPage() {
  const isGitHubPages = window.location.hostname.includes("github.io");

  if (isGitHubPages) {
    window.open("login.html", "_self");
  } else {
    window.location.href = "login.html";
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("matmat_user");
  updateUserUI();
  toggleUserMenu(false);
  showToast("Đã đăng xuất", "success");
}

function viewProfile() {
  if (!currentUser) return goToLoginPage();

  alert(
    `Thông tin cá nhân:\n\nEmail: ${currentUser.email}\nTên: ${
      currentUser.name || "Chưa cập nhật"
    }`
  );
  toggleUserMenu(false);
}

function toggleUserMenu(show) {
  const menu = document.getElementById("userMenu");
  if (show) {
    menu.classList.add("show");
  } else {
    menu.classList.remove("show");
  }
}

function renderProducts(productList, containerId = "productGrid") {
  if (!productList || productList.length === 0) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
        <i class="fas fa-box-open" style="font-size: 48px; color: var(--muted); margin-bottom: 16px;"></i>
        <h3 style="color: var(--muted); margin-bottom: 8px;">Không có sản phẩm nào</h3>
      </div>
    `;
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Container not found:", containerId);
    return;
  }

  const uniqueProducts = [];
  const seenIds = new Set();

  for (const product of productList) {
    if (!seenIds.has(product.id)) {
      seenIds.add(product.id);
      uniqueProducts.push(product);
    }
  }

  if (uniqueProducts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
        <i class="fas fa-box-open" style="font-size: 48px; color: var(--muted); margin-bottom: 16px;"></i>
        <h3 style="color: var(--muted); margin-bottom: 8px;">Không có sản phẩm nào</h3>
      </div>
    `;
    return;
  }

  const displayProducts = uniqueProducts.slice(0, currentDisplayCount);
  container.innerHTML = "";

  displayProducts.forEach((product, index) => {
    try {
      const price = parseFloat(product.price) || 0;
      const discount = parseFloat(product.discount) || 0;
      const discountPrice = discount
        ? Math.round(price * (1 - discount / 100))
        : price;
      const rating = parseFloat(product.rating) || 0;

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div>
          ${
            discount
              ? `<span class="badge badge-discount">-${discount}%</span>`
              : ""
          }
          ${index < 5 ? `<span class="badge badge-new">Mới</span>` : ""}
          ${rating >= 4.5 ? `<span class="badge badge-hot">Hot</span>` : ""}
        </div>
        <img src="${
          product.image_url ||
          "https://via.placeholder.com/300x200?text=No+Image"
        }" 
             alt="${product.name || "Sản phẩm"}" 
             onerror="this.src='https://via.placeholder.com/300x200?text=Error+Loading'">
        <h4>${product.name || "Sản phẩm không có tên"}</h4>
        
        <div class="rating">
          <div class="stars">
            ${"★".repeat(Math.floor(rating))}${"☆".repeat(
        5 - Math.floor(rating)
      )}
          </div>
          <span class="rating-count">(${rating.toFixed(1)})</span>
        </div>
        
        <div class="price-container">
          ${
            discount
              ? `<div class="original-price">${formatPrice(price)}</div>`
              : ""
          }
          <div class="final-price">${formatPrice(discountPrice)}</div>
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <div style="font-size:12px;color:var(--muted)">${
            product.category || "Chưa phân loại"
          }</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-view" onclick="viewProduct(${
              product.id
            })">Xem</button>
            <button class="btn btn-add" onclick="addToCart(${
              product.id
            })">Thêm vào giỏ</button>
          </div>
        </div>
      `;

      container.appendChild(card);
    } catch (error) {
      console.error(`Error rendering product ${index}:`, error);
    }
  });

  addLoadMoreButton();
}

async function viewProduct(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) throw new Error("Product not found");
    const product = await response.json();

    alert(`
${product.name}

💰 Giá: ${formatPrice(product.price)}
${
  product.discount
    ? `🎯 Giảm: ${product.discount}% (Còn: ${formatPrice(
        Math.round(product.price * (1 - product.discount / 100))
      )})`
    : ""
}
📂 Danh mục: ${product.category}
⭐ Đánh giá: ${product.rating || "Chưa có đánh giá"}
📦 Mô tả: ${product.description || "Không có mô tả"}
        `);
  } catch (error) {
    console.error("Error viewing product:", error);
    showToast("Không thể tải thông tin sản phẩm", "error");
  }
}

function saveCart() {
  localStorage.setItem("matmat_cart", JSON.stringify(cart));
  localStorage.setItem("matmat_coupon", JSON.stringify(coupon));
}

function addToCart(productId) {
  if (!currentUser) {
    if (
      confirm(
        "Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng. Đăng nhập ngay?"
      )
    ) {
      goToLoginPage();
    }
    return;
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    showToast("Sản phẩm không tồn tại", "error");
    return;
  }

  const discount = parseFloat(product.discount) || 0;
  const originalPrice = parseFloat(product.price) || 0;
  const finalPrice =
    discount > 0
      ? Math.round(originalPrice * (1 - discount / 100))
      : originalPrice;

  const ex = cart.find((c) => c.id === productId);
  if (ex) {
    ex.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: finalPrice,
      originalPrice: originalPrice,
      discount: discount,
      img: product.image_url,
      qty: 1,
    });
  }

  saveCart();

  // ✅ BẮT BUỘC cập nhật badge ngay lập tức
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartBadge = document.getElementById("cartBadge");
  if (cartBadge) {
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? "flex" : "none";
  }

  // Sau đó mới gọi updateMiniCart()
  updateMiniCart();

  const button = event.target;
  const originalText = button.textContent;
  button.textContent = "✓ Đã thêm";
  button.style.background = "#2ed573";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "";
  }, 1500);

  showToast("Đã thêm vào giỏ", "success");
}
function changeQty(id, delta) {
  const item = cart.find((c) => c.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty < 1) item.qty = 1;

  saveCart();
  updateMiniCart();
  renderCartTable();
}

function removeItem(id) {
  cart = cart.filter((c) => c.id !== id);
  saveCart();
  updateMiniCart();
  renderCartTable();
  showToast("Đã xóa sản phẩm khỏi giỏ hàng", "success");
}

function clearCart() {
  if (!confirm("Xác nhận xóa toàn bộ giỏ hàng?")) return;
  cart = [];
  saveCart();
  updateMiniCart();
  renderCartTable();
  showToast("Đã xóa toàn bộ giỏ hàng", "success");
}

function subtotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function updateMiniCart() {
  const list = document.getElementById("miniCartList");
  const cartBadge = document.getElementById("cartBadge");

  if (cart.length === 0) {
    if (list) {
      list.innerHTML = `
        <div style="text-align:center;color:var(--muted);padding:20px 0">
          <i class="fas fa-shopping-cart" style="font-size:36px;margin-bottom:12px;color:#e0e0e0;"></i>
          <div>Giỏ hàng trống</div>
        </div>
      `;
    }
  } else {
    if (list) {
      list.innerHTML = "";
      cart.forEach((i) => {
        const priceToShow = i.price;
        const originalPrice = i.originalPrice || i.price;
        const hasDiscount = i.discount > 0;
        const el = document.createElement("div");
        el.className = "cart-item";
        el.innerHTML = `
          <img src="${
            i.img
          }" onerror="this.src='https://via.placeholder.com/64x64?text=No+Image'" />
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">${i.name}</div>
            ${
              hasDiscount
                ? `
              <div style="color:var(--muted);font-size:12px">
                <span style="text-decoration: line-through">${formatPrice(
                  originalPrice
                )}</span>
                <span style="color:#ff4757; margin-left:4px">-${
                  i.discount
                }%</span>
              </div>
              <div style="color:var(--accent);font-weight:700;font-size:14px">
                ${formatPrice(priceToShow)}
              </div>
            `
                : `
              <div style="color:var(--muted);font-size:12px">${formatPrice(
                priceToShow
              )}</div>
            `
            }
            <div class="qty" style="margin-top:6px">
              <button onclick="changeQty(${i.id},-1)">-</button>
              <div style="padding:4px 8px;border-radius:4px;border:1px solid #eef2f6;min-width:30px;text-align:center">${
                i.qty
              }</div>
              <button onclick="changeQty(${i.id},1)">+</button>
              <button class="btn" style="margin-left:8px;padding:4px 8px;font-size:12px" onclick="removeItem(${
                i.id
              })">Xóa</button>
            </div>
          </div>
          <div style="text-align:right;font-weight:700;font-size:14px">${formatPrice(
            priceToShow * i.qty
          )}</div>
        `;
        list.appendChild(el);
      });
    }
  }

  const count = cart.reduce((s, i) => s + i.qty, 0);
  if (cartBadge) {
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? "flex" : "none";
  }

  const sub = subtotal();
  const ship = shippingFee();
  const discount = discountValue();
  const total = sub - discount + ship;

  const miniSubtotal = document.getElementById("miniSubtotal");
  const miniShip = document.getElementById("miniShip");
  const miniTotal = document.getElementById("miniTotal");

  if (miniSubtotal) miniSubtotal.innerText = formatPrice(sub);
  if (miniShip) miniShip.innerText = formatPrice(ship);
  if (miniTotal) miniTotal.innerText = formatPrice(total);

  document.getElementById("drawerSubtotal").innerText = formatPrice(sub);
  document.getElementById("drawerShip").innerText = formatPrice(ship);
  document.getElementById("drawerDiscount").innerText = `-${formatPrice(
    discount
  )}`;
  document.getElementById("drawerTotal").innerText = formatPrice(total);

  const appliedCouponDiv = document.getElementById("appliedCouponDrawer");
  if (coupon) {
    appliedCouponDiv.style.display = "block";
    document.getElementById("couponCodeDrawer").textContent = coupon.code;

    if (coupon.type === "percent") {
      document.getElementById(
        "couponValueDrawer"
      ).textContent = `${coupon.value}%`;
    } else {
      document.getElementById("couponValueDrawer").textContent = `${formatPrice(
        coupon.value
      )}`;
    }
  } else {
    appliedCouponDiv.style.display = "none";
  }

  document.getElementById("paySubtotal").textContent = formatPrice(sub);
  document.getElementById("payDiscount").textContent = `-${formatPrice(
    discount
  )}`;
  document.getElementById("payShip").textContent = formatPrice(ship);
  document.getElementById("payTotal").textContent = formatPrice(total);

  saveCart();
}

function shippingFee() {
  const s = subtotal();
  if (s === 0) return 0;
  if (s < 100000) return 30000;
  if (s < 300000) return 20000;
  return 0;
}

function discountValue() {
  const s = subtotal();
  if (!coupon) return 0;
  if (coupon.type === "percent") return Math.round(s * (coupon.value / 100));
  if (coupon.type === "fixed") return coupon.value;
  return 0;
}

function updateCouponDisplay() {
  const appliedCouponDrawer = document.getElementById("appliedCouponDrawer");
  const appliedCouponModal = document.getElementById("appliedCoupon");

  if (coupon) {
    appliedCouponDrawer.style.display = "block";
    appliedCouponModal.style.display = "block";

    document.getElementById("couponCodeDrawer").textContent = coupon.code;
    document.getElementById("couponCode").textContent = coupon.code;

    if (coupon.type === "percent") {
      document.getElementById(
        "couponValueDrawer"
      ).textContent = `${coupon.value}%`;
      document.getElementById("couponValue").textContent = `${coupon.value}%`;
    } else {
      document.getElementById("couponValueDrawer").textContent = formatPrice(
        coupon.value
      );
      document.getElementById("couponValue").textContent = formatPrice(
        coupon.value
      );
    }

    document.getElementById(
      "couponStatus"
    ).innerHTML = `<span style="color: #2ed573"><i class="fas fa-check-circle"></i> Mã đã được áp dụng</span>`;
  } else {
    appliedCouponDrawer.style.display = "none";
    appliedCouponModal.style.display = "none";
    document.getElementById("couponStatus").textContent =
      "Nhập mã giảm giá để tiết kiệm hơn";
  }
}

function applyCoupon() {
  const code = document
    .getElementById("couponInput")
    .value.trim()
    .toUpperCase();
  applyCouponCommon(code, false);
}

function applyCouponModal() {
  const code = document
    .getElementById("couponInputModal")
    .value.trim()
    .toUpperCase();
  applyCouponCommon(code, true);
}

function applyCouponCommon(code, isFromModal = false) {
  if (!code) {
    showToast("Vui lòng nhập mã giảm giá", "warning");
    return;
  }

  let newCoupon = null;
  let message = "";

  if (code === "MATMAT10") {
    newCoupon = { code: "MATMAT10", type: "percent", value: 10 };
    message = "Áp dụng mã MATMAT10 - giảm 10%";
  } else if (code === "GIAO20K") {
    newCoupon = { code: "GIAO20K", type: "fixed", value: 20000 };
    message = "Áp dụng mã GIAO20K - giảm 20.000 VNĐ";
  } else if (code === "KHAITRUONG") {
    newCoupon = { code: "KHAITRUONG", type: "fixed", value: 100000 };
    message = "Áp dụng mã KHAITRUONG - giảm 100.000 VNĐ";
  } else if (code === "GIUATHANG") {
    newCoupon = { code: "GIUATHANG", type: "percent", value: 50 };
    message = "Áp dụng mã GIUATHANG - giảm 50%";
  } else {
    showToast("Mã không hợp lệ hoặc đã hết hạn", "error");
    return;
  }

  coupon = newCoupon;
  localStorage.setItem("matmat_coupon", JSON.stringify(coupon));

  updateMiniCart();
  renderCartTable();
  updatePaymentModal();

  if (isFromModal) {
    document.getElementById("couponInputModal").value = "";
  } else {
    document.getElementById("couponInput").value = "";
  }

  showToast(message, "success");
}

function removeCoupon() {
  coupon = null;
  localStorage.removeItem("matmat_coupon");

  updateMiniCart();
  renderCartTable();
  updatePaymentModal();

  showToast("Đã xóa mã giảm giá", "success");
}

function openCart(autoCheckout = false) {
  if (!currentUser) {
    if (confirm("Bạn cần đăng nhập để xem giỏ hàng. Đăng nhập ngay?")) {
      goToLoginPage();
    }
    return;
  }

  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("show");
  document.body.style.overflow = "hidden";

  renderCartTable();
  if (autoCheckout) {
    setTimeout(() => proceedToCheckout(), 200);
  }
}

function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("show");
  document.body.style.overflow = "";
}

function renderCartTable() {
  const table = document.getElementById("cartTable");

  if (!table) {
    console.error("cartTable element not found!");
    return;
  }

  if (cart.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 40px; color: var(--muted)">
          <i class="fas fa-shopping-cart" style="font-size: 48px; margin-bottom: 16px; display: block; color: #e0e0e0"></i>
          <div>Giỏ hàng của bạn đang trống</div>
          <button class="btn btn-add" onclick="closeCart()" style="margin-top: 16px">
            <i class="fas fa-shopping-bag"></i> Tiếp tục mua sắm
          </button>
        </td>
      </tr>
    `;

    updateMiniCart();
    return;
  }

  let html = `
  <thead>
  <tr>
  <th style="width: 50%">Sản phẩm</th>
        <th style="width: 25%">Số lượng</th>
        <th style="width: 25%; text-align: right">Thành tiền</th>
      </tr>
      </thead>
      <tbody>
  `;

  cart.forEach((i) => {
    const priceToShow = i.price;
    const originalPrice = i.originalPrice || i.price;
    const hasDiscount = i.discount > 0;

    html += `
      <tr>
        <td>
          <div style="display: flex; gap: 12px; align-items: center">
            <img src="${i.img}" 
                 style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover"
                 onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'" />
            <div>
              <div style="font-weight: 700; margin-bottom: 4px">${i.name}</div>
              ${
                hasDiscount
                  ? `
                <div style="color: var(--muted); font-size: 14px">
                  <span style="text-decoration: line-through; margin-right: 8px">
                    ${formatPrice(originalPrice)}
                  </span>
                  <span style="color: #ff4757; font-weight: 600">
                    -${i.discount}%
                  </span>
                </div>
                <div style="color: var(--accent); font-weight: 700; font-size: 16px">
                  ${formatPrice(priceToShow)}
                </div>
              `
                  : `
                <div style="color: var(--accent); font-weight: 700; font-size: 16px">
                  ${formatPrice(priceToShow)}
                </div>
              `
              }
            </div>
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px">
            <button onclick="changeQty(${
              i.id
            },-1)" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e6e9ef; background: white; cursor: pointer">-</button>
            <div style="padding: 6px 12px; border-radius: 6px; border: 1px solid #eef2f6; min-width: 40px; text-align: center">${
              i.qty
            }</div>
            <button onclick="changeQty(${
              i.id
            },1)" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e6e9ef; background: white; cursor: pointer">+</button>
          </div>
          <button class="btn" onclick="removeItem(${
            i.id
          })" style="margin-top: 8px; padding: 6px 12px; font-size: 13px; background: #fff5f5; color: #ff4757; border: 1px solid #ffcccc">
            <i class="fas fa-trash-alt" style="margin-right: 4px"></i> Xóa
          </button>
        </td>
        <td style="text-align: right; font-weight: 700">
          ${formatPrice(priceToShow * i.qty)}
        </td>
      </tr>
    `;
  });

  html += `</tbody>`;
  table.innerHTML = html;
  updateMiniCart();
}

function debugCart() {
  console.log("=== DEBUG CART ===");
  console.log("Local cart variable:", cart);
  console.log("localStorage matmat_cart:", localStorage.getItem("matmat_cart"));
  console.log("Subtotal:", subtotal());
  console.log("Coupon:", coupon);
  console.log("Current user:", currentUser);
  console.log("=================");
}

function forceResetCart() {
  if (confirm("Reset giỏ hàng?")) {
    cart = [];
    coupon = null;
    localStorage.removeItem("matmat_cart");
    localStorage.removeItem("matmat_coupon");
    updateMiniCart();
    renderCartTable();
    showToast("Đã reset giỏ hàng", "success");
  }
}

function proceedToCheckout() {
  if (!currentUser) {
    showToast("Vui lòng đăng nhập để thanh toán", "warning");
    goToLoginPage();
    return;
  }

  if (cart.length === 0) {
    showToast("Giỏ hàng trống", "warning");
    return;
  }

  closeCart();

  setTimeout(() => {
    openModal();
    renderPaymentSummary();
    updatePaymentModal();
    switchPaymentContent("zalopay");
  }, 300);
}

function updatePaymentModal() {
  const sub = subtotal();
  const discount = discountValue();
  const ship = shippingFee();
  const total = sub - discount + ship;

  document.getElementById("paySubtotal").innerText = formatPrice(sub);
  document.getElementById("payDiscount").innerText = `-${formatPrice(
    discount
  )}`;
  document.getElementById("payShip").innerText = formatPrice(ship);
  document.getElementById("payTotal").innerText = formatPrice(total);

  const appliedCouponDiv = document.getElementById("appliedCoupon");
  const couponStatus = document.getElementById("couponStatus");

  if (coupon) {
    appliedCouponDiv.style.display = "block";
    document.getElementById("couponCode").textContent = coupon.code;

    if (coupon.type === "percent") {
      document.getElementById("couponValue").textContent = `${coupon.value}%`;
    } else {
      document.getElementById("couponValue").textContent = formatPrice(
        coupon.value
      );
    }

    couponStatus.innerHTML = `<span style="color: #2ed573">✓ Mã đã được áp dụng</span>`;
  } else {
    appliedCouponDiv.style.display = "none";
    couponStatus.textContent = "Nhập mã giảm giá để tiết kiệm hơn";
  }
}

function renderPaymentSummary() {
  const sumBox = document.getElementById("checkoutSummary");
  sumBox.innerHTML = "";

  if (cart.length === 0) {
    sumBox.innerHTML =
      '<div style="text-align:center;padding:20px;color:var(--muted)">Giỏ hàng trống</div>';
    return;
  }

  cart.forEach((i) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "12px";
    div.style.padding = "8px 0";
    div.style.borderBottom = "1px solid #f1f1f1";
    div.style.alignItems = "center";

    div.innerHTML = `
      <img src="${i.img}" 
           style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover"
           onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'" />
      <div style="flex: 1">
        <div style="font-weight: 600; font-size: 14px">${i.name}</div>
        <div style="color: var(--muted); font-size: 13px">
          ${formatPrice(i.price)} × ${i.qty}
        </div>
      </div>
      <div style="font-weight: 700">${formatPrice(i.price * i.qty)}</div>
    `;
    sumBox.appendChild(div);
  });
}

function openModal() {
  document.getElementById("modalBackdrop").classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.remove("show");
  document.body.style.overflow = "";
}

function switchMethod(e) {
  const method = e.target.dataset.method;
  currentMethod = method;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  e.target.classList.add("active");
  switchPaymentContent(method);
}

function switchPaymentContent(method) {
  currentMethod = method;
  const content = document.getElementById("paymentContent");

  if (method === "zalopay") {
    content.innerHTML = `
      <div style="text-align: center">
        <p>Quét mã QR dưới đây bằng ứng dụng ZaloPay để hoàn tất thanh toán.</p>
        <div class='qr-wrapper'>
          <img class='qr' src='https://sf-static.upanhlaylink.com/img/image_2025121082d97f3cc4bc430608f8dd41e7cc5602.jpg' alt='QR' />
        </div>
       
        <div style='display:flex;gap:8px;margin-top:16px;justify-content:center'>
          <button class='btn' onclick='closeModal()'>Hủy thanh toán</button>
        </div>
      </div>
    `;
  } else if (method === "bank") {
    content.innerHTML = `
      <div style="text-align: center">
        <p>Vui lòng chuyển khoản tới tài khoản bên dưới, ghi mã đơn hàng.</p>
        <div class='qr-wrapper'>
          <img class='qr' src='https://sf-static.upanhlaylink.com/img/image_202512109b924479d977e84f75038ce0814f41ac.jpg' alt='QR' />
        </div>
        <div style='margin-top:12px;background:#f8f9fa;padding:12px;border-radius:8px'>
          <div><strong>Ngân hàng:</strong>BIDV</div>
          <div><strong>Số tài khoản:</strong> 8803713182</div>
          <div><strong>Chủ tài khoản:</strong>Vu Duc Huy</div>
        </div>
        <div style='display:flex;gap:8px;margin-top:16px;justify-content:center'>
          <button class='btn' onclick='closeModal()'>Hủy thanh toán</button>
        </div>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div style="text-align: center">
        <p>Thu tiền trực tiếp tại địa chỉ giao hàng. Nhà vận chuyển sẽ thu đầy đủ đơn hàng.</p>
        <div style='margin-top:12px;background:#f8f9fa;padding:20px;border-radius:8px'>
          <i class="fas fa-truck" style="font-size:48px;color:var(--accent);margin-bottom:12px"></i>
          <div><strong>Phí thu hộ:</strong> 0 VNĐ</div>
          <div><strong>Dự kiến giao hàng:</strong> 2-4 ngày làm việc</div>
        </div>
        <div style='display:flex;gap:8px;margin-top:16px;justify-content:center'>
          <button class='btn btn-add' onclick='confirmPayment()'>
            <i class="fas fa-check" style="margin-right:6px"></i> 
            Xác nhận đơn (COD)
          </button>
          <button class='btn' onclick='closeModal()'>Hủy thanh toán</button>
        </div>
      </div>
    `;
  }
}

async function confirmPayment() {
  if (window.isProcessingPayment) return;
  if (!confirm("Xác nhận thanh toán đơn hàng này?")) return;

  window.isProcessingPayment = true;

  try {
    const cartCopy = JSON.parse(JSON.stringify(cart));
    const orderId = "MM" + Math.floor(Math.random() * 900000 + 100000);

    if (!currentUser || cartCopy.length === 0) {
      throw new Error("Giỏ hàng trống hoặc bạn chưa đăng nhập");
    }

    // Logic tính tiền (giữ nguyên của bạn)
    const sub = cartCopy.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = coupon
      ? coupon.type === "percent"
        ? Math.round((sub * coupon.value) / 100)
        : coupon.value
      : 0;
    const ship = sub < 300000 ? 20000 : 0;
    const total = sub - disc + ship;

    const orderData = {
      id: Date.now(), // Đây là ID nội bộ để truy vấn
      order_id: orderId, // Đây là mã hiển thị MM123456
      user_id: currentUser.id,
      total_amount: total,
      items: cartCopy,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    // 1. Lưu đơn hàng
    const existingOrders = JSON.parse(
      localStorage.getItem("matmat_orders") || "[]"
    );
    existingOrders.unshift(orderData);
    localStorage.setItem("matmat_orders", JSON.stringify(existingOrders));

    // 2. QUAN TRỌNG: Reset toàn bộ dữ liệu giỏ hàng
    cart = [];
    coupon = null; // Reset mã giảm giá
    localStorage.setItem("matmat_cart", JSON.stringify([])); // Xóa trong Storage
    localStorage.setItem("matmat_coupon", "null");

    // 3. Cập nhật giao diện ngay lập tức
    updateMiniCart(); // Hàm này sẽ làm logo giỏ hàng về số 0
    if (typeof renderCartTable === "function") renderCartTable(); // Xóa bảng trong modal giỏ hàng

    // 4. Đóng các modal đang mở
    closeModal();
    closeCart();

    // 5. Hiện thông báo thành công
    showOrderSuccess(orderData.order_id, orderData.id);

    // Gọi API lưu server (nếu có)
    createOrder(orderData).catch((err) => console.error("Lỗi API:", err));
  } catch (error) {
    alert("Lỗi: " + error.message);
  } finally {
    window.isProcessingPayment = false;
  }
}
// Hàm hiển thị modal thành công
function showOrderSuccess(orderId, internalId) {
  lastOrderId = internalId; // Lưu lại ID (thường là Date.now()) để mở chi tiết
  const modal = document.getElementById("successModal");
  const idTxt = document.getElementById("successOrderId");
  if (idTxt) idTxt.innerText = orderId;
  if (modal) modal.style.display = "flex";
}
// Hàm đóng modal thành công để mua tiếp
function closeSuccessModal() {
  document.getElementById("successModal").style.display = "none";
}

// Hàm xử lý khi bấm "Xem đơn hàng"
function viewOrderJustPlaced() {
  closeSuccessModal(); // Đóng modal thông báo thành công

  setTimeout(() => {
    if (lastOrderId) {
      // ĐỔI TÊN HÀM: Từ viewOrderDetail sang openOrderDetailModal
      openOrderDetailModal(lastOrderId);
    } else {
      openOrdersModal();
    }
  }, 300);
}
function updateCartUIAfterReset() {
  // Reset badge
  const cartBadge = document.getElementById("cartBadge");
  if (cartBadge) {
    cartBadge.textContent = "0";
    cartBadge.style.display = "none";
  }

  // Gọi updateMiniCart() để render giỏ hàng trống
  updateMiniCart();

  // Render cartTable với thông báo
  const cartTable = document.getElementById("cartTable");
  if (cartTable) {
    cartTable.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;padding:40px">
          <i class="fas fa-check-circle" style="font-size:64px;color:#2ed573"></i>
          <div style="margin-top:16px;font-weight:600;font-size:18px">Đơn hàng đã được tạo</div>
          <div style="color:var(--muted);margin-top:8px">Giỏ hàng đã được reset</div>
        </td>
      </tr>
    `;
  }
}
const moneyIds = [
  "miniSubtotal",
  "miniShip",
  "miniTotal",
  "drawerSubtotal",
  "drawerDiscount",
  "drawerShip",
  "drawerTotal",
  "paySubtotal",
  "payDiscount",
  "payShip",
  "payTotal",
];

moneyIds.forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.textContent = "0 ₫";
});

const couponElements = ["appliedCouponDrawer", "appliedCoupon"];
couponElements.forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
});
async function doSearch() {
  const keyword = document.getElementById("searchInput").value.trim();

  if (!keyword) {
    await initProducts();
    return;
  }

  const searchResults = await searchProducts(keyword);
  renderProducts(searchResults, "productGrid");

  if (searchResults.length === 0) {
    showToast(
      `Không tìm thấy sản phẩm nào với từ khóa "${keyword}"`,
      "warning"
    );
  }
}

function refreshCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartBadge = document.getElementById("cartBadge");
  if (cartBadge) {
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? "flex" : "none";
  }

  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ship = sub === 0 ? 0 : sub < 100000 ? 30000 : sub < 300000 ? 20000 : 0;
  const discount = coupon
    ? coupon.type === "percent"
      ? Math.round((sub * coupon.value) / 100)
      : coupon.value
    : 0;
  const total = sub - discount + ship;

  const elements = {
    miniSubtotal: sub,
    miniShip: ship,
    miniTotal: total,
    drawerSubtotal: sub,
    drawerShip: ship,
    drawerDiscount: discount,
    drawerTotal: total,
  };

  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatPrice(value);
  });
}

function setupCategoryFilter() {
  const categoryButtons = document.querySelectorAll(".category-btn");

  categoryButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      categoryButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const category = button.dataset.category;

      if (category === "all") {
        await initProducts();
      } else {
        const filteredProducts = await getProductsByCategory(category);
        renderProducts(filteredProducts, "productGrid");
      }
    });
  });
}

async function viewAllDiscounted() {
  const discountedProducts = await fetchDiscountedProducts();
  renderProducts(discountedProducts, "productGrid");

  document
    .querySelectorAll(".category-btn")
    .forEach((btn) => btn.classList.remove("active"));
  showToast("Đang hiển thị tất cả sản phẩm khuyến mãi", "info");
}

function openOrdersModal() {
  const modal = document.getElementById("ordersModal");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      renderOrdersList();
    }, 100);
  } else {
    console.error("ordersModal element not found!");
  }
}

function closeOrdersModal() {
  const modal = document.getElementById("ordersModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
}

function openOrderDetailModal(orderId) {
  closeOrdersModal();

  const modal = document.getElementById("orderDetailModal");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    renderOrderDetail(orderId);
  }
}

function closeOrderDetailModal() {
  const modal = document.getElementById("orderDetailModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
  }
}

function viewOrders() {
  if (!currentUser) {
    showToast("Vui lòng đăng nhập để xem đơn hàng", "warning");
    goToLoginPage();
    return;
  }

  openOrdersModal();
}

function getStatusText(status) {
  const statusMap = {
    pending: "Chờ xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang giao hàng",
    delivered: "Đã giao hàng",
    cancelled: "Đã hủy",
  };
  return statusMap[status] || status;
}

function getStatusColor(status) {
  const colorMap = {
    pending: "#ffa502",
    processing: "#1e90ff",
    shipping: "#3742fa",
    delivered: "#2ed573",
    cancelled: "#747d8c",
  };
  return colorMap[status] || "#ff4757";
}

function backToOrdersList() {
  closeOrderDetailModal();

  setTimeout(() => {
    openOrdersModal();
  }, 300);
}

function getPaymentMethodName(method) {
  const methodMap = {
    zalopay: "ZaloPay",
    bank: "Chuyển khoản ngân hàng",
    cod: "Thanh toán khi nhận hàng (COD)",
  };
  return methodMap[method] || method;
}

async function renderOrdersList() {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) {
    console.error("ordersList element not found");
    return;
  }

  try {
    ordersList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666">
        <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--accent)"></i>
        <div style="margin-top: 16px; font-size: 16px">Đang tải danh sách đơn hàng...</div>
      </div>
    `;

    const allOrders = JSON.parse(localStorage.getItem("matmat_orders") || "[]");

    if (!currentUser) {
      ordersList.innerHTML = `
        <div style="text-align: center; padding: 60px 20px">
          <i class="fas fa-user-slash" style="font-size: 64px; color: #e0e0e0; margin-bottom: 20px"></i>
          <h3 style="font-weight: 600; margin-bottom: 12px">Vui lòng đăng nhập</h3>
          <p style="margin-bottom: 24px">Bạn cần đăng nhập để xem đơn hàng</p>
          <button class="btn btn-add" onclick="goToLoginPage()" style="padding: 12px 24px">
            <i class="fas fa-sign-in-alt"></i> Đăng nhập ngay
          </button>
        </div>
      `;
      return;
    }

    const userOrders = allOrders.filter((order) => {
      return (
        order.user_id === currentUser.id ||
        order.userId === currentUser.id ||
        order.user === currentUser.id ||
        !order.user_id
      );
    });

    userOrders.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0);
      const dateB = new Date(b.created_at || b.date || 0);
      return dateB - dateA;
    });

    if (userOrders.length === 0) {
      ordersList.innerHTML = `
        <div style="text-align: center; padding: 60px 20px">
          <i class="fas fa-box-open" style="font-size: 64px; color: #e0e0e0; margin-bottom: 20px"></i>
          <h3 style="font-weight: 600; margin-bottom: 12px; color: #333">Bạn chưa có đơn hàng nào</h3>
          <p style="color: #666; margin-bottom: 24px; max-width: 400px; margin: 0 auto">
            Hãy mua sắm và tạo đơn hàng đầu tiên của bạn!
          </p>
          <button class="btn btn-add" onclick="closeOrdersModal()" style="padding: 12px 24px; background: var(--accent); color: white; border: none; border-radius: 8px">
            <i class="fas fa-shopping-bag" style="margin-right: 8px"></i>
            Mua sắm ngay
          </button>
        </div>
      `;
      return;
    }

    let html = `
      <div style="padding: 10px">
        <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee">
          <h3 style="margin: 0; color: var(--accent)">Đơn hàng của tôi</h3>
          <div style="font-size: 14px; color: #666; margin-top: 4px">
            Tổng cộng: <strong>${userOrders.length}</strong> đơn hàng
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px">
    `;

    userOrders.forEach((order, index) => {
      const orderDate = new Date(order.created_at || order.date || Date.now());
      const formattedDate = orderDate.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const formattedTime = orderDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemCount = order.items
        ? order.items.reduce(
            (sum, item) => sum + (item.quantity || item.qty || 0),
            0
          )
        : 0;

      const totalAmount = order.total_amount || order.total || 0;
      const status = order.status || "pending";
      const statusText =
        status === "pending"
          ? "Chờ xác nhận"
          : status === "processing"
          ? "Đang xử lý"
          : status === "delivered"
          ? "Đã giao"
          : status === "cancelled"
          ? "Đã hủy"
          : "Đang giao";
      const statusColor =
        status === "pending"
          ? "#ffa502"
          : status === "processing"
          ? "#1e90ff"
          : status === "delivered"
          ? "#2ed573"
          : status === "cancelled"
          ? "#747d8c"
          : "#3742fa";

      html += `
        <div class="order-card" 
             onclick="openOrderDetailModal('${
               order.order_id || order.id || order.order_code
             }')"
             style="border: 1px solid #e6e9ef; border-radius: 12px; padding: 16px; 
                    background: white; cursor: pointer; transition: all 0.2s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px">
            <div>
              <div style="font-weight: 700; color: var(--accent); font-size: 16px; margin-bottom: 4px">
                ${
                  order.order_code ||
                  order.id ||
                  `ĐH${(index + 1).toString().padStart(3, "0")}`
                }
              </div>
              <div style="font-size: 14px; color: #666">
                <i class="far fa-calendar" style="margin-right: 6px"></i>
                ${formattedDate} ${formattedTime}
              </div>
            </div>
            <div style="background: ${statusColor}; color: white; padding: 4px 12px; 
                        border-radius: 20px; font-size: 12px; font-weight: 600">
              ${statusText}
            </div>
                ${
                  status === "cancelled"
                    ? `
            <button class="btn-delete-order" 
                    onclick="deleteSingleOrder('${
                      order.order_id || order.id || order.order_code
                    }', event)"
                    style="
                      background: none;
                      border: 1px solid #ffcccc;
                      color: #ff4757;
                      width: 30px;
                      height: 30px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                      transition: all 0.2s;
                    "
                    title="Xóa đơn hàng này">
              <i class="fas fa-times" style="font-size: 12px"></i>
            </button>
            `
                    : ""
                }
      </div>
    </div>
    
          <div style="margin-bottom: 12px">
            <div style="font-size: 14px; color: #666; margin-bottom: 8px">
              <i class="fas fa-box" style="margin-right: 6px"></i>
              ${itemCount} sản phẩm
              <span style="margin: 0 8px">•</span>
              <i class="fas fa-credit-card" style="margin-right: 6px"></i>
              ${
                order.payment_method === "cod"
                  ? "COD"
                  : order.payment_method === "zalopay"
                  ? "ZaloPay"
                  : order.payment_method === "bank"
                  ? "Chuyển khoản"
                  : "Thanh toán"
              }
            </div>
            
            ${
              order.items && order.items.length > 0
                ? `
              <div style="display: flex; gap: 12px; margin-top: 8px">
                ${order.items
                  .slice(0, 2)
                  .map(
                    (item) => `
                  <div style="display: flex; align-items: center; gap: 8px">
                    <img src="${
                      item.image_url ||
                      item.img ||
                      "https://via.placeholder.com/40x40?text=No+Image"
                    }" 
                         style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover">
                    <div style="font-size: 13px">
                      <div style="font-weight: 600; line-height: 1.2">${
                        item.name || item.product_name || "Sản phẩm"
                      }</div>
                      <div style="color: #666; font-size: 12px">x${
                        item.quantity || item.qty || 1
                      }</div>
                    </div>
                  </div>
                `
                  )
                  .join("")}
                
                ${
                  order.items.length > 2
                    ? `
                  <div style="display: flex; align-items: center; color: var(--accent); font-size: 13px; font-weight: 600">
                    +${order.items.length - 2} sản phẩm khác
                  </div>
                `
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; 
                      border-top: 1px solid #f0f0f0; padding-top: 12px">
            <div style="font-size: 14px; color: #666">
              <i class="fas fa-map-marker-alt" style="margin-right: 6px"></i>
              ${
                order.shipping_address
                  ? order.shipping_address.substring(0, 30) + "..."
                  : "167 Thanh Nhàn, Hà Nội"
              }
            </div>
            <div style="text-align: right">
              <div style="font-size: 14px; color: #666">Tổng cộng</div>
              <div style="font-weight: 700; font-size: 20px; color: var(--accent)">
                ${formatPrice(totalAmount)}
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    ordersList.innerHTML = html;
  } catch (error) {
    console.error("ERROR in renderOrdersList:", error);
    ordersList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff4757; margin-bottom: 16px"></i>
        <h3 style="font-weight: 600; margin-bottom: 8px">Lỗi khi tải đơn hàng</h3>
        <p style="margin-bottom: 20px">${
          error.message || "Vui lòng thử lại sau"
        }</p>
        <button class="btn" onclick="renderOrdersList()" 
                style="padding: 10px 20px; background: #f1f1f1; border: none; border-radius: 6px">
          <i class="fas fa-redo"></i> Thử lại
        </button>
      </div>
    `;
  }
}

async function renderOrderDetail(orderId) {
  const orderDetailContent = document.getElementById("orderDetailContent");

  if (!orderDetailContent) {
    console.error("orderDetailContent element not found!");
    return;
  }

  try {
    orderDetailContent.innerHTML = `
      <div style="text-align: center; padding: 40px">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
        <div style="margin-top: 16px">Đang tải chi tiết đơn hàng...</div>
      </div>
    `;

    const localOrders = JSON.parse(
      localStorage.getItem("matmat_orders") || "[]"
    );
    let order = localOrders.find(
      (o) =>
        o.order_id === orderId || o.id === orderId || o.order_code === orderId
    );

    if (!order) {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        if (response.ok) {
          order = await response.json();
        }
      } catch (apiError) {
        console.log("API fetch failed:", apiError);
      }
    }

    if (!order) {
      orderDetailContent.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--muted)">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #ff4757"></i>
          <div style="font-size: 18px; font-weight: 600">Không tìm thấy đơn hàng</div>
          <div style="font-size: 14px; margin-top: 8px">Đơn hàng với mã ${orderId} không tồn tại</div>
        </div>
      `;
      return;
    }

    document.getElementById("orderDetailTitle").innerHTML = `
      <i class="fas fa-file-invoice"></i> Chi tiết đơn hàng ${
        order.order_code || order.id || order.order_id
      }
    `;

    const orderDate = new Date(
      order.created_at || order.date || Date.now()
    ).toLocaleDateString("vi-VN");
    const orderTime = new Date(
      order.created_at || order.date || Date.now()
    ).toLocaleTimeString("vi-VN");
    const status = order.status || "pending";
    const statusText = getStatusText(status);
    const statusColor = getStatusColor(status);

    const itemCount = order.items
      ? order.items.reduce(
          (total, item) => total + (item.quantity || item.qty || 0),
          0
        )
      : 0;

    const subtotalAmount = order.items
      ? order.items.reduce(
          (total, item) =>
            total +
            (item.price || item.unit_price || 0) *
              (item.quantity || item.qty || 0),
          0
        )
      : 0;

    const shippingFee = order.shipping_fee || order.shippingFee || 0;
    const discount = order.discount_amount || order.discount || 0;
    const total = order.total_amount || order.total || 0;

    let detailHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px">
        
        <div class="order-detail-section">
          <h4>Thông tin đơn hàng</h4>
          <div class="order-info-grid">
            <div class="order-info-item">
              <span class="order-info-label">Mã đơn hàng</span>
              <span class="order-info-value">${
                order.order_code || order.id
              }</span>
            </div>
            <div class="order-info-item">
              <span class="order-info-label">Ngày đặt hàng</span>
              <span class="order-info-value">${orderDate} ${orderTime}</span>
            </div>
            <div class="order-info-item">
              <span class="order-info-label">Trạng thái</span>
              <span class="order-info-value">
                <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px">
                  ${statusText}
                </span>
              </span>
            </div>
            <div class="order-info-item">
              <span class="order-info-label">Phương thức thanh toán</span>
              <span class="order-info-value">${getPaymentMethodName(
                order.payment_method || order.paymentMethod || currentMethod
              )}</span>
            </div>
          </div>
        </div>
        
        <div class="order-detail-section">
          <h4>Danh sách sản phẩm (${itemCount} sản phẩm)</h4>
          <div class="order-items">
    `;

    (order.items || []).forEach((item) => {
      const productName = item.name || item.product_name;
      const productPrice = item.price || item.unit_price;
      const productQty = item.qty || item.quantity;
      const productImage = item.image_url || item.img;

      detailHTML += `
        <div class="order-item" style="cursor: default">
          <img src="${productImage}" alt="${productName}" 
               onclick="viewProductFromOrder(${item.id || item.product_id})"
               style="cursor: pointer"
               onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'"/>
          <div class="order-item-info" style="flex: 1; cursor: pointer" onclick="viewProductFromOrder(${
            item.id || item.product_id
          })">
            <div style="font-weight: 600; font-size: 14px">${productName}</div>
            <div style="color: var(--muted); font-size: 12px; margin-top: 2px">
              Mã SP: SP${(item.id || item.product_id || "")
                .toString()
                .padStart(4, "0")}
            </div>
            <div style="color: var(--muted); font-size: 12px; margin-top: 2px">
              Đơn giá: ${formatPrice(productPrice)}
            </div>
          </div>
          <div style="text-align: right">
            <div style="font-size: 14px">${formatPrice(productPrice)}</div>
            <div style="color: var(--muted); font-size: 12px">Số lượng: ${productQty}</div>
            <div style="font-weight: 700; font-size: 16px; margin-top: 4px; color: var(--accent)">
              ${formatPrice(productPrice * productQty)}
            </div>
            <button class="btn" style="padding: 4px 8px; font-size: 12px; margin-top: 8px" 
                    onclick="viewProductFromOrder(${
                      item.id || item.product_id
                    })">
              <i class="fas fa-eye" style="margin-right: 4px"></i>
              Xem chi tiết
            </button>
          </div>
        </div>
      `;
    });

    detailHTML += `
          </div>
        </div>
        
        <div class="order-detail-section">
          <h4>Chi tiết thanh toán</h4>
          <div class="order-total-breakdown">
            <div class="order-total-row">
              <span>Tạm tính (${itemCount} sản phẩm)</span>
              <span>${formatPrice(subtotalAmount)}</span>
            </div>
    `;

    if (discount > 0) {
      detailHTML += `
        <div class="order-total-row">
          <span>Giảm giá</span>
          <span>- ${formatPrice(discount)}</span>
        </div>
      `;
    }

    detailHTML += `
            <div class="order-total-row">
              <span>Phí vận chuyển</span>
              <span>${formatPrice(shippingFee)}</span>
            </div>
            <div class="order-total-row final">
              <span>Tổng thanh toán</span>
              <span>${formatPrice(order.total_amount || order.total)}</span>
            </div>
          </div>
        </div>
        
        <div class="order-detail-section">
          <h4>Địa chỉ giao hàng</h4>
          <div style="display: flex; align-items: center; gap: 12px">
            <i class="fas fa-map-marker-alt" style="color: var(--accent); font-size: 18px"></i>
            <div>
              <div style="font-weight: 600">${
                currentUser
                  ? currentUser.name || currentUser.email.split("@")[0]
                  : "Khách hàng"
              }</div>
              <div style="color: var(--muted); font-size: 14px; margin-top: 4px">
                ${
                  order.shipping_address ||
                  order.shippingAddress ||
                  "167 Thanh Nhàn, Hai Bà Trưng, Hà Nội"
                }
              </div>
            </div>
          </div>
        </div>
        
        ${
          order.coupon
            ? `
        <div class="order-detail-section">
          <h4>Mã giảm giá đã sử dụng</h4>
          <div style="display: flex; align-items: center; gap: 12px; background: #f0fff4; padding: 12px; border-radius: 8px">
            <i class="fas fa-tag" style="color: #2ed573; font-size: 18px"></i>
            <div>
              <div style="font-weight: 600; color: #2ed573">${
                order.coupon.code
              }</div>
              <div style="color: var(--muted); font-size: 14px; margin-top: 2px">
                ${
                  order.coupon.type === "percent"
                    ? `Giảm ${order.coupon.value}%`
                    : `Giảm ${formatPrice(order.coupon.value)}`
                }
              </div>
            </div>
          </div>
        </div>
        `
            : ""
        }
        
        <div class="order-actions">
          <button class="btn" onclick="backToOrders()">
            <i class="fas fa-arrow-left" style="margin-right: 6px"></i>
            Quay lại
          </button>
          <button class="btn btn-add" onclick="reorderItems('${
            order.order_id || order.id
          }')">
            <i class="fas fa-redo" style="margin-right: 6px"></i>
            Đặt lại đơn hàng
          </button>
          ${
            order.status === "pending"
              ? `
          <button class="btn" style="background: #ff4757; color: white" onclick="cancelOrder('${
            order.order_id || order.id
          }')">
            <i class="fas fa-times" style="margin-right: 6px"></i>
            Hủy đơn hàng
          </button>
          `
              : ""
          }
        </div>
      </div>
    `;

    document.getElementById("orderDetailContent").innerHTML = detailHTML;
  } catch (error) {
    console.error("Error rendering order detail:", error);
    orderDetailContent.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--muted)">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; color: #ff4757"></i>
        <div style="font-size: 18px; font-weight: 600">Lỗi khi tải chi tiết đơn hàng</div>
        <div style="font-size: 14px; margin-top: 8px">${error.message}</div>
      </div>
    `;
  }
}

function deleteSingleOrder(orderId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  if (
    !confirm(
      "Bạn có chắc muốn xóa đơn hàng này?\n\nSau khi xóa sẽ không thể khôi phục lại."
    )
  ) {
    return;
  }

  try {
    const allOrders = JSON.parse(localStorage.getItem("matmat_orders") || "[]");

    const filteredOrders = allOrders.filter(
      (order) =>
        order.order_id !== orderId &&
        order.id !== orderId &&
        order.order_code !== orderId
    );

    if (allOrders.length === filteredOrders.length) {
      showToast("Không tìm thấy đơn hàng để xóa", "error");
      return;
    }

    localStorage.setItem("matmat_orders", JSON.stringify(filteredOrders));

    showToast("✅ Đã xóa đơn hàng", "success");

    setTimeout(() => {
      renderOrdersList();
    }, 300);
  } catch (error) {
    console.error("Error deleting order:", error);
    showToast("❌ Lỗi khi xóa đơn hàng", "error");
  }
}

function viewProductFromOrder(productId) {
  closeOrderDetailModal();
  closeOrdersModal();

  setTimeout(() => {
    viewProduct(productId);
  }, 300);
}

function reorderItems(orderId) {
  const localOrders = JSON.parse(localStorage.getItem("matmat_orders") || "[]");
  const order = localOrders.find(
    (o) => o.order_id === orderId || o.id === orderId
  );

  if (!order || !order.items) return;

  cart = [];

  order.items.forEach((item) => {
    const existing = cart.find((c) => c.id === (item.id || item.product_id));
    if (existing) {
      existing.qty += item.qty || item.quantity;
    } else {
      cart.push({
        id: item.id || item.product_id,
        name: item.name || item.product_name,
        price: item.price || item.unit_price,
        img: item.image_url || item.img,
        qty: item.qty || item.quantity,
      });
    }
  });

  saveCart();
  updateMiniCart();

  closeOrderDetailModal();
  closeOrdersModal();

  setTimeout(() => {
    openCart();
    showToast(`Đã thêm ${order.items.length} sản phẩm vào giỏ hàng`, "success");
  }, 300);
}

async function cancelOrder(orderId) {
  if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
    return;
  }

  try {
    showToast("Đang xử lý hủy đơn hàng...", "info");

    const orders = JSON.parse(localStorage.getItem("matmat_orders") || "[]");
    const orderIndex = orders.findIndex(
      (o) =>
        o.order_id === orderId || o.id === orderId || o.order_code === orderId
    );

    if (orderIndex === -1) {
      showToast("Không tìm thấy đơn hàng để hủy", "error");
      return;
    }

    const order = orders[orderIndex];
    if (order.status && order.status !== "pending") {
      showToast(
        `Không thể hủy đơn hàng với trạng thái: ${getStatusText(order.status)}`,
        "error"
      );
      return;
    }

    orders[orderIndex].status = "cancelled";
    orders[orderIndex].cancelled_at = new Date().toISOString();
    localStorage.setItem("matmat_orders", JSON.stringify(orders));

    showToast("✅ Đã hủy đơn hàng thành công", "success");

    closeOrderDetailModal();

    setTimeout(() => {
      openOrdersModal();
    }, 1000);
  } catch (error) {
    console.error("Error cancelling order:", error);
    showToast(`❌ Không thể hủy đơn hàng: ${error.message}`, "error");
  }
}

async function initProducts() {
  products = await fetchProducts();

  const uniqueProducts = [];
  const seenIds = new Set();

  for (const product of products) {
    if (!seenIds.has(product.id)) {
      seenIds.add(product.id);
      uniqueProducts.push(product);
    }
  }

  products = uniqueProducts;
  currentDisplayCount = 20;

  const displayProducts = products.slice(0, currentDisplayCount);
  renderProducts(displayProducts, "productGrid");

  const discounted = await fetchDiscountedProducts();
  if (discounted.length > 0) {
    renderProducts(discounted.slice(0, 8), "discountedProducts");
  }
}

function addLoadMoreButton() {
  const container = document.getElementById("productGrid");
  if (!container) return;

  const oldButton = document.getElementById("loadMoreBtn");
  if (oldButton) oldButton.remove();

  if (currentDisplayCount < products.length) {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.gridColumn = "1 / -1";
    buttonContainer.style.textAlign = "center";
    buttonContainer.style.marginTop = "30px";
    buttonContainer.style.padding = "20px";

    buttonContainer.innerHTML = `
      <button id="loadMoreBtn" class="btn btn-add" style="padding: 12px 36px; font-size: 16px">
        <i class="fas fa-chevron-down" style="margin-right: 8px"></i>
        Xem thêm sản phẩm (${products.length - currentDisplayCount} sản phẩm)
      </button>
    `;

    container.appendChild(buttonContainer);

    document
      .getElementById("loadMoreBtn")
      .addEventListener("click", loadMoreProducts);
  }
}

function loadMoreProducts() {
  currentDisplayCount += PRODUCTS_PER_PAGE;

  const moreProducts = products.slice(0, currentDisplayCount);
  renderProducts(moreProducts, "productGrid");

  setTimeout(() => {
    const cards = document.querySelectorAll(".card");
    if (cards.length > 0) {
      cards[cards.length - 8].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, 100);
}

function forceCartReset() {
  console.log("FORCE CART RESET");

  cart = [];
  coupon = null;

  localStorage.removeItem("matmat_cart");
  localStorage.removeItem("matmat_coupon");

  updateMiniCart();
  renderCartTable();

  closeCart();

  showToast("✅ Đã reset giỏ hàng", "success");
}

window.forceCartReset = forceCartReset;

function backToOrders() {
  closeOrderDetailModal();
  setTimeout(() => {
    openOrdersModal();
  }, 300);
}

async function init() {
  const savedUser = localStorage.getItem("matmat_user");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      localStorage.removeItem("matmat_user");
    }
  }

  updateUserUI();
  updateMiniCart();

  await initProducts();

  setupCategoryFilter();

  document.getElementById("userBtn").addEventListener("click", function (e) {
    if (!currentUser) {
      goToLoginPage();
    } else {
      const menu = document.getElementById("userMenu");
      menu.classList.toggle("show");
    }
    e.stopPropagation();
  });

  document.addEventListener("click", function () {
    toggleUserMenu(false);
  });

  document.getElementById("homeBtn").addEventListener("click", async () => {
    document.getElementById("searchInput").value = "";
    await initProducts();

    document.querySelectorAll(".category-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.category === "all") {
        btn.classList.add("active");
      }
    });
  });

  switchPaymentContent("zalopay");
}

document.addEventListener("DOMContentLoaded", init);
