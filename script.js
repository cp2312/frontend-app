const API = "https://backend-express-production-a427.up.railway.app";

async function api(path, opts={}) {
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error('API error 2311: ' + res.status);
  return res.json();
}

// Semanas
async function cargarSemanas() {
  const semanas = await api("/api/semanas");
  const sel = document.getElementById("selectSemana");
  sel.innerHTML = semanas.map(s => `<option value="${s.id}">${s.nombre_semana} | ${s.fecha}</option>`).join("");
  if (semanas.length) {
    sel.value = semanas[0].id;
  }
  await cargarProductos();
  await cargarOtros();
  await cargarResumen();
}

document.getElementById("formSemana").addEventListener("submit", async e => {
  e.preventDefault();
  const fecha = document.getElementById("fecha").value;
  const nombre_semana = document.getElementById("nombre_semana").value;
  const mes = document.getElementById("mes").value;
  await api("/api/semanas", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({fecha,nombre_semana,mes})
  });
  document.getElementById("formSemana").reset();
  await cargarSemanas();
});

document.getElementById("selectSemana").addEventListener("change", async ()=> {
  await cargarProductos();
  await cargarOtros();
  await cargarResumen();
});

// Productos
document.getElementById("formProducto").addEventListener("submit", async e => {
  e.preventDefault();
  const nombre = document.getElementById("p_nombre").value;
  const precio_unitario = Number(document.getElementById("p_precio").value);
  const libras = Number(document.getElementById("p_libras").value);
  const gasto = Number(document.getElementById("p_gasto").value);
  const semana_id = Number(document.getElementById("selectSemana").value);
  await api("/api/productos", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ nombre, precio_unitario, libras, gasto, semana_id })
  });
  document.getElementById("formProducto").reset();
  await cargarProductos();
  await cargarResumen();
});

async function cargarProductos() {
  const semana_id = document.getElementById("selectSemana").value;
  if (!semana_id) return;
  const prods = await api(`/api/productos/semana/${semana_id}`);
  const ul = document.getElementById("listaProductos");
  ul.innerHTML = prods.map(p => `<li>${p.nombre} — ${p.libras} lb × ${p.precio_unitario} = ${p.total}  - gasto: ${p.gasto} - final: ${p.total_final}</li>`).join("");
}

// Otros gastos
document.getElementById("formOtro").addEventListener("submit", async e => {
  e.preventDefault();
  const fecha = document.getElementById("o_fecha").value;
  const concepto = document.getElementById("o_concepto").value;
  const monto = Number(document.getElementById("o_monto").value);
  const semana_id = Number(document.getElementById("selectSemana").value);
  await api("/api/otros", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ fecha, concepto, monto, semana_id })
  });
  document.getElementById("formOtro").reset();
  await cargarOtros();
  await cargarResumen();
});

async function cargarOtros() {
  const semana_id = document.getElementById("selectSemana").value;
  if (!semana_id) return;
  const otros = await api(`/api/otros/semana/${semana_id}`);
  const ul = document.getElementById("listaOtros");
  ul.innerHTML = otros.map(o => `<li>${o.fecha} — ${o.concepto} — ${o.monto}</li>`).join("");
}

// Resumen
async function cargarResumen() {
  const semana_id = document.getElementById("selectSemana").value;
  if (!semana_id) return;
  const sum = await api(`/api/semana/${semana_id}/summary`);
  const div = document.getElementById("resumen");
  div.innerHTML = `
    <p><strong>Productos total:</strong> ${sum.productos_total}</p>
    <p><strong>Préstamos (gastos):</strong> ${sum.prestamos_total}</p>
    <p><strong>Pagos:</strong> ${sum.pagos_total}</p>
    <p><strong>Otros gastos:</strong> ${sum.otros_total}</p>
    <p><strong>Total gastos:</strong> ${sum.total_gastos}</p>
    <p><strong>Ventas (cierres):</strong> ${sum.ventas_total}</p>
    <p><strong>Neto (productos - gastos):</strong> ${sum.neto}</p>
  `;
}

// init
cargarSemanas();