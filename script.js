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


async function guardarSemana() {
    const fecha = document.getElementById("fechaSemana").value;
    const nombre = document.getElementById("nombreSemana").value;
    const mensaje = document.getElementById("mensaje");

    if (!fecha || !nombre) {
        mensaje.textContent = "Faltan datos. Por favor, completa todos los campos.";
        mensaje.className = "mensaje error";
        return;
    }

    // Obtener mes
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const mes = meses[new Date(fecha).getMonth()];

    try {
        // Mostrar indicador de carga en el botón
        const btnGuardar = document.querySelector('.btn-guardar');
        const originalText = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        const res = await fetch("https://backend-express-production-a427.up.railway.app/api/semanas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, nombre_semana: nombre, mes })
        });

        const data = await res.json();

        if (res.ok) {
            mensaje.textContent = "✅ Semana guardada correctamente";
            mensaje.className = "mensaje exito";
            
            // Limpiar campos después de guardar exitosamente
            document.getElementById("nombreSemana").value = "";
            
            // Ocultar mensaje después de 3 segundos
            setTimeout(() => {
                mensaje.textContent = "";
                mensaje.className = "mensaje";
            }, 3000);
        } else {
            // Manejar errores del servidor
            mensaje.textContent = `Error: ${data.message || "No se pudo guardar la semana"}`;
            mensaje.className = "mensaje error";
        }

    } catch (error) {
        console.error("Error al guardar:", error);
        mensaje.textContent = "❌ Error de conexión. Verifica tu internet e intenta nuevamente.";
        mensaje.className = "mensaje error";
    } finally {
        // Restaurar el botón a su estado original
        const btnGuardar = document.querySelector('.btn-guardar');
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Semana';
            btnGuardar.disabled = false;
        }
    }
}

// Función para inicializar la aplicación
function inicializarApp() {
    // Establecer fecha actual por defecto
    const hoy = new Date();
    const fechaFormateada = hoy.toISOString().split('T')[0];
    const fechaInput = document.getElementById('fechaSemana');
    
    if (fechaInput) {
        fechaInput.value = fechaFormateada;
        // Establecer fecha mínima como hoy
        fechaInput.min = fechaFormateada;
    }
    
    // Añadir evento de tecla Enter en el campo de nombre
    const nombreSemanaInput = document.getElementById('nombreSemana');
    if (nombreSemanaInput) {
        nombreSemanaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                guardarSemana();
            }
        });
    }
    
    // Añadir interactividad a las tarjetas
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Remover clase active de todas las tarjetas
            cards.forEach(c => c.classList.remove('active'));
            // Añadir clase active a la tarjeta clickeada
            this.classList.add('active');
        });
    });
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializarApp);

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