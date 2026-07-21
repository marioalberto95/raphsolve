document.addEventListener("DOMContentLoaded", () => {
    const CLAVE_HISTORIAL =
        "raphsolve_historial";

    const CLAVE_SISTEMA_PENDIENTE =
        "raphsolve_sistema_pendiente";

    const MAXIMO_REGISTROS = 50;

    const elementoUnaVariable =
        document.getElementById(
            "datos-historial"
        );

    const elementoSistema =
        document.getElementById(
            "datos-historial-sistema"
        );

    const lista =
        document.getElementById(
            "lista-historial"
        );

    const mensajeVacio =
        document.getElementById(
            "historial-vacio"
        );

    const mensajeSinResultados =
        document.getElementById(
            "historial-sin-resultados"
        );

    const botonLimpiar =
        document.getElementById(
            "limpiar-historial"
        );

    const buscador =
        document.getElementById(
            "buscar-historial"
        );

    const botonesFiltro = [
        ...document.querySelectorAll(
            ".boton-filtro-historial"
        ),
    ];

    const contadorTotal =
        document.getElementById(
            "contador-historial-total"
        );

    const contadorUnaVariable =
        document.getElementById(
            "contador-historial-una-variable"
        );

    const contadorSistemas =
        document.getElementById(
            "contador-historial-sistemas"
        );

    let filtroActivo = "todos";
    let consultaActiva = "";

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

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizarTipo(registro) {
        return registro?.tipo === "sistema"
            ? "sistema"
            : "una_variable";
    }

    function obtenerHistorial() {
        try {
            const datos = JSON.parse(
                localStorage.getItem(
                    CLAVE_HISTORIAL
                )
            );

            return Array.isArray(datos)
                ? datos
                : [];
        } catch (error) {
            return [];
        }
    }

    function guardarHistorial(historial) {
        try {
            localStorage.setItem(
                CLAVE_HISTORIAL,
                JSON.stringify(historial)
            );
        } catch (error) {
            console.warn(
                "No fue posible guardar el historial.",
                error
            );
        }
    }

    function crearFirma(registro) {
        const tipo =
            normalizarTipo(registro);

        if (tipo === "sistema") {
            return JSON.stringify({
                tipo,
                variables:
                    registro.variables || [],
                ecuaciones:
                    registro.ecuaciones || [],
                valores:
                    registro.valores_iniciales || [],
                solucion:
                    registro.solucion || {},
                convergio:
                    Boolean(registro.convergio),
            });
        }

        return JSON.stringify({
            tipo,
            funcion:
                registro.funcion || "",
            valorInicial:
                registro.valor_inicial || "",
            raiz:
                registro.raiz ?? null,
            convergio:
                registro.convergio !== false,
        });
    }

    function leerDatosElemento(
        elemento,
        tipo
    ) {
        if (!elemento) {
            return null;
        }

        try {
            const datos = JSON.parse(
                elemento.textContent
            );

            return {
                tipo,
                ...datos,
            };
        } catch (error) {
            console.warn(
                "No fue posible leer el cálculo.",
                error
            );

            return null;
        }
    }

    function guardarRegistro(registro) {
        if (!registro) {
            return;
        }

        const historial =
            obtenerHistorial();

        const firma =
            crearFirma(registro);

        const yaExiste =
            historial.some(
                elemento =>
                    crearFirma(elemento) ===
                    firma
            );

        if (yaExiste) {
            return;
        }

        const fecha = new Date();

        historial.unshift({
            id:
                fecha.getTime() +
                Math.floor(
                    Math.random() * 1000
                ),
            ...registro,
            fecha_iso:
                fecha.toISOString(),
            fecha:
                fecha.toLocaleString(
                    "es-MX"
                ),
        });

        guardarHistorial(
            historial.slice(
                0,
                MAXIMO_REGISTROS
            )
        );
    }

    function guardarCalculosPagina() {
        guardarRegistro(
            leerDatosElemento(
                elementoUnaVariable,
                "una_variable"
            )
        );

        guardarRegistro(
            leerDatosElemento(
                elementoSistema,
                "sistema"
            )
        );
    }

    function volverAResolverUnaVariable(
        registro
    ) {
        const parametros =
            new URLSearchParams({
                modo: "una_variable",
                funcion:
                    registro.funcion || "",
                valor_inicial:
                    registro.valor_inicial ||
                    "1.5",
                tolerancia:
                    registro.tolerancia ||
                    "0.0001",
                max_iteraciones:
                    registro.max_iteraciones ||
                    "100",
            });

        window.location.assign(
            `/?${parametros.toString()}`
        );
    }

    function volverAResolverSistema(
        registro
    ) {
        const variables =
            Array.isArray(
                registro.variables
            )
                ? registro.variables
                : [];

        const ecuaciones =
            Array.isArray(
                registro.ecuaciones
            )
                ? registro.ecuaciones
                : [];

        const valores =
            Array.isArray(
                registro.valores_iniciales
            )
                ? registro.valores_iniciales
                : [];

        const datosPendientes = {
            cantidad:
                variables.length || 2,
            variables:
                variables.join(", "),
            ecuaciones,
            valores,
            tolerancia:
                registro.tolerancia ||
                "0.0001",
            max_iteraciones:
                registro.max_iteraciones ||
                "100",
        };

        try {
            sessionStorage.setItem(
                CLAVE_SISTEMA_PENDIENTE,
                JSON.stringify(
                    datosPendientes
                )
            );
        } catch (error) {
            console.warn(
                "No fue posible preparar el sistema.",
                error
            );
        }

        window.location.assign(
            "/?modo=sistema"
        );
    }

    function volverAResolver(registro) {
        if (
            normalizarTipo(registro) ===
            "sistema"
        ) {
            volverAResolverSistema(
                registro
            );

            return;
        }

        volverAResolverUnaVariable(
            registro
        );
    }

    function eliminarRegistro(id) {
        const historial =
            obtenerHistorial().filter(
                registro =>
                    Number(registro.id) !==
                    Number(id)
            );

        guardarHistorial(historial);
        mostrarHistorial();
    }

    function textoBusqueda(registro) {
        if (
            normalizarTipo(registro) ===
            "sistema"
        ) {
            return [
                ...(registro.variables || []),
                ...(registro.ecuaciones || []),
                ...Object.entries(
                    registro.solucion || {}
                ).flat(),
            ]
                .join(" ")
                .toLowerCase();
        }

        return [
            registro.funcion,
            registro.raiz,
            registro.valor_inicial,
        ]
            .join(" ")
            .toLowerCase();
    }

    function cumpleFiltros(registro) {
        const tipo =
            normalizarTipo(registro);

        const cumpleTipo =
            filtroActivo === "todos" ||
            filtroActivo === tipo;

        const cumpleBusqueda =
            !consultaActiva ||
            textoBusqueda(registro)
                .includes(consultaActiva);

        return (
            cumpleTipo &&
            cumpleBusqueda
        );
    }

    function crearEstado(registro) {
        const convergio =
            registro.convergio !== false;

        return `
            <span class="
                estado-historial
                ${convergio
                    ? "estado-convergente"
                    : "estado-no-convergente"}
            ">
                ${convergio
                    ? "Convergió"
                    : "No convergió"}
            </span>
        `;
    }

    function crearTarjetaUnaVariable(
        registro
    ) {
        return `
            <div
                class="d-flex flex-column flex-lg-row
                       justify-content-between gap-3"
            >
                <div class="flex-grow-1">
                    <div
                        class="d-flex flex-wrap
                               align-items-center gap-2 mb-2"
                    >
                        <span class="
                            insignia-historial
                            insignia-historial-una-variable
                        ">
                            1D
                        </span>

                        ${crearEstado(registro)}
                    </div>

                    <h3 class="h5">
                        f(x) =
                        <code>
                            ${escaparHTML(
                                registro.funcion
                            )}
                        </code>
                    </h3>

                    <div class="rejilla-datos-historial">
                        <div>
                            <span>Raíz</span>

                            <strong>
                                ${formatearNumero(
                                    registro.raiz,
                                    8
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Valor inicial</span>

                            <strong>
                                ${formatearNumero(
                                    registro.valor_inicial,
                                    8
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Iteraciones</span>

                            <strong>
                                ${escaparHTML(
                                    registro.iteraciones
                                )}
                            </strong>
                        </div>
                    </div>

                    <p class="text-secondary mb-2 mt-3">
                        ${escaparHTML(
                            registro.fecha || ""
                        )}
                    </p>

                    <span class="texto-volver-resolver">
                        Pulsa para volver a resolver
                    </span>
                </div>

                <div>
                    <button
                        type="button"
                        class="btn btn-outline-danger
                               boton-eliminar-registro"
                        data-id="${registro.id}"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    function crearTarjetaSistema(
        registro
    ) {
        const variables =
            Array.isArray(registro.variables)
                ? registro.variables
                : [];

        const ecuaciones =
            Array.isArray(registro.ecuaciones)
                ? registro.ecuaciones
                : [];

        const solucion =
            registro.solucion &&
            typeof registro.solucion ===
                "object"
                ? registro.solucion
                : {};

        const listaEcuaciones =
            ecuaciones
                .map(
                    (ecuacion, indice) => `
                        <li>
                            <code>
                                f${indice + 1}:
                                ${escaparHTML(
                                    ecuacion
                                )}
                            </code>
                        </li>
                    `
                )
                .join("");

        const valoresSolucion =
            variables
                .map(variable => `
                    <div>
                        <span>
                            ${escaparHTML(variable)}
                        </span>

                        <strong>
                            ${formatearNumero(
                                solucion[variable],
                                8
                            )}
                        </strong>
                    </div>
                `)
                .join("");

        const inicial =
            (registro.valores_iniciales || [])
                .map(valor =>
                    formatearNumero(
                        valor,
                        6
                    )
                )
                .join(", ");

        return `
            <div
                class="d-flex flex-column flex-lg-row
                       justify-content-between gap-3"
            >
                <div class="flex-grow-1">
                    <div
                        class="d-flex flex-wrap
                               align-items-center gap-2 mb-2"
                    >
                        <span class="
                            insignia-historial
                            insignia-historial-sistema
                        ">
                            ${variables.length || "N"}D
                        </span>

                        ${crearEstado(registro)}
                    </div>

                    <h3 class="h5">
                        Sistema de
                        ${variables.length}
                        variables
                    </h3>

                    <ul class="ecuaciones-historial">
                        ${listaEcuaciones}
                    </ul>

                    <div class="rejilla-datos-historial">
                        ${valoresSolucion}

                        <div>
                            <span>Vector inicial</span>

                            <strong>
                                (${escaparHTML(inicial)})
                            </strong>
                        </div>

                        <div>
                            <span>Iteraciones</span>

                            <strong>
                                ${escaparHTML(
                                    registro.iteraciones
                                )}
                            </strong>
                        </div>
                    </div>

                    <p class="text-secondary mb-2 mt-3">
                        ${escaparHTML(
                            registro.fecha || ""
                        )}
                    </p>

                    <span class="texto-volver-resolver">
                        Pulsa para cargar nuevamente el sistema
                    </span>
                </div>

                <div>
                    <button
                        type="button"
                        class="btn btn-outline-danger
                               boton-eliminar-registro"
                        data-id="${registro.id}"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    function crearTarjeta(registro) {
        const tarjeta =
            document.createElement(
                "article"
            );

        const tipo =
            normalizarTipo(registro);

        tarjeta.className = `
            registro-historial
            mb-3
            registro-clicable
            registro-${tipo}
        `;

        tarjeta.tabIndex = 0;
        tarjeta.setAttribute(
            "role",
            "button"
        );

        tarjeta.setAttribute(
            "aria-label",
            tipo === "sistema"
                ? "Volver a resolver el sistema"
                : `Volver a resolver ${registro.funcion}`
        );

        tarjeta.innerHTML =
            tipo === "sistema"
                ? crearTarjetaSistema(
                    registro
                )
                : crearTarjetaUnaVariable(
                    registro
                );

        tarjeta.addEventListener(
            "click",
            evento => {
                if (
                    evento.target.closest(
                        ".boton-eliminar-registro"
                    )
                ) {
                    return;
                }

                volverAResolver(registro);
            }
        );

        tarjeta.addEventListener(
            "keydown",
            evento => {
                if (
                    evento.key === "Enter" ||
                    evento.key === " "
                ) {
                    evento.preventDefault();
                    volverAResolver(registro);
                }
            }
        );

        const botonEliminar =
            tarjeta.querySelector(
                ".boton-eliminar-registro"
            );

        botonEliminar?.addEventListener(
            "click",
            evento => {
                evento.stopPropagation();

                eliminarRegistro(
                    botonEliminar.dataset.id
                );
            }
        );

        return tarjeta;
    }

    function actualizarContadores(
        historial
    ) {
        const sistemas =
            historial.filter(
                registro =>
                    normalizarTipo(registro) ===
                    "sistema"
            ).length;

        const unaVariable =
            historial.length -
            sistemas;

        if (contadorTotal) {
            contadorTotal.textContent =
                historial.length;
        }

        if (contadorUnaVariable) {
            contadorUnaVariable.textContent =
                unaVariable;
        }

        if (contadorSistemas) {
            contadorSistemas.textContent =
                sistemas;
        }
    }

    function mostrarHistorial() {
        if (
            !lista ||
            !mensajeVacio
        ) {
            return;
        }

        const historial =
            obtenerHistorial();

        actualizarContadores(
            historial
        );

        lista.innerHTML = "";

        if (historial.length === 0) {
            mensajeVacio.classList.remove(
                "d-none"
            );

            mensajeSinResultados?.classList.add(
                "d-none"
            );

            botonLimpiar?.setAttribute(
                "disabled",
                "disabled"
            );

            return;
        }

        mensajeVacio.classList.add(
            "d-none"
        );

        botonLimpiar?.removeAttribute(
            "disabled"
        );

        const filtrados =
            historial.filter(
                cumpleFiltros
            );

        if (filtrados.length === 0) {
            mensajeSinResultados?.classList.remove(
                "d-none"
            );

            return;
        }

        mensajeSinResultados?.classList.add(
            "d-none"
        );

        filtrados.forEach(
            registro => {
                lista.appendChild(
                    crearTarjeta(registro)
                );
            }
        );
    }

    botonesFiltro.forEach(boton => {
        boton.addEventListener(
            "click",
            () => {
                filtroActivo =
                    boton.dataset.filtro ||
                    "todos";

                botonesFiltro.forEach(
                    elemento =>
                        elemento.classList.toggle(
                            "activo",
                            elemento === boton
                        )
                );

                mostrarHistorial();
            }
        );
    });

    buscador?.addEventListener(
        "input",
        () => {
            consultaActiva =
                buscador.value
                    .trim()
                    .toLowerCase();

            mostrarHistorial();
        }
    );

    botonLimpiar?.addEventListener(
        "click",
        () => {
            const confirmar =
                window.confirm(
                    "¿Deseas eliminar todo el historial?"
                );

            if (!confirmar) {
                return;
            }

            localStorage.removeItem(
                CLAVE_HISTORIAL
            );

            mostrarHistorial();
        }
    );

    guardarCalculosPagina();
    mostrarHistorial();
});