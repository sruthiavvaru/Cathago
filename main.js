document.addEventListener("DOMContentLoaded", () => {
    updateUserDisplay();
    loadPendingRequests();
    fetchUsers();
    fetchAdminPage();
    fetchCreditRequests();
    if (!localStorage.getItem("token") && !window.location.pathname.includes("login.html")) {
        window.location.href = "/login.html";
    }

    const user = JSON.parse(localStorage.getItem("user"));
    const loginLink = document.getElementById("login-link");
    const usernameSpan = document.getElementById("username");
    if (window.location.pathname.includes("/admin") && user.role !== "admin") {
        alert("Admin access required!");
        window.location.href = "/"; 
        return;
    }

    if (user && loginLink && usernameSpan) {
        loginLink.style.display = "none";
        usernameSpan.textContent = `Welcome, ${user.name}`;
        usernameSpan.style.display = "inline-block";
        usernameSpan.addEventListener("click", toggleDropdown);
    }
});
document.querySelector(".btn")?.addEventListener("click", () => {
    window.location.href = "/scan";
});

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    try {
        const response = await fetch("http://localhost:5001/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            alert("✅ Registration successful! Redirecting to login...");
            window.location.href = "/login.html";
        } else {
            alert(`❌ Registration failed: ${data.message}`);
        }
    } catch (error) {
        alert("❌ Failed to register. Please try again.");
    }
});

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch("http://localhost:5001/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error(`Server responded with ${response.status}`);

        const data = await response.json();
        if (data.success) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            alert("✅ Login successful!");
            window.location.href = "/";
        } else {
            alert(`❌ Login failed: ${data.message}`);
        }
    } catch (error) {
        alert("❌ Failed to log in. Check server logs.");
    }
});

document.getElementById("logout")?.addEventListener("click", () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    alert("✅ Logged out successfully.");
    window.location.href = "/index.html";
});
async function loadPendingRequests() {
    try {
        const response = await fetch('/admin/requests', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const requests = await response.json();
        console.log("Credit Requests:", requests);
    } catch (error) {
        console.error("Error loading requests:", error);
    }
}
async function updateUserDisplay() {
    const user = JSON.parse(localStorage.getItem("user"));
    const loginLink = document.getElementById("login-link");
    const usernameSpan = document.getElementById("username");

    if (!loginLink || !usernameSpan) {
        console.warn("UI elements not found for user display.");
        return;
    }

    if (user) {
        loginLink.style.display = "none";
        usernameSpan.textContent = `Welcome, ${user.name}`;
        usernameSpan.style.display = "inline-block";
        usernameSpan.addEventListener("click", () => {
            if (confirm("Do you want to logout?")) {
                logoutUser();
            }
        });
    } else {
        loginLink.style.display = "inline-block";
        usernameSpan.style.display = "none";
    }
}

function toggleDropdown() {
    document.querySelector(".dropdown").classList.toggle("show");
}

async function fetchAdminPage() {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("No token found, redirecting to login...");
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:5001/admin", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Unauthorized Access");

        console.log("✅ Admin Page Loaded Successfully!");
    } catch (error) {
        console.error("Error loading admin page:", error);
        alert("Admin access required!");
        window.location.href = "/";
    }
}

async function fetchCreditRequests() {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("No token found, redirecting to login...");
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:5001/admin/credit-requests", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Failed to fetch credit requests: ${response.status}`);

        const requests = await response.json();
        console.log("✅ Credit Requests:", requests);

        // ✅ Update UI
        const requestList = document.getElementById("requests-list");
        if (!requestList) {
            console.warn("⚠️ requests-list element not found.");
            return;
        }
        requestList.innerHTML = requests.map(r => 
            `<div>User ID: ${r.user_id} requested ${r.amount} credits - Status: ${r.status}</div>`
        ).join("");

    } catch (error) {
        console.error("Error fetching credit requests:", error);
    }
}

async function loadProfile() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch("/api/profile", { headers: { "Authorization": `Bearer ${token}` } });
        if (!response.ok) throw new Error("Failed to load profile");

        const data = await response.json();
        document.getElementById("profileName").textContent = data.name;
        document.getElementById("profileEmail").textContent = data.email;
        document.getElementById("profileCredits").textContent = data.credits;

        localStorage.setItem("user", JSON.stringify(data));
    } catch (error) {
        alert("Profile load error.");
        window.location.href = "/login.html";
    }
}
async function fetchUsers() {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("No token found, redirecting to login...");
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:5001/admin/users", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);

        const users = await response.json();
        console.log("✅ Users:", users);

        // ✅ Update UI
        const usersList = document.getElementById("users-list");
        if (!usersList) {
            console.warn("⚠️ users-list element not found.");
            return;
        }
        usersList.innerHTML = users.map(u => 
            `<div>${u.name} - ${u.email} (Credits: ${u.credits})</div>`
        ).join("");

    } catch (error) {
        console.error("Error fetching users:", error);
    }
}


if (window.location.pathname === "/profile") {
    loadProfile();
    setInterval(loadProfile, 30000);
}
window.addEventListener("click", (event) => {
    if (!event.target.matches("#username")) {
        document.querySelector(".dropdown").classList.remove("show");
    }
});