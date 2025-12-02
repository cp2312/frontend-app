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
        const response = await fetch(`${API}/api/semanas/activa/actual`);
        
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
        throw error;
    }
    return null;
}

// Función para verificar y actualizar semana activa
async function verificarYActualizarSemanaActiva() {
    try {
        const semanaActiva = await obtenerSemanaActivaServidor();
        
        if (semanaActiva) {
            semanaActual = semanaActiva;
            localStorage.setItem('semanaActual', JSON.stringify(semanaActual));
            actualizarInterfazSemana();
            desbloquearModulos();
            return true;
        } else {
            semanaActual = {
                id: null,
                fecha: null,
                nombre: null,
                mes: null,
                activa: false
            };
            localStorage.removeItem('semanaActual');
            actualizarInterfazSemana();
            bloquearModulos();
            return false;
        }
    } catch (error) {
        console.error('Error al verificar semana activa:', error);
        return false;
    }
}

// Función para guardar semana
async function guardarSemana() {
    const fechaInput = document.getElementById("fechaSemana");
    const nombreInput = document.getElementById("nombreSemana");
    const mensaje = document.getElementById("mensaje");

    const fecha = fechaInput ? fechaInput.value : null;
    const nombre = nombreInput ? nombreInput.value : null;

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

    const fechaObj = new Date(fecha);
    const mes = meses[fechaObj.getMonth()];

    try {
        // Mostrar indicador de carga en el botón
        const btnGuardar = document.querySelector('.btn-guardar');
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btnGuardar.disabled = true;
        }

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
            if (nombreInput) {
                nombreInput.value = "";
            }
            
            // Deshabilitar campo de fecha
            if (fechaInput) {
                fechaInput.disabled = true;
                fechaInput.style.backgroundColor = '#f0f0f0';
                fechaInput.style.cursor = 'not-allowed';
            }
            
            // Ocultar mensaje después de 3 segundos
            setTimeout(() => {
                mensaje.textContent = "";
                mensaje.className = "mensaje";
            }, 3000);
        } else {
            // Manejar errores del servidor
            mensaje.textContent = `Error: ${data.message || "No se pudo guardar la semana"}`;
            mensaje.className = "mensaje error";
            
            // IMPORTANTE: Verificar si ya hay una semana activa a pesar del error
            setTimeout(async () => {
                await verificarYActualizarSemanaActiva();
            }, 500);
        }

    } catch (error) {
        console.error("Error al guardar:", error);
        mensaje.textContent = "❌ Error de conexión. Verifica tu internet e intenta nuevamente.";
        mensaje.className = "mensaje error";
        
        // En caso de error de conexión, también verificar semana activa
        setTimeout(async () => {
            await verificarYActualizarSemanaActiva();
        }, 500);
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
    
    if (semanaActual.activa && semanaActual.fecha) {
        // Formatear fecha para mostrar
        const fechaObj = new Date(semanaActual.fecha);
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        if (fechaDisplay) {
            fechaDisplay.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        }
        if (nombreDisplay) {
            nombreDisplay.textContent = semanaActual.nombre || '-';
        }
        if (mesDisplay) {
            mesDisplay.textContent = semanaActual.mes || '-';
        }
        
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
        if (fechaDisplay) {
            fechaDisplay.textContent = 'No hay semana activa';
        }
        if (nombreDisplay) {
            nombreDisplay.textContent = '-';
        }
        if (mesDisplay) {
            mesDisplay.textContent = '-';
        }
        
        if (idDisplay) {
            idDisplay.textContent = '-';
        }
        
        // Habilitar el campo de fecha
        if (fechaInput) {
            fechaInput.disabled = false;
            fechaInput.style.backgroundColor = '#f9f9f9';
            fechaInput.style.cursor = 'pointer';
            
            // Establecer fecha mínima como hoy
            const hoy = new Date();
            const fechaFormateada = hoy.toISOString().split('T')[0];
            
            if (!fechaInput.value) {
                fechaInput.value = fechaFormateada;
            }
            fechaInput.min = fechaFormateada;
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
        if (mensaje) {
            mensaje.textContent = "⚠️ Primero debes registrar una semana para acceder a los módulos";
            mensaje.className = "mensaje error";
            
            setTimeout(() => {
                mensaje.textContent = "";
                mensaje.className = "mensaje";
            }, 3000);
        }
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
        if (mensaje) {
            mensaje.textContent = "⚠️ No hay semana activa para reiniciar";
            mensaje.className = "mensaje error";
            
            setTimeout(() => {
                mensaje.textContent = "";
                mensaje.className = "mensaje";
            }, 3000);
        }
        return;
    }
    
    if (confirm("¿Estás seguro de que quieres reiniciar la semana actual? Esto bloqueará todos los módulos.")) {
        try {
            // Mostrar indicador de carga
            const mensaje = document.getElementById("mensaje");
            if (mensaje) {
                mensaje.textContent = "Reiniciando semana...";
                mensaje.className = "mensaje";
            }
            
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
                if (mensaje) {
                    mensaje.textContent = "✅ Semana reiniciada. Puedes registrar una nueva semana";
                    mensaje.className = "mensaje exito";
                    
                    setTimeout(() => {
                        mensaje.textContent = "";
                        mensaje.className = "mensaje";
                    }, 3000);
                }
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
function mostrarError(mensajeTexto) {
    const mensaje = document.getElementById("mensaje");
    if (mensaje) {
        mensaje.textContent = `❌ ${mensajeTexto}`;
        mensaje.className = "mensaje error";
        
        setTimeout(() => {
            mensaje.textContent = "";
            mensaje.className = "mensaje";
        }, 3000);
    }
}

// Función para inicializar la aplicación
async function inicializarApp() {
    console.log('Inicializando aplicación...');
    
    // Limpiar mensaje inicial
    const mensaje = document.getElementById("mensaje");
    if (mensaje) {
        mensaje.textContent = "";
        mensaje.className = "mensaje";
    }
    
    // Verificar si hay una semana activa
    const haySemanaActiva = await verificarYActualizarSemanaActiva();
    
    if (!haySemanaActiva) {
        console.log('No hay semana activa, configurando fecha actual...');
        const hoy = new Date();
        const fechaFormateada = hoy.toISOString().split('T')[0];
        const fechaInput = document.getElementById('fechaSemana');
        
        if (fechaInput && !fechaInput.value) {
            fechaInput.value = fechaFormateada;
            fechaInput.min = fechaFormateada;
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
    
    // Añadir evento al botón de guardar semana
    const btnGuardar = document.querySelector('.btn-guardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarSemana);
    }
    
    // Añadir evento al botón de reiniciar semana (si existe)
    const btnReiniciar = document.querySelector('.btn-reiniciar');
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', reiniciarSemana);
    }
    
    console.log('Aplicación inicializada correctamente');
    console.log('Estado semana actual:', semanaActual);
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Pequeño retraso para asegurar que todo el DOM esté listo
    setTimeout(() => {
        inicializarApp();
    }, 100);
});

// Hacer funciones disponibles globalmente
window.guardarSemana = guardarSemana;
window.reiniciarSemana = reiniciarSemana;
window.irAModulo = irAModulo;