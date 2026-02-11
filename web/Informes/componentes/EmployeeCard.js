export default class EmployeeCard {

    constructor(empleado) {
        this.empleado = empleado;
    }

    render() {

        const card = document.createElement("div");
        card.className = "sidebar-item empleado-card";
        card.dataset.type = "empleado";
        card.dataset.nombre = this.empleado.nombre;
        card.dataset.id = this.empleado.id;

        const avatar = document.createElement("div");
        avatar.className = "empleado-avatar";

        if (this.empleado.imagen) {
            avatar.style.backgroundImage = "url(/web/Images/" + this.empleado.imagen + ")";
        } else {
            avatar.textContent = this.empleado.nombre.charAt(0);
        }

        const info = document.createElement("div");
        info.className = "empleado-info";

        const nombre = document.createElement("div");
        nombre.className = "empleado-nombre";
        nombre.textContent = this.empleado.nombre;

        const puesto = document.createElement("div");
        puesto.className = "empleado-puesto";
        puesto.textContent = this.empleado.puesto;

        // Agregar badge de estado (activo)
        const badge = document.createElement("div");
        badge.className = "empleado-badge";
        badge.textContent = "●";

        info.appendChild(nombre);
        info.appendChild(puesto);

        card.appendChild(avatar);
        card.appendChild(info);
        card.appendChild(badge);

        return card;
    }
}
