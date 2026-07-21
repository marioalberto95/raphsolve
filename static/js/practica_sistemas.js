document.addEventListener("DOMContentLoaded", () => {
    const opcionUnaVariable =
        document.getElementById(
            "practica-una-variable"
        );

    const opcionSistema =
        document.getElementById(
            "practica-sistema"
        );

    const panelUnaVariable =
        document.getElementById(
            "panel-practica-una-variable"
        );

    const panelSistema =
        document.getElementById(
            "panel-practica-sistema"
        );

    const elementoDatos =
        document.getElementById(
            "datos-practica-sistemas"
        );

    const nivel =
        document.getElementById(
            "nivel-practica-sistema"
        );

    const titulo =
        document.getElementById(
            "titulo-practica-sistema"
        );

    const descripcion =
        document.getElementById(
            "descripcion-practica-sistema"
        );

    const funciones =
        document.getElementById(
            "funciones-practica-sistema"
        );

    const inicial =
        document.getElementById(
            "inicial-practica-sistema"
        );

    const tolerancia =
        document.getElementById(
            "tolerancia-practica-sistema"
        );

    const camposRespuesta =
        document.getElementById(
            "campos-respuesta-sistema"
        );

    const botonRevisar =
        document.getElementById(
            "revisar-respuesta-sistema"
        );

    const botonNuevo =
        document.getElementById(
            "nuevo-sistema-practica"
        );

    const mensaje =
        document.getElementById(
            "mensaje-practica-sistema"
        );

    if (
        !opcionUnaVariable ||
        !opcionSistema ||
        !panelUnaVariable ||
        !panelSistema ||
        !elementoDatos ||
        !nivel ||
        !titulo ||
        !descripcion ||
        !funciones ||
        !inicial ||
        !tolerancia ||
        !camposRespuesta ||
        !botonRevisar ||
        !botonNuevo ||
        !mensaje
    ) {
        return;
    }

    let sistemas;

    try {
        sistemas = JSON.parse(
            elementoDatos.textContent
        );
    } catch (error) {
        sistemas = [];
    }

    if (
        !Array.isArray(sistemas) ||
        sistemas.length === 0
    ) {
        panelSistema.innerHTML = `
            <div class="alert alert-warning">
                No hay sistemas disponibles para practicar.
            </div>
        `;

        opcionSistema.disabled = true;
        return;
    }

    let indiceActual = 0;

    function formatearNumero(
        valor,
        decimales = 8
    ) {
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "—";
        }

        if (Number.isInteger(numero)) {
            return String(numero);
        }

        return numero
            .toFixed(decimales)
            .replace(/0+$/, "")
            .replace(/\.$/, "");
    }

    function actualizarModo() {
        const modoSistema =
            opcionSistema.checked;

        panelUnaVariable.classList.toggle(
            "d-none",
            modoSistema
        );

        panelSistema.classList.toggle(
            "d-none",
            !modoSistema
        );

        if (
            modoSistema &&
            window.MathJax?.typesetPromise
        ) {
            window.MathJax
                .typesetPromise([panelSistema])
                .catch(() => {});
        }
    }

    function crearCampos(
        sistema
    ) {
        camposRespuesta.innerHTML = "";

        sistema.variables.forEach(
            variable => {
                const grupo =
                    document.createElement(
                        "div"
                    );

                grupo.className =
                    "campo-respuesta-practica";

                const etiqueta =
                    document.createElement(
                        "label"
                    );

                etiqueta.className =
                    "form-label";

                etiqueta.htmlFor =
                    `respuesta-sistema-${variable}`;

                etiqueta.textContent =
                    `${variable} ≈`;

                const input =
                    document.createElement(
                        "input"
                    );

                input.id =
                    `respuesta-sistema-${variable}`;

                input.type = "number";
                input.step = "any";
                input.className =
                    "form-control respuesta-variable-sistema";

                input.dataset.variable =
                    variable;

                input.placeholder =
                    "Valor aproximado";

                input.autocomplete = "off";

                grupo.append(
                    etiqueta,
                    input
                );

                camposRespuesta.appendChild(
                    grupo
                );
            }
        );
    }

    function claseNivel(
        textoNivel
    ) {
        const normalizado =
            String(textoNivel)
                .toLowerCase();

        return `nivel-${normalizado}`;
    }

    function mostrarSistema() {
        const sistema =
            sistemas[indiceActual];

        nivel.className =
            `nivel-ejercicio ${claseNivel(
                sistema.nivel
            )}`;

        nivel.textContent =
            sistema.nivel;

        titulo.textContent =
            sistema.titulo;

        descripcion.textContent =
            sistema.descripcion;

        funciones.innerHTML = `
            \\[
                ${sistema.funciones_latex}
            \\]
        `;

        inicial.innerHTML = `
            \\(
                X_0
                =
                (${sistema.inicial
                    .map(valor =>
                        formatearNumero(
                            valor,
                            6
                        )
                    )
                    .join(", ")})
            \\)
        `;

        tolerancia.textContent =
            formatearNumero(
                sistema.tolerancia,
                8
            );

        crearCampos(sistema);

        mensaje.innerHTML = "";

        if (
            window.MathJax?.typesetPromise
        ) {
            window.MathJax
                .typesetPromise([
                    funciones,
                    inicial,
                ])
                .catch(() => {});
        }
    }

    function revisarSistema() {
        const sistema =
            sistemas[indiceActual];

        const campos = [
            ...camposRespuesta
                .querySelectorAll(
                    ".respuesta-variable-sistema"
                ),
        ];

        const respuestas = campos.map(
            campo => Number(campo.value)
        );

        const faltanValores =
            campos.some(
                campo =>
                    campo.value.trim() === ""
            );

        if (faltanValores) {
            mensaje.innerHTML = `
                <div class="alert alert-warning">
                    Escribe una respuesta para cada variable.
                </div>
            `;

            return;
        }

        if (
            respuestas.some(
                respuesta =>
                    !Number.isFinite(respuesta)
            )
        ) {
            mensaje.innerHTML = `
                <div class="alert alert-danger">
                    Las respuestas deben ser numéricas.
                </div>
            `;

            return;
        }

        const margen = Math.max(
            Number(sistema.tolerancia) * 10,
            0.001
        );

        const errores =
            respuestas.map(
                (respuesta, indice) =>
                    Math.abs(
                        respuesta -
                        sistema.solucion[indice]
                    )
            );

        const correcta =
            errores.every(
                error => error <= margen
            );

        if (correcta) {
            mensaje.innerHTML = `
                <div
                    class="alert alert-success
                           respuesta-correcta"
                >
                    <strong>
                        ¡Respuesta correcta!
                    </strong>

                    <p class="mb-0 mt-2">
                        Todas las variables están dentro
                        del margen permitido.
                    </p>
                </div>
            `;

            return;
        }

        const detalle = sistema.variables
            .map(
                (variable, indice) => `
                    <li>
                        ${variable}:
                        error =
                        ${formatearNumero(
                            errores[indice],
                            8
                        )}
                    </li>
                `
            )
            .join("");

        mensaje.innerHTML = `
            <div class="alert alert-danger">
                <strong>
                    La respuesta todavía no es correcta.
                </strong>

                <ul class="mb-0 mt-2">
                    ${detalle}
                </ul>
            </div>
        `;
    }

    function siguienteSistema() {
        if (sistemas.length === 1) {
            mostrarSistema();
            return;
        }

        let nuevoIndice =
            indiceActual;

        while (
            nuevoIndice === indiceActual
        ) {
            nuevoIndice =
                Math.floor(
                    Math.random() *
                    sistemas.length
                );
        }

        indiceActual =
            nuevoIndice;

        mostrarSistema();
    }

    opcionUnaVariable.addEventListener(
        "change",
        actualizarModo
    );

    opcionSistema.addEventListener(
        "change",
        actualizarModo
    );

    botonRevisar.addEventListener(
        "click",
        revisarSistema
    );

    botonNuevo.addEventListener(
        "click",
        siguienteSistema
    );

    camposRespuesta.addEventListener(
        "keydown",
        evento => {
            if (evento.key === "Enter") {
                revisarSistema();
            }
        }
    );

    mostrarSistema();
    actualizarModo();
});