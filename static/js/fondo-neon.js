document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector(".neon-scene")) {
        return;
    }

    const escena = document.createElement("div");
    escena.className = "neon-scene";
    escena.setAttribute("aria-hidden", "true");

    const colores = [
        "#00f5d4",
        "#b026ff",
        "#ff2bd6",
        "#8aff00",
        "#00c8ff",
        "#ff9f1c",
    ];

    const anillos = [
        {
            tamano: 370,
            top: "-80px",
            left: "-90px",
            color: "#b026ff",
            duracion: "22s",
        },
        {
            tamano: 250,
            top: "22%",
            right: "-80px",
            color: "#00f5d4",
            duracion: "17s",
        },
        {
            tamano: 450,
            bottom: "-240px",
            left: "28%",
            color: "#ff2bd6",
            duracion: "28s",
        },
    ];

    anillos.forEach((configuracion, indice) => {
        const anillo = document.createElement("div");
        anillo.className = "neon-ring";

        anillo.style.width = `${configuracion.tamano}px`;
        anillo.style.height = `${configuracion.tamano}px`;
        anillo.style.top = configuracion.top ?? "auto";
        anillo.style.right = configuracion.right ?? "auto";
        anillo.style.bottom = configuracion.bottom ?? "auto";
        anillo.style.left = configuracion.left ?? "auto";
        anillo.style.setProperty(
            "--color",
            configuracion.color
        );
        anillo.style.setProperty(
            "--duracion",
            configuracion.duracion
        );
        anillo.style.animationDelay = `${indice * -4}s`;

        escena.appendChild(anillo);
    });

    for (let indice = 0; indice < 6; indice += 1) {
        const orbe = document.createElement("div");
        const tamano = 90 + Math.random() * 140;
        const color =
            colores[indice % colores.length];

        orbe.className = "neon-orb";
        orbe.style.width = `${tamano}px`;
        orbe.style.height = `${tamano}px`;
        orbe.style.left = `${Math.random() * 92}%`;
        orbe.style.top = `${Math.random() * 92}%`;
        orbe.style.background = `
            radial-gradient(
                circle,
                ${color}88,
                ${color}22 48%,
                transparent 72%
            )
        `;
        orbe.style.boxShadow = `
            0 0 30px ${color}55,
            0 0 80px ${color}25
        `;
        orbe.style.setProperty(
            "--duracion",
            `${12 + Math.random() * 10}s`
        );
        orbe.style.animationDelay =
            `${Math.random() * -12}s`;

        escena.appendChild(orbe);
    }

    for (let indice = 0; indice < 42; indice += 1) {
        const particula = document.createElement("span");
        const color =
            colores[
                Math.floor(Math.random() * colores.length)
            ];

        particula.className = "neon-particle";
        particula.style.left = `${Math.random() * 100}%`;
        particula.style.top = `${Math.random() * 100}%`;
        particula.style.setProperty(
            "--tamano",
            `${2 + Math.random() * 4}px`
        );
        particula.style.setProperty(
            "--color",
            color
        );
        particula.style.setProperty(
            "--duracion",
            `${6 + Math.random() * 10}s`
        );
        particula.style.animationDelay =
            `${Math.random() * -10}s`;

        escena.appendChild(particula);
    }

    document.body.prepend(escena);

    const permiteCursor =
        window.matchMedia(
            "(pointer: fine)"
        ).matches;

    if (!permiteCursor) {
        return;
    }

    const brilloCursor = document.createElement("div");
    brilloCursor.className = "cursor-glow";
    brilloCursor.setAttribute("aria-hidden", "true");

    document.body.appendChild(brilloCursor);

    document.addEventListener("pointermove", (evento) => {
        brilloCursor.style.left = `${evento.clientX}px`;
        brilloCursor.style.top = `${evento.clientY}px`;
    });
});