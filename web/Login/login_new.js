// ==========================================
// LOGIN RÁPIDO CON PIN (SIN USERNAME)
// ==========================================
let currentPin = "";
const pinDots = document.querySelectorAll(".pin-dot");
const keyButtons = document.querySelectorAll(".key-btn");
const pinErrorMessage = document.getElementById("pin-mensaje");

// Actualizar visualización de los puntos del PIN
function updatePinDisplay() {
    pinDots.forEach((dot, index) => {
        if (index < currentPin.length) {
            dot.classList.add("filled");
        } else {
            dot.classList.remove("filled");
        }
    });
}

// Manejar clics en el teclado
keyButtons.forEach(button => {
    button.addEventListener("click", async (e) => {
        e.preventDefault();
        
        const num = button.getAttribute("data-num");
        const action = button.getAttribute("data-action");
        
        if (num !== null && currentPin.length < 4) {
            // Agregar número
            currentPin += num;
            updatePinDisplay();
            
            // Vibración táctil
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
            
            // Si completó los 4 dígitos, intentar login automáticamente
            if (currentPin.length === 4) {
                setTimeout(async () => {
                    await performPinLogin(currentPin);
                }, 150);
            }
        } else if (action === "delete" && currentPin.length > 0) {
            // Borrar último dígito
            currentPin = currentPin.slice(0, -1);
            updatePinDisplay();
            pinErrorMessage.textContent = "";
        }
    });
});

// 🔥 NUEVO: Función de login SOLO CON PIN (sin username)
async function performPinLogin(pin) {
    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin })  // 🔥 Solo enviar PIN
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const loggedUserData = {
                username: data.username,
                role: data.role,
                empleado_id: data.empleado_id,
                tipo: data.tipo
            };
            
            localStorage.setItem("loggedUser", JSON.stringify(loggedUserData));
            window.location.href = "/actividades";
        } else {
            // Error: mostrar mensaje y limpiar
            pinErrorMessage.textContent = data.detail || "PIN incorrecto";
            pinErrorMessage.style.color = "#ff3b30";
            
            // Efecto de error en los puntos
            pinDots.forEach(dot => {
                dot.classList.add("error");
                dot.classList.remove("filled");
            });
            
            setTimeout(() => {
                pinDots.forEach(dot => dot.classList.remove("error"));
            }, 400);
            
            currentPin = "";
            updatePinDisplay();
        }
    } catch (error) {
        console.error("Error en login:", error);
        pinErrorMessage.textContent = "Error de conexión";
        pinErrorMessage.style.color = "#ff3b30";
        
        currentPin = "";
        updatePinDisplay();
    }
}

// ==========================================
// FORMULARIO LOGIN TRADICIONAL
// ==========================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const mensajeElement = document.getElementById("mensaje");

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const loggedUserData = {
                    username: data.username,
                    role: data.role,
                    empleado_id: data.empleado_id,
                    tipo: data.tipo
                };
                
                localStorage.setItem("loggedUser", JSON.stringify(loggedUserData));
                // 🔥 NUEVO: Forzar recarga completa sin caché
                window.location.replace("/actividades");
                window.location.reload(true);
            } else {
                mensajeElement.style.color = "#ef4444";
                
                if (data.detail && data.detail.includes("password")) {
                    mensajeElement.textContent = "Contraseña incorrecta";
                } else if (data.detail && data.detail.includes("username")) {
                    mensajeElement.textContent = "Usuario no encontrado";
                } else {
                    mensajeElement.textContent = data.detail || data.message || "Error en el login";
                }
            }
        } catch (error) {
            console.error("Error en login:", error);
            mensajeElement.style.color = "#ef4444";
            mensajeElement.textContent = "Error de conexión. Intenta nuevamente.";
        }
    });
}
