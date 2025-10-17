function togglePassword() {
  const pass = document.getElementById("password");
  pass.type = pass.type === "password" ? "text" : "password";
}

function handleLogin(event) {
  event.preventDefault(); // Prevent form reload

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Dummy check (you can later connect to backend)
  if (email && password) {
    // Redirect to profile page
    window.location.href = "employee-home.html";
  } else {
    alert("Invalid credentials");
  }
}