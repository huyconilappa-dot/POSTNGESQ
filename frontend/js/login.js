const API_BASE_URL = "http://localhost:16738";

// ==================== ANIMATED PARTICLES ====================
function createParticles() {
  const particles = document.getElementById("particles");
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.width = Math.random() * 50 + 10 + "px";
    particle.style.height = particle.style.width;
    particle.style.left = Math.random() * 100 + "%";
    particle.style.top = Math.random() * 100 + "%";
    particle.style.animationDelay = Math.random() * 15 + "s";
    particle.style.animationDuration = Math.random() * 10 + 10 + "s";
    particles.appendChild(particle);
  }
}

// ==================== TIỆN ÍCH ====================
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
                <i class="fas ${
                  type === "success"
                    ? "fa-check-circle"
                    : "fa-exclamation-circle"
                }"></i>
                <span>${message}</span>
            `;

  const container = document.getElementById("toastContainer");
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.4s";
    setTimeout(() => container.removeChild(toast), 400);
  }, 3000);
}

function togglePassword(fieldId, icon) {
  const field = document.getElementById(fieldId);
  if (field.type === "password") {
    field.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    field.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

function switchToRegister() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  loginForm.style.animation = "slideOut 0.4s ease-in";
  setTimeout(() => {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    registerForm.style.animation = "slideIn 0.5s ease-out";
  }, 400);
}

function switchToLogin() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  registerForm.style.animation = "slideOut 0.4s ease-in";
  setTimeout(() => {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    loginForm.style.animation = "slideIn 0.5s ease-out";
  }, 400);
}

// ==================== VALIDATION ====================
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ==================== API FUNCTIONS ====================
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.querySelector("#loginForm .btn-login");

  // Clear errors
  document.getElementById("loginEmailError").textContent = "";
  document.getElementById("loginPassError").textContent = "";

  // Validation
  if (!email) {
    document.getElementById("loginEmailError").textContent =
      "Vui lòng nhập email";
    return;
  }
  if (!validateEmail(email)) {
    document.getElementById("loginEmailError").textContent =
      "Email không hợp lệ";
    return;
  }
  if (!password) {
    document.getElementById("loginPassError").textContent =
      "Vui lòng nhập mật khẩu";
    return;
  }

  // Show loading
  btn.classList.add("loading");
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("Đăng nhập thành công! 🎉", "success");
      localStorage.setItem("matmat_user", JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } else {
      showToast(data.error || "Đăng nhập thất bại", "error");
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  } catch (error) {
    console.error("🔥 Login error:", error);
    showToast("Không thể kết nối đến server", "error");
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

async function handleRegister() {
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const name = document.getElementById("regName").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const btn = document.querySelector("#registerForm .btn-login");

  // Clear errors
  document.getElementById("regEmailError").textContent = "";
  document.getElementById("regPassError").textContent = "";

  // Validation
  if (!email) {
    document.getElementById("regEmailError").textContent =
      "Vui lòng nhập email";
    return;
  }
  if (!validateEmail(email)) {
    document.getElementById("regEmailError").textContent = "Email không hợp lệ";
    return;
  }
  if (!password || password.length < 6) {
    document.getElementById("regPassError").textContent =
      "Mật khẩu cần ít nhất 6 ký tự";
    return;
  }

  // Show loading
  btn.classList.add("loading");
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: name || email.split("@")[0],
        phone: phone || "",
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("Đăng ký thành công! Vui lòng đăng nhập. ✨", "success");

      setTimeout(() => {
        switchToLogin();
        // Clear form
        document.getElementById("regEmail").value = "";
        document.getElementById("regPassword").value = "";
        document.getElementById("regName").value = "";
        document.getElementById("regPhone").value = "";
        btn.classList.remove("loading");
        btn.disabled = false;
      }, 2000);
    } else {
      showToast(data.error || "Đăng ký thất bại", "error");
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  } catch (error) {
    console.error("🔥 Register error:", error);
    showToast("Không thể kết nối đến server", "error");
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

// ==================== INITIALIZE ====================
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Login page loaded");
  createParticles();

  // Add enter key support
  document.getElementById("loginPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  document.getElementById("regPhone").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleRegister();
  });

  // Test connection
  fetch(`${API_BASE_URL}/health`)
    .then((res) => res.json())
    .then((data) => console.log("Server health:", data))
    .catch((err) => console.error("Server connection test failed:", err));
});
