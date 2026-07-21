document.addEventListener("DOMContentLoaded", () => {
    const elementoDatos =
        document.getElementById("datos-pasos");

    const contenido =
        document.getElementById("contenido-paso");

    const contador =
        document.getElementById("contador-pasos");

    const barra =
        document.getElementById("barra-pasos");

    const botonAnterior =
        document.getElementById("paso-anterior");

    const botonSiguiente =
        document.getElementById("paso-siguiente");

    const botonReproducir =
        document.getElementById("reproducir-pasos");

    const botonReiniciar =
        document.getElementById("reiniciar-pasos");

    if (
        !elementoDatos ||
        !contenido ||
        !contador ||
        !barra ||
        !botonAnterior ||
        !botonSiguiente ||
        !botonReproducir ||
        !botonReiniciar
    ) {
        return;
    }

    function formatearNumero(
        valor,
        maxDecimales = 8
    ) {
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "—";
        }

        if (Math.abs(numero) < 1e-12) {
            return "0";
        }

        if (Number.isInteger(numero)) {
            return String(numero);
        }

        return numero
            .toFixed(maxDecimales)
            .replace(/0+$/, "")
            .replace(/\.$/, "");
    }

    let datos;

    try {
        datos = JSON.parse(
            elementoDatos.textContent
        );
    } catch (error) {
        contenido.innerHTML = `
            <div class="alert alert-danger">
                No fue posible cargar la explicación.
            </div>
        `;

        return;
    }

    const pasos = [];

    pasos.push({
        titulo: "Paso 1: Función ingresada",
        contenido: `
            <p>
                La función que se resolverá es:
            </p>

            <div class="formula-paso">
                \\[
                    f(x) = ${datos.funcion_latex}
                \\]
            </div>
        `,
    });

    pasos.push({
        titulo: "Paso 2: Calcular la derivada",
        contenido: `
            <p>
                Se calcula la derivada de la función:
            </p>

            <div class="formula-paso">
                \\[
                    f'(x) = ${datos.derivada_latex}
                \\]
            </div>
        `,
    });

    datos.iteraciones.forEach((iteracion) => {
        const numero = iteracion.numero;

        const actual = formatearNumero(
            iteracion.x_actual,
            6
        );

        const fx = formatearNumero(
            iteracion.fx,
            6
        );

        const derivada = formatearNumero(
            iteracion.derivada,
            6
        );

        const siguiente = formatearNumero(
            iteracion.x_siguiente,
            6
        );

        const error = formatearNumero(
            iteracion.error,
            8
        );

        pasos.push({
            titulo: `Iteración ${numero}`,
            contenido: `
                <p>
                    Se utiliza la fórmula de Newton-Raphson:
                </p>

                <div class="formula-paso">
                    \\[
                        x_{n+1}
                        =
                        x_n -
                        \\frac{f(x_n)}{f'(x_n)}
                    \\]
                </div>

                <p>
                    Sustituimos los valores de la iteración:
                </p>

                <div class="formula-paso">
                    \\[
                        x_{${numero}}
                        =
                        ${actual}
                        -
                        \\frac{${fx}}{${derivada}}
                    \\]
                </div>

                <div class="resultado-iteracion">
                    <p>
                        <strong>Nueva aproximación:</strong>
                        ${siguiente}
                    </p>

                    <p>
                        <strong>Error aproximado:</strong>
                        ${error}
                    </p>

                    <small class="text-secondary">
                        Es la diferencia absoluta entre la nueva
                        aproximación y la anterior.
                    </small>
                </div>
            `,
        });
    });

    pasos.push({
        titulo: "Resultado final",
        contenido: datos.convergio
            ? `
                <p>
                    El método alcanzó la tolerancia indicada.
                </p>

                <div class="resultado-final-paso">
                    Raíz aproximada:
                    <strong>
                        ${formatearNumero(
                            datos.raiz,
                            8
                        )}
                    </strong>
                </div>
            `
            : `
                <p>
                    El método no logró alcanzar la tolerancia.
                </p>

                <div class="alert alert-warning">
                    No se encontró una raíz real con el valor
                    inicial proporcionado.
                </div>

                <p>
                    <strong>Última aproximación:</strong>
                    ${formatearNumero(
                        datos.ultima_aproximacion,
                        8
                    )}
                </p>
            `,
    });

    let pasoActual = 0;
    let temporizador = null;

    function renderizarPaso() {
        const paso = pasos[pasoActual];

        contenido.classList.remove(
            "animar-contenido"
        );

        void contenido.offsetWidth;

        contenido.innerHTML = `
            <h3 class="h5 mb-3">
                ${paso.titulo}
            </h3>

            ${paso.contenido}
        `;

        contenido.classList.add(
            "animar-contenido"
        );

        contador.textContent =
            `Paso ${pasoActual + 1} de ${pasos.length}`;

        const porcentaje =
            ((pasoActual + 1) / pasos.length) * 100;

        barra.style.width =
            `${porcentaje}%`;

        botonAnterior.disabled =
            pasoActual === 0;

        botonSiguiente.disabled =
            pasoActual === pasos.length - 1;

        if (
            window.MathJax &&
            window.MathJax.typesetPromise
        ) {
            window.MathJax.typesetPromise(
                [contenido]
            );
        }
    }

    function detenerReproduccion() {
        if (temporizador !== null) {
            clearInterval(temporizador);
            temporizador = null;
        }

        botonReproducir.textContent =
            "Reproducir";

        botonReproducir.disabled = false;
    }

    botonAnterior.addEventListener(
        "click",
        () => {
            detenerReproduccion();

            if (pasoActual > 0) {
                pasoActual -= 1;
                renderizarPaso();
            }
        }
    );

    botonSiguiente.addEventListener(
        "click",
        () => {
            detenerReproduccion();

            if (pasoActual < pasos.length - 1) {
                pasoActual += 1;
                renderizarPaso();
            }
        }
    );

    botonReiniciar.addEventListener(
        "click",
        () => {
            detenerReproduccion();
            pasoActual = 0;
            renderizarPaso();
        }
    );

    botonReproducir.addEventListener(
        "click",
        () => {
            detenerReproduccion();

            if (pasoActual === pasos.length - 1) {
                pasoActual = 0;
                renderizarPaso();
            }

            botonReproducir.textContent =
                "Reproduciendo...";

            botonReproducir.disabled = true;

            temporizador = setInterval(
                () => {
                    if (
                        pasoActual <
                        pasos.length - 1
                    ) {
                        pasoActual += 1;
                        renderizarPaso();
                    } else {
                        detenerReproduccion();
                    }
                },
                2200
            );
        }
    );

    renderizarPaso();
});