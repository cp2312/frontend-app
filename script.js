const API = "https://backend-express-production-a427.up.railway.app";

async function cargarUsuarios() {
  const res = await fetch(`${API}/users`);
  const data = await res.json();

  document.getElementById("listaUsuarios").innerHTML =
    data.map(u => `<li>${u.name}</li>`).join("");
}

async function agregarUsuario() {
  const name = document.getElementById("nameInput").value;

  await fetch(`${API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  cargarUsuarios();
}

cargarUsuarios();
