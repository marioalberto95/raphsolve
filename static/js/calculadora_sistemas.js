document.addEventListener("DOMContentLoaded", () => {
    const opcionCientifica =
        document.getElementById(
            "modo-calculadora-cientifica"
        );

    const opcionSistemas =
        document.getElementById(
            "modo-calculadora-sistemas"
        );

    const panelCientifica =
        document.getElementById(
            "panel-calculadora-cientifica"
        );

    const panelSistemas =
        document.getElementById(
            "panel-calculadora-sistemas"
        );

    const cantidad =
        document.getElementById(
            "cantidad-matriz"
        );

    const variables =
        document.getElementById(
            "variables-matriz"
        );

    const matrizContenedor =
        document.getElementById(
            "matriz-jacobiana-calculadora"
        );

    const vectorFContenedor =
        document.getElementById(
            "vector-f-calculadora"
        );

    const vectorXContenedor =
        document.getElementById(
            "vector-x-calculadora"
        );

    const botonResolver =
        document.getElementById(
            "resolver-correccion-newton"
        );

    const botonEjemplo =
        document.getElementById(
            "cargar-ejemplo-matriz"
        );

    const botonLimpiar =
        document.getElementById(
            "limpiar-calculadora-matriz"
        );

    const mensaje =
        document.getElementById(
            "mensaje-calculadora-matriz"
        );

    const resultado =
        document.getElementById(
            "resultado-calculadora-matriz"
        );

    const resultadoDelta =
        document.getElementById(
            "resultado-delta-calculadora"
        );

    const resultadoSiguiente =
        document.getElementById(
            "resultado-x-siguiente-calculadora"
        );

    const normaDelta =
        document.getElementById(
            "norma-delta-calculadora"
        );

    const residuoLineal =
        document.getElementById(
            "residuo-lineal-calculadora"
        );

    const tablaResultado =
        document.getElementById(
            "tabla-resultado-matriz"
        );

    if (
        !opcionCientifica ||
        !opcionSistemas ||
        !panelCientifica ||
        !panelSistemas ||
        !cantidad ||
        !variables ||
        !matrizContenedor ||
        !vectorFContenedor ||
        !vectorXContenedor ||
        !botonResolver ||
        !botonEjemplo ||
        !botonLimpiar ||
        !mensaje ||
        !resultado ||
        !resultadoDelta ||
        !resultadoSiguiente ||
        !normaDelta ||
        !residuoLineal ||
        !tablaResultado
    ) {
        return;
    }

    const VARIABLES_BASE = [
        "x",
        "y",
        "z",
        "w",
        "u",
        "v",
        "t",
        "s",
    ];

    function limitarCantidad(valor) {
        const numero = Number.parseInt(
            valor,
            10
        );

        if (!Number.isFinite(numero)) {
            return 2;
        }

        return Math.min(
            8,
            Math.max(2, numero)
        );
    }

    function obtenerVariables(
        cantidadActual
    ) {
        const ingresadas =
            variables.value
                .split(/[,\s]+/)
                .map(valor =>
                    valor.trim()
                )
                .filter(Boolean);

        const resultadoVariables = [];
        const usadas = new Set();

        ingresadas.forEach(variable => {
            if (
                resultadoVariables.length <
                    cantidadActual &&
                !usadas.has(variable)
            ) {
                resultadoVariables.push(
                    variable
                );

                usadas.add(variable);
            }
        });

        VARIABLES_BASE.forEach(variable => {
            if (
                resultadoVariables.length <
                    cantidadActual &&
                !usadas.has(variable)
            ) {
                resultadoVariables.push(
                    variable
                );

                usadas.add(variable);
            }
        });

        let indice = 1;

        while (
            resultadoVariables.length <
            cantidadActual
        ) {
            const variable = `x${indice}`;

            if (!usadas.has(variable)) {
                resultadoVariables.push(
                    variable
                );

                usadas.add(variable);
            }

            indice += 1;
        }

        variables.value =
            resultadoVariables.join(", ");

        return resultadoVariables;
    }

    function capturarValores(selector) {
        return [
            ...document.querySelectorAll(
                selector
            ),
        ].map(campo => campo.value);
    }

    function crearCampoNumero({
        clase,
        etiqueta,
        valor = "",
        fila = null,
        columna = null,
    }) {
        const envoltura =
            document.createElement("label");

        envoltura.className =
            "campo-matriz-calculadora";

        const texto =
            document.createElement("span");

        texto.textContent = etiqueta;

        const input =
            document.createElement("input");

        input.type = "number";
        input.step = "any";
        input.className =
            `form-control ${clase}`;

        input.value = valor;
        input.placeholder = "0";

        if (fila !== null) {
            input.dataset.fila = fila;
        }

        if (columna !== null) {
            input.dataset.columna =
                columna;
        }

        envoltura.append(
            texto,
            input
        );

        return envoltura;
    }

    function renderizarCampos(
        conservar = true
    ) {
        const n = limitarCantidad(
            cantidad.value
        );

        cantidad.value = n;

        const nombres =
            obtenerVariables(n);

        const anterioresJ =
            conservar
                ? capturarValores(
                    ".entrada-jacobiana"
                )
                : [];

        const anterioresF =
            conservar
                ? capturarValores(
                    ".entrada-vector-f"
                )
                : [];

        const anterioresX =
            conservar
                ? capturarValores(
                    ".entrada-vector-x"
                )
                : [];

        matrizContenedor.innerHTML = "";
        vectorFContenedor.innerHTML = "";
        vectorXContenedor.innerHTML = "";

        matrizContenedor.style.setProperty(
            "--dimension-matriz",
            n
        );

        for (
            let fila = 0;
            fila < n;
            fila += 1
        ) {
            for (
                let columna = 0;
                columna < n;
                columna += 1
            ) {
                const posicion =
                    fila * n + columna;

                matrizContenedor.appendChild(
                    crearCampoNumero({
                        clase:
                            "entrada-jacobiana",
                        etiqueta:
                            `j${fila + 1}${columna + 1}`,
                        valor:
                            anterioresJ[posicion] ??
                            "",
                        fila,
                        columna,
                    })
                );
            }

            vectorFContenedor.appendChild(
                crearCampoNumero({
                    clase:
                        "entrada-vector-f",
                    etiqueta:
                        `f${fila + 1}`,
                    valor:
                        anterioresF[fila] ??
                        "",
                    fila,
                })
            );

            vectorXContenedor.appendChild(
                crearCampoNumero({
                    clase:
                        "entrada-vector-x",
                    etiqueta:
                        `${nombres[fila]}ₙ`,
                    valor:
                        anterioresX[fila] ??
                        "",
                    fila,
                })
            );
        }

        limpiarResultado();
    }

    function actualizarModo() {
        const esSistemas =
            opcionSistemas.checked;

        panelCientifica.classList.toggle(
            "d-none",
            esSistemas
        );

        panelSistemas.classList.toggle(
            "d-none",
            !esSistemas
        );

        if (
            esSistemas &&
            window.MathJax?.typesetPromise
        ) {
            window.MathJax
                .typesetPromise([
                    panelSistemas,
                ])
                .catch(() => {});
        }
    }

    function leerNumeros(selector) {
        const campos = [
            ...document.querySelectorAll(
                selector
            ),
        ];

        if (
            campos.some(
                campo =>
                    campo.value.trim() ===
                    ""
            )
        ) {
            throw new Error(
                "Completa todos los valores de la matriz y los vectores."
            );
        }

        const valores = campos.map(
            campo => Number(campo.value)
        );

        if (
            valores.some(
                valor =>
                    !Number.isFinite(valor)
            )
        ) {
            throw new Error(
                "Todos los valores deben ser números válidos."
            );
        }

        return valores;
    }

    function crearMatriz(
        valores,
        n
    ) {
        return Array.from(
            { length: n },
            (_, fila) =>
                valores.slice(
                    fila * n,
                    (fila + 1) * n
                )
        );
    }

    function resolverSistemaLineal(
        matriz,
        vector
    ) {
        const n = matriz.length;

        const aumentada =
            matriz.map(
                (fila, indice) => [
                    ...fila.map(Number),
                    Number(vector[indice]),
                ]
            );

        const EPSILON = 1e-12;

        for (
            let columna = 0;
            columna < n;
            columna += 1
        ) {
            let pivote = columna;

            for (
                let fila =
                    columna + 1;
                fila < n;
                fila += 1
            ) {
                if (
                    Math.abs(
                        aumentada[fila][columna]
                    ) >
                    Math.abs(
                        aumentada[pivote][columna]
                    )
                ) {
                    pivote = fila;
                }
            }

            if (
                Math.abs(
                    aumentada[pivote][columna]
                ) < EPSILON
            ) {
                throw new Error(
                    "La matriz Jacobiana es singular o casi singular."
                );
            }

            if (pivote !== columna) {
                [
                    aumentada[columna],
                    aumentada[pivote],
                ] = [
                    aumentada[pivote],
                    aumentada[columna],
                ];
            }

            for (
                let fila =
                    columna + 1;
                fila < n;
                fila += 1
            ) {
                const factor =
                    aumentada[fila][columna] /
                    aumentada[columna][columna];

                for (
                    let indice = columna;
                    indice <= n;
                    indice += 1
                ) {
                    aumentada[fila][indice] -=
                        factor *
                        aumentada[columna][indice];
                }
            }
        }

        const solucion =
            Array(n).fill(0);

        for (
            let fila = n - 1;
            fila >= 0;
            fila -= 1
        ) {
            let suma =
                aumentada[fila][n];

            for (
                let columna =
                    fila + 1;
                columna < n;
                columna += 1
            ) {
                suma -=
                    aumentada[fila][columna] *
                    solucion[columna];
            }

            solucion[fila] =
                suma /
                aumentada[fila][fila];
        }

        return solucion;
    }

    function multiplicarMatrizVector(
        matriz,
        vector
    ) {
        return matriz.map(
            fila =>
                fila.reduce(
                    (acumulado, valor, indice) =>
                        acumulado +
                        valor *
                        vector[indice],
                    0
                )
        );
    }

    function normaInfinito(vector) {
        if (vector.length === 0) {
            return 0;
        }

        return Math.max(
            ...vector.map(
                valor =>
                    Math.abs(valor)
            )
        );
    }

    function formatearNumero(
        valor,
        decimales = 10
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
            .toFixed(decimales)
            .replace(/0+$/, "")
            .replace(/\.$/, "");
    }

    function vectorLatex(
        valores
    ) {
        return String.raw`\begin{bmatrix}${valores
            .map(valor =>
                formatearNumero(
                    valor,
                    8
                )
            )
            .join(
                String.raw` \\ `
            )}\end{bmatrix}`;
    }

    function limpiarResultado() {
        resultado.classList.add(
            "d-none"
        );

        mensaje.innerHTML = "";
        tablaResultado.innerHTML = "";
    }

    function mostrarResultado(
        nombres,
        xActual,
        delta,
        xSiguiente,
        residuo
    ) {
        resultadoDelta.innerHTML = `
            \\[
                \Delta X
                =
                ${vectorLatex(delta)}
            \\]
        `;

        resultadoSiguiente.innerHTML = `
            \\[
                X_{n+1}
                =
                ${vectorLatex(xSiguiente)}
            \\]
        `;

        normaDelta.textContent =
            formatearNumero(
                normaInfinito(delta),
                12
            );

        residuoLineal.textContent =
            formatearNumero(
                residuo,
                12
            );

        tablaResultado.innerHTML =
            nombres
                .map(
                    (variable, indice) => `
                        <tr>
                            <td>
                                ${variable}
                            </td>

                            <td>
                                ${formatearNumero(
                                    xActual[indice],
                                    8
                                )}
                            </td>

                            <td>
                                ${formatearNumero(
                                    delta[indice],
                                    8
                                )}
                            </td>

                            <td>
                                ${formatearNumero(
                                    xSiguiente[indice],
                                    8
                                )}
                            </td>
                        </tr>
                    `
                )
                .join("");

        resultado.classList.remove(
            "d-none"
        );

        mensaje.innerHTML = `
            <div class="alert alert-success">
                La corrección se calculó correctamente.
            </div>
        `;

        if (
            window.MathJax?.typesetPromise
        ) {
            window.MathJax
                .typesetPromise([
                    resultado,
                ])
                .catch(() => {});
        }
    }

    function calcular() {
        limpiarResultado();

        try {
            const n = limitarCantidad(
                cantidad.value
            );

            const nombres =
                obtenerVariables(n);

            const valoresJ =
                leerNumeros(
                    ".entrada-jacobiana"
                );

            const vectorF =
                leerNumeros(
                    ".entrada-vector-f"
                );

            const vectorX =
                leerNumeros(
                    ".entrada-vector-x"
                );

            const matrizJ =
                crearMatriz(
                    valoresJ,
                    n
                );

            const delta =
                resolverSistemaLineal(
                    matrizJ,
                    vectorF
                );

            const xSiguiente =
                vectorX.map(
                    (valor, indice) =>
                        valor -
                        delta[indice]
                );

            const producto =
                multiplicarMatrizVector(
                    matrizJ,
                    delta
                );

            const residuo =
                normaInfinito(
                    producto.map(
                        (valor, indice) =>
                            valor -
                            vectorF[indice]
                    )
                );

            mostrarResultado(
                nombres,
                vectorX,
                delta,
                xSiguiente,
                residuo
            );
        } catch (error) {
            mensaje.innerHTML = `
                <div class="alert alert-danger">
                    ${error.message}
                </div>
            `;
        }
    }

    function asignarValores(
        selector,
        valores
    ) {
        const campos = [
            ...document.querySelectorAll(
                selector
            ),
        ];

        campos.forEach(
            (campo, indice) => {
                campo.value =
                    valores[indice] ?? "";
            }
        );
    }

    function cargarEjemplo() {
        cantidad.value = "2";
        variables.value = "x, y";

        renderizarCampos(false);

        asignarValores(
            ".entrada-jacobiana",
            [
                3,
                2,
                1,
                -1,
            ]
        );

        asignarValores(
            ".entrada-vector-f",
            [
                -0.75,
                0.5,
            ]
        );

        asignarValores(
            ".entrada-vector-x",
            [
                1.5,
                1,
            ]
        );

        mensaje.innerHTML = `
            <div class="alert alert-info">
                Ejemplo cargado. Corresponde a la primera
                iteración del sistema
                \(x^2+y^2-4=0,\ x-y=0\).
            </div>
        `;

        if (
            window.MathJax?.typesetPromise
        ) {
            window.MathJax
                .typesetPromise([
                    mensaje,
                ])
                .catch(() => {});
        }
    }

    function limpiar() {
        renderizarCampos(false);
        limpiarResultado();
    }

    opcionCientifica.addEventListener(
        "change",
        actualizarModo
    );

    opcionSistemas.addEventListener(
        "change",
        actualizarModo
    );

    cantidad.addEventListener(
        "change",
        () => renderizarCampos(true)
    );

    variables.addEventListener(
        "input",
        () => renderizarCampos(true)
    );

    botonResolver.addEventListener(
        "click",
        calcular
    );

    botonEjemplo.addEventListener(
        "click",
        cargarEjemplo
    );

    botonLimpiar.addEventListener(
        "click",
        limpiar
    );

    panelSistemas.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key === "Enter" &&
                evento.target.matches(
                    "input"
                )
            ) {
                evento.preventDefault();
                calcular();
            }
        }
    );

    renderizarCampos(false);
    actualizarModo();
});