document.addEventListener("DOMContentLoaded", () => {
    const formulario =
        document.getElementById("formulario-newton");

    const opcionesModo = [
        ...document.querySelectorAll(
            'input[name="modo"]'
        ),
    ];

    const panelUnaVariable =
        document.getElementById("panel-una-variable");

    const panelSistema =
        document.getElementById("panel-sistema");

    const cantidadVariables =
        document.getElementById("cantidad_variables");

    const variablesSistema =
        document.getElementById("variables_sistema");

    const contenedorEcuaciones =
        document.getElementById(
            "contenedor-ecuaciones-sistema"
        );

    const contenedorValores =
        document.getElementById(
            "contenedor-valores-sistema"
        );

    const elementoDatos =
        document.getElementById(
            "datos-formulario-sistema"
        );

    if (
        !formulario ||
        opcionesModo.length === 0 ||
        !panelUnaVariable ||
        !panelSistema ||
        !cantidadVariables ||
        !variablesSistema ||
        !contenedorEcuaciones ||
        !contenedorValores
    ) {
        return;
    }

    const VARIABLES_PREDETERMINADAS = [
        "x",
        "y",
        "z",
        "w",
        "u",
        "v",
        "t",
        "s",
    ];

    let datosIniciales = {
        cantidad: 2,
        variables: "x, y",
        ecuaciones: [],
        valores: [
            "1.5",
            "1",
        ],
    };

    if (elementoDatos) {
        try {
            datosIniciales = {
                ...datosIniciales,
                ...JSON.parse(
                    elementoDatos.textContent
                ),
            };
        } catch (error) {
            console.warn(
                "No fue posible recuperar el formulario del sistema.",
                error
            );
        }
    }


    try {
        const sistemaPendiente = JSON.parse(
            sessionStorage.getItem(
                "raphsolve_sistema_pendiente"
            )
        );

        if (
            sistemaPendiente &&
            typeof sistemaPendiente === "object"
        ) {
            datosIniciales = {
                ...datosIniciales,
                cantidad:
                    sistemaPendiente.cantidad ??
                    datosIniciales.cantidad,
                variables:
                    sistemaPendiente.variables ??
                    datosIniciales.variables,
                ecuaciones:
                    Array.isArray(
                        sistemaPendiente.ecuaciones
                    )
                        ? sistemaPendiente.ecuaciones
                        : datosIniciales.ecuaciones,
                valores:
                    Array.isArray(
                        sistemaPendiente.valores
                    )
                        ? sistemaPendiente.valores
                        : datosIniciales.valores,
            };

            const toleranciaPendiente =
                document.getElementById(
                    "tolerancia"
                );

            const maximoPendiente =
                document.getElementById(
                    "max_iteraciones"
                );

            if (
                toleranciaPendiente &&
                sistemaPendiente.tolerancia
            ) {
                toleranciaPendiente.value =
                    sistemaPendiente.tolerancia;
            }

            if (
                maximoPendiente &&
                sistemaPendiente.max_iteraciones
            ) {
                maximoPendiente.value =
                    sistemaPendiente.max_iteraciones;
            }

            sessionStorage.removeItem(
                "raphsolve_sistema_pendiente"
            );
        }
    } catch (error) {
        sessionStorage.removeItem(
            "raphsolve_sistema_pendiente"
        );
    }

    let ecuacionesGuardadas =
        Array.isArray(datosIniciales.ecuaciones)
            ? [...datosIniciales.ecuaciones]
            : [];

    let valoresGuardados =
        Array.isArray(datosIniciales.valores)
            ? [...datosIniciales.valores]
            : [];

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

    function obtenerVariables() {
        return variablesSistema.value
            .split(/[,\s]+/)
            .map(variable => variable.trim())
            .filter(Boolean);
    }

    function normalizarVariables(cantidad) {
        const actuales = obtenerVariables();
        const resultado = [];
        const usados = new Set();

        actuales.forEach(variable => {
            if (
                resultado.length < cantidad &&
                !usados.has(variable)
            ) {
                resultado.push(variable);
                usados.add(variable);
            }
        });

        VARIABLES_PREDETERMINADAS.forEach(variable => {
            if (
                resultado.length < cantidad &&
                !usados.has(variable)
            ) {
                resultado.push(variable);
                usados.add(variable);
            }
        });

        let indice = 1;

        while (resultado.length < cantidad) {
            const variable = `x${indice}`;

            if (!usados.has(variable)) {
                resultado.push(variable);
                usados.add(variable);
            }

            indice += 1;
        }

        variablesSistema.value =
            resultado.join(", ");

        return resultado;
    }

    function capturarCamposActuales() {
        ecuacionesGuardadas = [
            ...contenedorEcuaciones.querySelectorAll(
                'input[name="funciones_sistema"]'
            ),
        ].map(campo => campo.value);

        valoresGuardados = [
            ...contenedorValores.querySelectorAll(
                'input[name="valores_iniciales_sistema"]'
            ),
        ].map(campo => campo.value);
    }

    function crearGrupoCampo({
        etiqueta,
        nombre,
        valor,
        placeholder,
        tipo = "text",
        paso = null,
    }) {
        const grupo =
            document.createElement("div");

        grupo.className =
            "campo-sistema-dinamico";

        const label =
            document.createElement("label");

        label.className =
            "form-label etiqueta-campo-sistema";

        label.textContent = etiqueta;

        const input =
            document.createElement("input");

        input.type = tipo;
        input.name = nombre;
        input.className = "form-control";
        input.value = valor ?? "";
        input.placeholder = placeholder;
        input.required = true;

        if (paso !== null) {
            input.step = paso;
        }

        grupo.append(label, input);

        return grupo;
    }

    function renderizarCampos() {
        const cantidad = limitarCantidad(
            cantidadVariables.value
        );

        cantidadVariables.value = cantidad;

        const variables =
            normalizarVariables(cantidad);

        contenedorEcuaciones.innerHTML = "";
        contenedorValores.innerHTML = "";

        for (
            let indice = 0;
            indice < cantidad;
            indice += 1
        ) {
            const numero = indice + 1;
            const variable = variables[indice];

            const ecuacion =
                typeof ecuacionesGuardadas[indice] === "string"
                    ? ecuacionesGuardadas[indice]
                    : "";

            const valorInicial =
                valoresGuardados[indice] ??
                (indice === 0 ? "1.5" : "1");

            contenedorEcuaciones.appendChild(
                crearGrupoCampo({
                    etiqueta: `Ecuación ${numero}`,
                    nombre: "funciones_sistema",
                    valor: ecuacion,
                    placeholder:
                        numero === 1
                            ? "Ejemplo: x^2 + y^2 - 4"
                            : "Ejemplo: x - y",
                })
            );

            contenedorValores.appendChild(
                crearGrupoCampo({
                    etiqueta: `${variable}₀`,
                    nombre:
                        "valores_iniciales_sistema",
                    valor: valorInicial,
                    placeholder: "Valor inicial",
                    tipo: "number",
                    paso: "any",
                })
            );
        }

        actualizarEstadoPaneles();
    }

    function actualizarEtiquetasValores() {
        const cantidad = limitarCantidad(
            cantidadVariables.value
        );

        const variables =
            normalizarVariables(cantidad);

        const etiquetas = [
            ...contenedorValores.querySelectorAll(
                ".etiqueta-campo-sistema"
            ),
        ];

        etiquetas.forEach(
            (etiqueta, indice) => {
                etiqueta.textContent =
                    `${variables[indice]}₀`;
            }
        );
    }

    function obtenerModoActivo() {
        return (
            opcionesModo.find(opcion => opcion.checked)
                ?.value || "una_variable"
        );
    }

    function configurarPanel(
        panel,
        activo
    ) {
        panel.classList.toggle(
            "d-none",
            !activo
        );

        panel
            .querySelectorAll(
                "input, textarea, select"
            )
            .forEach(campo => {
                campo.disabled = !activo;

                if (
                    campo.name === "funcion" ||
                    campo.name === "valor_inicial" ||
                    campo.name ===
                        "variables_sistema" ||
                    campo.name ===
                        "funciones_sistema" ||
                    campo.name ===
                        "valores_iniciales_sistema"
                ) {
                    campo.required = activo;
                }
            });
    }

    function actualizarEstadoPaneles() {
        const modo =
            obtenerModoActivo();

        configurarPanel(
            panelUnaVariable,
            modo === "una_variable"
        );

        configurarPanel(
            panelSistema,
            modo === "sistema"
        );

        if (
            modo === "sistema" &&
            window.MathJax?.typesetPromise
        ) {
            window.MathJax.typesetPromise([
                panelSistema,
            ]).catch(() => {});
        }
    }

    opcionesModo.forEach(opcion => {
        opcion.addEventListener(
            "change",
            actualizarEstadoPaneles
        );
    });

    cantidadVariables.addEventListener(
        "change",
        () => {
            capturarCamposActuales();
            renderizarCampos();
        }
    );

    cantidadVariables.addEventListener(
        "input",
        () => {
            const cantidad =
                limitarCantidad(
                    cantidadVariables.value
                );

            if (
                String(cantidad) !==
                cantidadVariables.value
            ) {
                return;
            }

            capturarCamposActuales();
            renderizarCampos();
        }
    );

    variablesSistema.addEventListener(
        "input",
        actualizarEtiquetasValores
    );

    formulario.addEventListener(
        "submit",
        evento => {
            if (
                obtenerModoActivo() !== "sistema"
            ) {
                return;
            }

            const cantidad =
                limitarCantidad(
                    cantidadVariables.value
                );

            const variables =
                obtenerVariables();

            if (
                variables.length !== cantidad
            ) {
                evento.preventDefault();

                variablesSistema.setCustomValidity(
                    `Debes ingresar exactamente ${cantidad} variables.`
                );

                variablesSistema.reportValidity();
                return;
            }

            if (
                new Set(variables).size !==
                variables.length
            ) {
                evento.preventDefault();

                variablesSistema.setCustomValidity(
                    "Los nombres de las variables no pueden repetirse."
                );

                variablesSistema.reportValidity();
                return;
            }

            variablesSistema.setCustomValidity("");
        }
    );

    variablesSistema.addEventListener(
        "input",
        () => {
            variablesSistema.setCustomValidity("");
        }
    );

    cantidadVariables.value =
        limitarCantidad(
            datosIniciales.cantidad
        );

    if (datosIniciales.variables) {
        variablesSistema.value =
            datosIniciales.variables;
    }

    renderizarCampos();
    actualizarEstadoPaneles();
});