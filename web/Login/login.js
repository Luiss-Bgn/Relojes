// ==========================================
// FORMULARIO LOGIN TRADICIONAL
// ==========================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("username").value.trim();
        const contraseña = document.getElementById("password").value;
        const mensajeElement = document.getElementById("mensaje");

        try {
            const response = await fetch("/usuarios/autenticar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, contraseña })
            });

            const data = await response.json();
            console.log("✅ Login exitoso:", data);
            console.log("🔍 Datos recibidos:", data.usuario);
            const usuario = data.usuario;
            if (response.ok && data.status === "success") {
                const loggedUserData = {
                    username: usuario.username,
                    role: usuario.rol,
                    empleado_id: usuario.id,
                    tipo: usuario.puesto,
                    nombre: usuario.nombre
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
