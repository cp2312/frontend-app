const API = "https://backend-express-production-a427.up.railway.app";

async function api(path, opts={}) {
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

// Variables globales para almacenar la semana actual
let semanaActual = {
    id: null,
    fecha: null,
    nombre: null,
    mes: null,
    activa: false
};

// Función para obtener la semana activa del servidor
async function obtenerSemanaActivaServidor() {
    try {
        const response = await fetch(`${API}/api/semanas/activa`);
        
        if (response.ok) {
            const semana = await response.json();
            return {
                id: semana.id,
                fecha: semana.fecha,
                nombre: semana.nombre_semana,
                mes: semana.mes,
                activa: true
            };
        } else if (response.status === 404) {
            // No hay semana activa
            return null;
        }
    } catch (error) {
        console.error('Error al obtener semana activa:', error);
    }
    return null;
}

// Función para guardar semana
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

        const res = await fetch(`${API}/api/semanas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, nombre_semana: nombre, mes })
        });

        const data = await res.json();

        if (res.ok) {
            mensaje.textContent = "✅ Semana guardada correctamente";
            mensaje.className = "mensaje exito";
            
            // Actualizar semana actual CON EL ID DEL BACKEND
            semanaActual = {
                id: data.id,
                fecha: data.fecha || fecha,
                nombre: data.nombre_semana || nombre,
                mes: data.mes || mes,
                activa: true
            };
            
            // Guardar en localStorage
            localStorage.setItem('semanaActual', JSON.stringify(semanaActual));
            
            // Actualizar interfaz
            actualizarInterfazSemana();
            
            // Desbloquear módulos
            desbloquearModulos();
            
            // Limpiar campo de nombre
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

// Función para actualizar la interfaz con la semana actual
function actualizarInterfazSemana() {
    const fechaDisplay = document.getElementById('fechaActualDisplay');
    const nombreDisplay = document.getElementById('nombreActualDisplay');
    const mesDisplay = document.getElementById('mesActualDisplay');
    const fechaInput = document.getElementById('fechaSemana');
    const idDisplay = document.getElementById('idSemanaInfo');
    
    if (semanaActual.activa) {
        // Formatear fecha para mostrar
        const fechaObj = new Date(semanaActual.fecha);
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        fechaDisplay.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        nombreDisplay.textContent = semanaActual.nombre;
        mesDisplay.textContent = semanaActual.mes;
        
        // Mostrar ID si existe
        if (idDisplay) {
            idDisplay.textContent = semanaActual.id || 'N/A';
        }
        
        // Deshabilitar el campo de fecha
        if (fechaInput) {
            fechaInput.value = semanaActual.fecha;
            fechaInput.disabled = true;
            fechaInput.style.backgroundColor = '#f0f0f0';
            fechaInput.style.cursor = 'not-allowed';
        }
    } else {
        fechaDisplay.textContent = 'No hay semana activa';
        nombreDisplay.textContent = '-';
        mesDisplay.textContent = '-';
        
        if (idDisplay) {
            idDisplay.textContent = '-';
        }
        
        // Habilitar el campo de fecha
        if (fechaInput) {
            fechaInput.disabled = false;
            fechaInput.style.backgroundColor = '#f9f9f9';
            fechaInput.style.cursor = 'pointer';
        }
    }
}

// Función para desbloquear módulos
function desbloquearModulos() {
    const cards = document.querySelectorAll('.card');
    const infoModulos = document.querySelector('.info-modulos');
    
    cards.forEach(card => {
        card.classList.remove('bloqueado');
        card.classList.add('desbloqueado');
    });
    
    if (infoModulos) {
        infoModulos.innerHTML = '<i class="fas fa-check-circle"></i> Módulos desbloqueados. ¡Puedes comenzar a trabajar!';
        infoModulos.style.backgroundColor = '#d4edda';
        infoModulos.style.borderColor = '#c3e6cb';
        infoModulos.style.color = '#155724';
    }
}

// Función para bloquear módulos
function bloquearModulos() {
    const cards = document.querySelectorAll('.card');
    const infoModulos = document.querySelector('.info-modulos');
    
    cards.forEach(card => {
        card.classList.add('bloqueado');
        card.classList.remove('desbloqueado');
    });
    
    if (infoModulos) {
        infoModulos.innerHTML = '<i class="fas fa-exclamation-circle"></i> Los módulos estarán disponibles después de registrar una semana';
        infoModulos.style.backgroundColor = '#fff3cd';
        infoModulos.style.borderColor = '#ffeaa7';
        infoModulos.style.color = '#856404';
    }
}

// Función para ir a un módulo (con verificación)
function irAModulo(url) {
    if (!semanaActual.activa) {
        const mensaje = document.getElementById("mensaje");
        mensaje.textContent = "⚠️ Primero debes registrar una semana para acceder a los módulos";
        mensaje.className = "mensaje error";
        return;
    }
    
    // Pasar TODA la información de la semana actual incluyendo el ID
    const semanaParam = encodeURIComponent(JSON.stringify({
        id: semanaActual.id,
        fecha: semanaActual.fecha,
        nombre: semanaActual.nombre,
        mes: semanaActual.mes,
        activa: semanaActual.activa
    }));
    window.location.href = `${url}?semana=${semanaParam}`;
}

// Función para reiniciar la semana
async function reiniciarSemana() {
    if (!semanaActual.activa) {
        const mensaje = document.getElementById("mensaje");
        mensaje.textContent = "⚠️ No hay semana activa para reiniciar";
        mensaje.className = "mensaje error";
        return;
    }
    
    if (confirm("¿Estás seguro de que quieres reiniciar la semana actual? Esto bloqueará todos los módulos.")) {
        try {
            // Llamar al endpoint del backend para reiniciar
            const response = await fetch(`${API}/api/semanas/reiniciar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            
            if (response.ok) {
                // Limpiar semana actual
                semanaActual = {
                    id: null,
                    fecha: null,
                    nombre: null,
                    mes: null,
                    activa: false
                };
                
                // Eliminar del localStorage
                localStorage.removeItem('semanaActual');
                
                // Actualizar interfaz
                actualizarInterfazSemana();
                
                // Bloquear módulos
                bloquearModulos();
                
                // Mostrar mensaje de confirmación
                const mensaje = document.getElementById("mensaje");
                mensaje.textContent = "✅ Semana reiniciada. Puedes registrar una nueva semana";
                mensaje.className = "mensaje exito";
                
                setTimeout(() => {
                    mensaje.textContent = "";
                    mensaje.className = "mensaje";
                }, 3000);
            } else {
                const error = await response.json();
                mostrarError(`Error al reiniciar: ${error.message || 'Error del servidor'}`);
            }
        } catch (error) {
            console.error('Error al reiniciar semana:', error);
            mostrarError('Error de conexión al reiniciar la semana');
        }
    }
}

// Función para mostrar error
function mostrarError(mensaje) {
    const mensajeElem = document.getElementById("mensaje");
    if (mensajeElem) {
        mensajeElem.textContent = `❌ ${mensaje}`;
        mensajeElem.className = "mensaje error";
        
        setTimeout(() => {
            mensajeElem.textContent = "";
            mensajeElem.className = "mensaje";
        }, 3000);
    }
}

// Función para inicializar la aplicación
async function inicializarApp() {
    console.log('Inicializando aplicación...');
    
    // Siempre obtener la semana activa del servidor primero
    try {
        const semanaActiva = await obtenerSemanaActivaServidor();
        
        if (semanaActiva) {
            console.log('Semana activa encontrada en servidor:', semanaActiva);
            
            semanaActual = semanaActiva;
            
            // Guardar en localStorage para caché local
            localStorage.setItem('semanaActual', JSON.stringify(semanaActual));
            
            actualizarInterfazSemana();
            desbloquearModulos();
        } else {
            console.log('No hay semana activa en servidor');
            semanaActual = {
                id: null,
                fecha: null,
                nombre: null,
                mes: null,
                activa: false
            };
            
            // Limpiar localStorage si no hay semana activa
            localStorage.removeItem('semanaActual');
            
            bloquearModulos();
        }
    } catch (error) {
        console.error('Error al conectar con servidor:', error);
        // Si falla la conexión, intentar usar localStorage
        const semanaGuardada = localStorage.getItem('semanaActual');
        
        if (semanaGuardada) {
            try {
                semanaActual = JSON.parse(semanaGuardada);
                if (semanaActual.activa) {
                    actualizarInterfazSemana();
                    desbloquearModulos();
                } else {
                    bloquearModulos();
                }
            } catch (parseError) {
                console.error('Error al parsear localStorage:', parseError);
                bloquearModulos();
            }
        } else {
            bloquearModulos();
        }
    }
    
    // Establecer fecha mínima como hoy si no hay semana activa
    if (!semanaActual || !semanaActual.activa) {
        const hoy = new Date();
        const fechaFormateada = hoy.toISOString().split('T')[0];
        const fechaInput = document.getElementById('fechaSemana');
        
        if (fechaInput) {
            fechaInput.value = fechaFormateada;
            fechaInput.min = fechaFormateada;
        }
    } else {
        // Si hay semana activa, establecer esa fecha
        const fechaInput = document.getElementById('fechaSemana');
        if (fechaInput && semanaActual.fecha) {
            fechaInput.value = semanaActual.fecha;
            fechaInput.disabled = true;
            fechaInput.style.backgroundColor = '#f0f0f0';
            fechaInput.style.cursor = 'not-allowed';
        }
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
    
    // Añadir interactividad a las tarjetas (solo si están desbloqueadas)
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Solo si está desbloqueada
            if (!this.classList.contains('bloqueado')) {
                // Remover clase active de todas las tarjetas
                cards.forEach(c => c.classList.remove('active'));
                // Añadir clase active a la tarjeta clickeada
                this.classList.add('active');
            }
        });
    });
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', inicializarApp);