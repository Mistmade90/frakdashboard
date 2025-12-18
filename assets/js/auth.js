document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    var res = FrakDashboard.login(username, password);

    if (!res || !res.ok) {
      alert("Login fehlgeschlagen. Prüfe Benutzername/Passwort.");
      return;
    }

    window.location.href = "./dashboard.html";
  });
});
