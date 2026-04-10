const API = "https://cn230-muverse.vercel.app/api"; // 🔥 เปลี่ยนเป็น domain คุณ

async function signup() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  document.getElementById("msg").innerText = data.message;
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (data.success) {
    document.getElementById("msg").innerText = "Login success!";
    console.log("USER:", data.user);

    // 👉 เก็บ session
    localStorage.setItem("user", JSON.stringify(data.user));

  } else {
    document.getElementById("msg").innerText = data.message;
  }
}