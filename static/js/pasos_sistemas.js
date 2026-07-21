document.addEventListener("DOMContentLoaded", () => {
    const elementoDatos =
        document.getElementById(
            "datos-pasos-sistema"
        );

    const contenido =
        document.getElementById(
            "contenido-paso-sistema"
        );

    const contador =
        document.getElementById(
            "contador-pasos-sistema"
        );

    const barra =
        document.getElementById(
            "barra-pasos-sistema"
        );

    const botonAnterior =
        document.getElementById(
            "paso-anterior-sistema"
        );

    const botonSiguiente =
        document.getElementById(
            "paso-siguiente-sistema"
        );

    const botonReproducir =
        document.getElementById(
            "reproducir-pasos-sistema"
        );

    const botonReiniciar =
        document.getElementById(
            "reiniciar-pasos-sistema"
        );

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

    function variableLatex(nombre) {
        return String(nombre)
            .replace(
                /_([A-Za-z0-9]+)/g,
                "_{$1}"
            );
    }

    function vectorLatex(
        valores,
        decimales = 6
    ) {
        if (!Array.isArray(valores)) {
            return String.raw`\begin{bmatrix}—\end{bmatrix}`;
        }

        const elementos = valores.map(
            valor =>
                formatearNumero(
                    valor,
                    decimales
                )
        );

        return String.raw`\begin{bmatrix}${elementos.join(
            String.raw` \\ `
        )}\end{bmatrix}`;
    }

    function vectorVariablesLatex(
        variables
    ) {
        const elementos = variables.map(
            variable =>
                variableLatex(variable)
        );

        return String.raw`\begin{bmatrix}${elementos.join(
            String.raw` \\ `
        )}\end{bmatrix}`;
    }

    function matrizLatex(
        matriz,
        decimales = 6
    ) {
        if (!Array.isArray(matriz)) {
            return String.raw`\begin{bmatrix}—\end{bmatrix}`;
        }

        const filas = matriz.map(fila => {
            if (!Array.isArray(fila)) {
                return "—";
            }

            return fila
                .map(valor =>
                    formatearNumero(
                        valor,
                        decimales
                    )
                )
                .join(" & ");
        });

        return String.raw`\begin{bmatrix}${filas.join(
            String.raw` \\ `
        )}\end{bmatrix}`;
    }

    function crearListaFunciones(
        funciones
    ) {
        return funciones
            .map(
                (funcion, indice) => `
                    <div class="formula-paso">
                        \\[
                            f_{${indice + 1}}(X)
                            =
                            ${funcion}
                            =
                            0
                        \\]
                    </div>
                `
            )
            .join("");
    }

    function crearListaSolucion(
        variables,
        solucion
    ) {
        return variables
            .map(variable => {
                const valor =
                    solucion?.[variable];

                return `
                    <article class="valor-solucion-sistema">
                        <span>${variable}</span>

                        <strong>
                            ${formatearNumero(
                                valor,
                                8
                            )}
                        </strong>
                    </article>
                `;
            })
            .join("");
    }

    let datos;

    try {
        datos = JSON.parse(
            elementoDatos.textContent
        );
    } catch (error) {
        contenido.innerHTML = `
            <div class="alert alert-danger">
                No fue posible cargar la explicación
                del sistema.
            </div>
        `;

        return;
    }

    const variables =
        Array.isArray(datos.variables)
            ? datos.variables
            : [];

    const funciones =
        Array.isArray(datos.funciones_latex)
            ? datos.funciones_latex
            : [];

    const iteraciones =
        Array.isArray(datos.iteraciones)
            ? datos.iteraciones
            : [];

    const pasos = [];

    pasos.push({
        titulo:
            "Paso 1: Sistema ingresado",
        contenido: `
            <p>
                Se resolverá un sistema de
                <strong>${variables.length}</strong>
                variables:
            </p>

            ${crearListaFunciones(funciones)}

            <p class="mb-0">
                El vector de incógnitas es:
            </p>

            <div class="formula-paso">
                \\[
                    X
                    =
                    ${vectorVariablesLatex(
                        variables
                    )}
                \\]
            </div>
        `,
    });

    pasos.push({
        titulo:
            "Paso 2: Construir la matriz Jacobiana",
        contenido: `
            <p>
                La matriz Jacobiana contiene todas
                las derivadas parciales del sistema:
            </p>

            <div class="formula-paso">
                \\[
                    J(X)
                    =
                    ${datos.jacobiana_latex}
                \\]
            </div>

            <small class="text-secondary">
                Cada fila corresponde a una ecuación
                y cada columna a una variable.
            </small>
        `,
    });

    pasos.push({
        titulo:
            "Paso 3: Fórmula multivariable",
        contenido: `
            <p>
                En cada iteración se resuelve primero
                el sistema lineal:
            </p>

            <div class="formula-paso">
                \\[
                    J(X_n)
                    \Delta X_n
                    =
                    F(X_n)
                \\]
            </div>

            <p>
                Después se actualiza el vector:
            </p>

            <div class="formula-paso">
                \\[
                    X_{n+1}
                    =
                    X_n
                    -
                    \Delta X_n
                \\]
            </div>

            <div class="resultado-iteracion">
                <p class="mb-0">
                    No se calcula directamente
                    \(J(X_n)^{-1}\). Se resuelve el
                    sistema lineal para obtener una
                    solución numéricamente más estable.
                </p>
            </div>
        `,
    });

    iteraciones.forEach(iteracion => {
        const numero = iteracion.numero;

        const actual = vectorLatex(
            iteracion.actual,
            6
        );

        const funcionesEvaluadas =
            vectorLatex(
                iteracion.funciones,
                6
            );

        const jacobiana = matrizLatex(
            iteracion.jacobiana,
            6
        );

        const delta = vectorLatex(
            iteracion.delta,
            6
        );

        const siguiente = vectorLatex(
            iteracion.siguiente,
            6
        );

        const error = formatearNumero(
            iteracion.error,
            10
        );

        const residuo = formatearNumero(
            iteracion.residuo,
            10
        );

        pasos.push({
            titulo:
                `Iteración ${numero}`,
            contenido: `
                <p>
                    La aproximación actual es:
                </p>

                <div class="formula-paso">
                    \\[
                        X_${numero - 1}
                        =
                        ${actual}
                    \\]
                </div>

                <p>
                    Evaluamos el vector de funciones:
                </p>

                <div class="formula-paso">
                    \\[
                        F(X_${numero - 1})
                        =
                        ${funcionesEvaluadas}
                    \\]
                </div>

                <p>
                    Evaluamos la matriz Jacobiana:
                </p>

                <div class="formula-paso">
                    \\[
                        J(X_${numero - 1})
                        =
                        ${jacobiana}
                    \\]
                </div>

                <p>
                    Resolvemos la corrección:
                </p>

                <div class="formula-paso">
                    \\[
                        J(X_${numero - 1})
                        \Delta X_${numero - 1}
                        =
                        F(X_${numero - 1})
                    \\]

                    \\[
                        \Delta X_${numero - 1}
                        =
                        ${delta}
                    \\]
                </div>

                <p>
                    Calculamos la nueva aproximación:
                </p>

                <div class="formula-paso">
                    \\[
                        X_${numero}
                        =
                        X_${numero - 1}
                        -
                        \Delta X_${numero - 1}
                        =
                        ${siguiente}
                    \\]
                </div>

                <div class="resultado-iteracion">
                    <p>
                        <strong>Error aproximado:</strong>
                        ${error}
                    </p>

                    <p>
                        <strong>Norma del residuo:</strong>
                        ${residuo}
                    </p>

                    <small class="text-secondary">
                        El error mide el cambio entre
                        aproximaciones. El residuo mide
                        qué tan cerca está \(F(X)\) del
                        vector cero.
                    </small>
                </div>
            `,
        });
    });

    const aproximacionFinal =
        datos.convergio
            ? datos.solucion
            : datos.ultima_aproximacion;

    pasos.push({
        titulo:
            "Resultado final del sistema",
        contenido: datos.convergio
            ? `
                <p>
                    El error y el residuo alcanzaron
                    la tolerancia indicada.
                </p>

                <div class="resultado-final-paso">
                    <h4 class="h5 mb-3">
                        Solución aproximada
                    </h4>

                    <div class="rejilla-solucion-sistema">
                        ${crearListaSolucion(
                            variables,
                            aproximacionFinal
                        )}
                    </div>
                </div>
            `
            : `
                <p>
                    El método no alcanzó la tolerancia
                    dentro del número máximo de
                    iteraciones.
                </p>

                <div class="alert alert-warning">
                    Se muestra la última aproximación
                    disponible. Prueba otros valores
                    iniciales o aumenta el límite de
                    iteraciones.
                </div>

                <div class="rejilla-solucion-sistema">
                    ${crearListaSolucion(
                        variables,
                        aproximacionFinal
                    )}
                </div>
            `,
    });

    let pasoActual = 0;
    let temporizador = null;

    function actualizarMathJax() {
        if (
            window.MathJax &&
            window.MathJax.typesetPromise
        ) {
            window.MathJax
                .typesetPromise([contenido])
                .catch(() => {});
        }
    }

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
            ((pasoActual + 1) /
                pasos.length) *
            100;

        barra.style.width =
            `${porcentaje}%`;

        barra.setAttribute(
            "aria-valuenow",
            String(
                Math.round(porcentaje)
            )
        );

        botonAnterior.disabled =
            pasoActual === 0;

        botonSiguiente.disabled =
            pasoActual ===
            pasos.length - 1;

        actualizarMathJax();
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

            if (
                pasoActual <
                pasos.length - 1
            ) {
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

            if (
                pasoActual ===
                pasos.length - 1
            ) {
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
                3000
            );
        }
    );

    renderizarPaso();
});