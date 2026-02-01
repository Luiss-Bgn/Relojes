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
                window.location.href = "/actividades";
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
