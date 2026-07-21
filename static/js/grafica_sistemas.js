document.addEventListener("DOMContentLoaded", () => {
    const elementoDatos =
        document.getElementById(
            "datos-grafica-sistema"
        );

    const contenedor3D =
        document.getElementById(
            "grafica-sistema-3d"
        );

    const contenedorError =
        document.getElementById(
            "grafica-error-sistema"
        );

    const botonAnimar =
        document.getElementById(
            "boton-animar-sistema"
        );

    const botonRotar =
        document.getElementById(
            "boton-rotar-sistema"
        );

    if (
        !elementoDatos ||
        !contenedor3D ||
        !contenedorError ||
        !botonAnimar ||
        !botonRotar
    ) {
        return;
    }

    let datos;

    try {
        datos = JSON.parse(
            elementoDatos.textContent
        );
    } catch (error) {
        contenedor3D.innerHTML = `
            <div class="alert alert-danger m-3">
                No fue posible cargar la visualización del sistema.
            </div>
        `;

        botonAnimar.disabled = true;
        botonRotar.disabled = true;
        return;
    }

    const grafica = datos.grafica || {};
    const iteraciones =
        Array.isArray(datos.iteraciones)
            ? datos.iteraciones
            : [];

    const variables =
        Array.isArray(datos.variables)
            ? datos.variables
            : [];

    const COLORES = {
        fondo: "#05030a",
        panel: "#0b0614",
        texto: "#f8f4ff",
        secundario: "#c9bdd8",
        turquesa: "#00f5d4",
        rosa: "#ff2bd6",
        morado: "#b026ff",
        verde: "#8aff00",
        azul: "#00c8ff",
        cuadricula:
            "rgba(0, 245, 212, 0.15)",
    };

    const configuracion = {
        responsive: true,
        displaylogo: false,
        displayModeBar: true,
        scrollZoom: true,
        doubleClick: "reset+autosize",
        showTips: true,
        editable: false,
    };

    let rotacionActiva = true;
    let animando = false;
    let temporizadorAnimacion = null;
    let temporizadorRotacion = null;
    let anguloCamara = 0.75;
    let actualizandoCamaraAutomaticamente = false;
    let pantallaCompletaSimulada = false;
    let eventosPlotlyInstalados = false;
    let botonRotarPantallaCompleta = null;
    let botonAnimarPantallaCompleta = null;
    let marcadorUbicacionSistema = null;
    let botonSalirFlotanteSistema = null;

    const trayectoria =
        grafica.trayectoria || {
            x: [],
            y: [],
            z: [],
        };

    const totalPuntos = Math.max(
        trayectoria.x?.length || 0,
        trayectoria.y?.length || 0,
        trayectoria.z?.length || 0
    );

    function camaraActual() {
        return {
            eye: {
                x:
                    1.7 *
                    Math.cos(anguloCamara),
                y:
                    1.7 *
                    Math.sin(anguloCamara),
                z: 1.12,
            },
            center: {
                x: 0,
                y: 0,
                z: 0,
            },
            up: {
                x: 0,
                y: 0,
                z: 1,
            },
        };
    }

    function coloresSuperficie(indice) {
        if (indice === 0) {
            return [
                [0, "#02070b"],
                [0.2, "#004c54"],
                [0.52, "#00c8ff"],
                [0.75, "#00f5d4"],
                [1, "#b8fff5"],
            ];
        }

        return [
            [0, "#09020d"],
            [0.2, "#4d0759"],
            [0.5, "#b026ff"],
            [0.78, "#ff2bd6"],
            [1, "#ffd2f6"],
        ];
    }

    function crearPlanoCero() {
        if (
            !Array.isArray(grafica.x) ||
            !Array.isArray(grafica.y)
        ) {
            return null;
        }

        const z = grafica.y.map(() =>
            grafica.x.map(() => 0)
        );

        return {
            x: grafica.x,
            y: grafica.y,
            z,
            type: "surface",
            name: "Plano z = 0",
            opacity: 0.16,
            showscale: false,
            hoverinfo: "skip",
            colorscale: [
                [0, "rgba(138, 255, 0, 0.12)"],
                [1, "rgba(138, 255, 0, 0.25)"],
            ],
            contours: {
                z: {
                    show: false,
                },
            },
        };
    }

    function crearSuperficies() {
        const trazos = [];

        if (
            grafica.tipo !== "superficies_2d" ||
            !Array.isArray(grafica.superficies)
        ) {
            return trazos;
        }

        grafica.superficies.forEach(
            (superficie, indice) => {
                const colorPrincipal =
                    indice === 0
                        ? COLORES.turquesa
                        : COLORES.rosa;

                trazos.push({
                    x: grafica.x,
                    y: grafica.y,
                    z: superficie.z,
                    type: "surface",
                    name:
                        `f${superficie.numero}(x, y)`,
                    opacity:
                        indice === 0
                            ? 0.72
                            : 0.62,
                    showscale: false,
                    colorscale:
                        coloresSuperficie(indice),
                    lighting: {
                        ambient: 0.72,
                        diffuse: 0.9,
                        fresnel: 0.35,
                        specular: 0.85,
                        roughness: 0.28,
                    },
                    lightposition: {
                        x: 100,
                        y: 80,
                        z: 180,
                    },
                    contours: {
                        z: {
                            show: true,
                            start: 0,
                            end: 0,
                            size: 1,
                            color: colorPrincipal,
                            width: 5,
                            project: {
                                z: true,
                            },
                        },
                    },
                    hovertemplate:
                        "x: %{x:.4f}<br>" +
                        "y: %{y:.4f}<br>" +
                        `f${superficie.numero}: ` +
                        "%{z:.4f}" +
                        "<extra></extra>",
                });
            }
        );

        const plano = crearPlanoCero();

        if (plano) {
            trazos.push(plano);
        }

        return trazos;
    }

    function crearTrayectoria(cantidad) {
        const limite = Math.max(
            1,
            Math.min(cantidad, totalPuntos)
        );

        const x =
            (trayectoria.x || []).slice(
                0,
                limite
            );

        const y =
            (trayectoria.y || []).slice(
                0,
                limite
            );

        const z =
            (trayectoria.z || []).slice(
                0,
                limite
            );

        const textos = x.map(
            (_, indice) =>
                indice === x.length - 1 &&
                limite === totalPuntos
                    ? "Solución aproximada"
                    : `Iteración ${indice}`
        );

        const nombreTrayectoria =
            grafica.tipo === "superficies_2d"
                ? "Trayectoria sobre z = 0"
                : "Trayectoria de aproximaciones";

        const trazos = [
            {
                x,
                y,
                z,
                type: "scatter3d",
                mode: "lines",
                name: "Resplandor",
                line: {
                    color:
                        "rgba(255, 43, 214, 0.22)",
                    width: 15,
                },
                hoverinfo: "skip",
                showlegend: false,
            },
            {
                x,
                y,
                z,
                type: "scatter3d",
                mode: "lines+markers",
                name: nombreTrayectoria,
                line: {
                    color: COLORES.rosa,
                    width: 7,
                },
                marker: {
                    color: x.map(
                        (_, indice) =>
                            indice === x.length - 1 &&
                            limite === totalPuntos
                                ? COLORES.verde
                                : COLORES.azul
                    ),
                    size: x.map(
                        (_, indice) =>
                            indice === x.length - 1 &&
                            limite === totalPuntos
                                ? 9
                                : 5
                    ),
                    line: {
                        color: COLORES.texto,
                        width: 1,
                    },
                },
                text: textos,
                hovertemplate:
                    "%{text}<br>" +
                    "x: %{x:.7f}<br>" +
                    "y: %{y:.7f}<br>" +
                    "z: %{z:.7f}" +
                    "<extra></extra>",
            },
        ];

        if (
            limite === totalPuntos &&
            grafica.solucion
        ) {
            trazos.push({
                x: [grafica.solucion.x],
                y: [grafica.solucion.y],
                z: [grafica.solucion.z],
                type: "scatter3d",
                mode: "markers+text",
                name: "Solución",
                text: ["Solución"],
                textposition: "top center",
                textfont: {
                    color: COLORES.verde,
                    size: 15,
                },
                marker: {
                    color:
                        "rgba(138, 255, 0, 0.22)",
                    size: 18,
                    line: {
                        color: COLORES.verde,
                        width: 4,
                    },
                },
                hovertemplate:
                    "Solución aproximada" +
                    "<extra></extra>",
            });
        }

        return trazos;
    }

    function obtenerTitulosEjes() {
        if (grafica.tipo === "superficies_2d") {
            return {
                x: variables[0] || "x",
                y: variables[1] || "y",
                z: "f(x, y)",
            };
        }

        const proyectadas =
            grafica.variables_proyectadas ||
            variables.slice(0, 3);

        return {
            x: proyectadas[0] || "x₁",
            y: proyectadas[1] || "x₂",
            z: proyectadas[2] || "x₃",
        };
    }

    function crearDiseno3D() {
        const titulos =
            obtenerTitulosEjes();

        return {
            autosize: true,
            paper_bgcolor: COLORES.fondo,
            font: {
                color: COLORES.texto,
                family:
                    "Inter, Arial, sans-serif",
            },
            margin: {
                t: 35,
                r: 20,
                b: 20,
                l: 20,
            },
            scene: {
                bgcolor: COLORES.panel,
                camera: camaraActual(),
                dragmode: "orbit",
                aspectmode: "cube",
                xaxis: {
                    title: {
                        text: titulos.x,
                        font: {
                            color:
                                COLORES.turquesa,
                        },
                    },
                    color: COLORES.texto,
                    gridcolor:
                        COLORES.cuadricula,
                    zerolinecolor:
                        COLORES.turquesa,
                    backgroundcolor: "#080410",
                    showbackground: true,
                },
                yaxis: {
                    title: {
                        text: titulos.y,
                        font: {
                            color: COLORES.rosa,
                        },
                    },
                    color: COLORES.texto,
                    gridcolor:
                        "rgba(255, 43, 214, 0.16)",
                    zerolinecolor:
                        COLORES.rosa,
                    backgroundcolor: "#090411",
                    showbackground: true,
                },
                zaxis: {
                    title: {
                        text: titulos.z,
                        font: {
                            color: COLORES.verde,
                        },
                    },
                    color: COLORES.texto,
                    gridcolor:
                        "rgba(138, 255, 0, 0.14)",
                    zerolinecolor:
                        COLORES.verde,
                    backgroundcolor: "#07040d",
                    showbackground: true,
                },
            },
            legend: {
                orientation: "h",
                x: 0,
                y: 1.04,
                bgcolor:
                    "rgba(0, 0, 0, 0)",
                font: {
                    color: COLORES.texto,
                },
            },
            hoverlabel: {
                bgcolor: "#170923",
                bordercolor:
                    COLORES.turquesa,
                font: {
                    color: COLORES.texto,
                },
            },
            uirevision:
                "raphsolve-sistema-3d",
        };
    }

    function dibujar3D(cantidad = totalPuntos) {
        const trazos = [
            ...crearSuperficies(),
            ...crearTrayectoria(cantidad),
        ];

        return Plotly.react(
            contenedor3D,
            trazos,
            crearDiseno3D(),
            configuracion
        );
    }

    function valorLogaritmico(valor) {
        const numero = Number(valor);

        if (
            !Number.isFinite(numero) ||
            numero <= 0
        ) {
            return 1e-16;
        }

        return Math.max(
            numero,
            1e-16
        );
    }

    function dibujarErrores() {
        const numeros =
            iteraciones.map(
                iteracion => iteracion.numero
            );

        const errores =
            iteraciones.map(
                iteracion =>
                    valorLogaritmico(
                        iteracion.error
                    )
            );

        const residuos =
            iteraciones.map(
                iteracion =>
                    valorLogaritmico(
                        iteracion.residuo
                    )
            );

        const trazos = [
            {
                x: numeros,
                y: errores,
                type: "scatter",
                mode: "lines+markers",
                name: "Error aproximado",
                line: {
                    color: COLORES.turquesa,
                    width: 4,
                },
                marker: {
                    color: COLORES.turquesa,
                    size: 8,
                },
                fill: "tozeroy",
                fillcolor:
                    "rgba(0, 245, 212, 0.08)",
                hovertemplate:
                    "Iteración %{x}<br>" +
                    "Error: %{y:.4e}" +
                    "<extra></extra>",
            },
            {
                x: numeros,
                y: residuos,
                type: "scatter",
                mode: "lines+markers",
                name: "Norma del residuo",
                line: {
                    color: COLORES.rosa,
                    width: 4,
                    dash: "dash",
                },
                marker: {
                    color: COLORES.rosa,
                    size: 8,
                },
                hovertemplate:
                    "Iteración %{x}<br>" +
                    "Residuo: %{y:.4e}" +
                    "<extra></extra>",
            },
        ];

        const diseno = {
            autosize: true,
            paper_bgcolor: COLORES.fondo,
            plot_bgcolor: COLORES.panel,
            font: {
                color: COLORES.texto,
                family:
                    "Inter, Arial, sans-serif",
            },
            margin: {
                t: 55,
                r: 35,
                b: 70,
                l: 85,
            },
            xaxis: {
                title: {
                    text: "Iteración",
                    font: {
                        color:
                            COLORES.turquesa,
                    },
                },
                color: COLORES.texto,
                gridcolor:
                    COLORES.cuadricula,
                zeroline: false,
                dtick: 1,
            },
            yaxis: {
                title: {
                    text:
                        "Magnitud (escala logarítmica)",
                    font: {
                        color: COLORES.rosa,
                    },
                },
                type: "log",
                color: COLORES.texto,
                gridcolor:
                    "rgba(176, 38, 255, 0.16)",
                zeroline: false,
            },
            legend: {
                orientation: "h",
                x: 0,
                y: 1.15,
                bgcolor:
                    "rgba(0, 0, 0, 0)",
            },
            hoverlabel: {
                bgcolor: "#170923",
                bordercolor:
                    COLORES.rosa,
                font: {
                    color: COLORES.texto,
                },
            },
            uirevision:
                "raphsolve-error-sistema",
        };

        return Plotly.react(
            contenedorError,
            trazos,
            diseno,
            configuracion
        );
    }

    function detenerRotacion() {
        if (temporizadorRotacion !== null) {
            clearInterval(
                temporizadorRotacion
            );

            temporizadorRotacion = null;
        }
    }

    function iniciarRotacion() {
        detenerRotacion();

        if (
            !rotacionActiva ||
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            return;
        }

        temporizadorRotacion =
            setInterval(() => {
                anguloCamara += 0.022;

                actualizandoCamaraAutomaticamente =
                    true;

                Promise.resolve(
                    Plotly.relayout(
                        contenedor3D,
                        {
                            "scene.camera":
                                camaraActual(),
                        }
                    )
                ).finally(() => {
                    actualizandoCamaraAutomaticamente =
                        false;
                });
            }, 90);
    }

    function actualizarBotonRotacion() {
        const textoRotacion =
            rotacionActiva
                ? "Rotación activa"
                : "Rotación detenida";

        botonRotar.classList.toggle(
            "activo",
            rotacionActiva
        );

        botonRotar.textContent =
            textoRotacion;

        if (
            botonRotarPantallaCompleta
        ) {
            botonRotarPantallaCompleta
                .classList.toggle(
                    "activo",
                    rotacionActiva
                );

            botonRotarPantallaCompleta
                .textContent =
                    textoRotacion;
        }
    }

    function detenerAnimacion() {
        if (
            temporizadorAnimacion !== null
        ) {
            clearInterval(
                temporizadorAnimacion
            );

            temporizadorAnimacion = null;
        }

        animando = false;
        botonAnimar.disabled = false;
    }

    botonRotar.addEventListener(
        "click",
        () => {
            rotacionActiva =
                !rotacionActiva;

            actualizarBotonRotacion();

            if (rotacionActiva) {
                iniciarRotacion();
            } else {
                detenerRotacion();
            }
        }
    );

    botonAnimar.addEventListener(
        "click",
        async () => {
            if (
                animando ||
                totalPuntos === 0
            ) {
                return;
            }

            detenerAnimacion();
            detenerRotacion();

            animando = true;
            botonAnimar.disabled = true;
            botonAnimar.textContent =
                "Animando...";

            let paso = 1;

            await dibujar3D(paso);

            temporizadorAnimacion =
                setInterval(async () => {
                    paso += 1;

                    await dibujar3D(paso);

                    if (
                        paso >= totalPuntos
                    ) {
                        detenerAnimacion();

                        botonAnimar.textContent =
                            "Repetir animación";

                        iniciarRotacion();
                    }
                }, 750);
        }
    );

    function detenerRotacionPorUsuario() {
        if (!rotacionActiva) {
            return;
        }

        rotacionActiva = false;
        detenerRotacion();
        actualizarBotonRotacion();
    }

    function crearControlesPantallaCompleta() {
        const controles =
            botonRotar.parentElement;

        let envoltura =
            document.getElementById(
                "envoltura-grafica-sistema-3d"
            );

        if (!envoltura) {
            envoltura =
                document.createElement("div");

            envoltura.id =
                "envoltura-grafica-sistema-3d";

            envoltura.className =
                "envoltura-grafica-sistema-3d";

            contenedor3D.parentNode.insertBefore(
                envoltura,
                contenedor3D
            );

            envoltura.appendChild(
                contenedor3D
            );
        }

        let botonPantalla =
            document.getElementById(
                "boton-pantalla-completa-sistema"
            );

        if (!botonPantalla) {
            botonPantalla =
                document.createElement("button");

            botonPantalla.id =
                "boton-pantalla-completa-sistema";

            botonPantalla.type = "button";

            botonPantalla.className =
                "btn boton-modo-grafica";

            botonPantalla.textContent =
                "Pantalla completa";

            botonPantalla.title =
                "Abrir la gráfica en pantalla completa";

            controles?.appendChild(
                botonPantalla
            );
        }

        let barra =
            document.getElementById(
                "barra-grafica-sistema-completa"
            );

        if (!barra) {
            barra =
                document.createElement("div");

            barra.id =
                "barra-grafica-sistema-completa";

            barra.className =
                "barra-grafica-sistema-completa";

            envoltura.insertBefore(
                barra,
                contenedor3D
            );
        }

        function crearBoton({
            id,
            texto,
            titulo,
            clase = "",
        }) {
            let boton =
                document.getElementById(id);

            if (!boton) {
                boton =
                    document.createElement(
                        "button"
                    );

                boton.id = id;
                boton.type = "button";

                boton.className =
                    `btn boton-control-grafica-completa ${clase}`
                        .trim();

                boton.textContent = texto;
                boton.title = titulo;

                barra.appendChild(
                    boton
                );
            }

            return boton;
        }

        botonRotarPantallaCompleta =
            crearBoton({
                id:
                    "rotar-grafica-sistema-completa",
                texto:
                    "Rotación activa",
                titulo:
                    "Activar o detener la rotación automática",
                clase:
                    "control-rotacion-completa",
            });

        botonAnimarPantallaCompleta =
            crearBoton({
                id:
                    "animar-grafica-sistema-completa",
                texto:
                    botonAnimar.textContent
                    || "Animar trayectoria",
                titulo:
                    "Reproducir la trayectoria de Newton",
            });

        const botonAcercar =
            crearBoton({
                id:
                    "acercar-grafica-sistema-completa",
                texto:
                    "Acercar +",
                titulo:
                    "Acercar la cámara",
            });

        const botonAlejar =
            crearBoton({
                id:
                    "alejar-grafica-sistema-completa",
                texto:
                    "Alejar −",
                titulo:
                    "Alejar la cámara",
            });

        const botonRestaurar =
            crearBoton({
                id:
                    "restaurar-grafica-sistema-completa",
                texto:
                    "Restaurar vista",
                titulo:
                    "Volver a la posición inicial",
            });

        const botonSalir =
            crearBoton({
                id:
                    "salir-pantalla-completa-sistema",
                texto:
                    "Salir",
                titulo:
                    "Salir de pantalla completa",
                clase:
                    "boton-salir-grafica-completa",
            });

        botonSalirFlotanteSistema =
            document.createElement(
                "button"
            );

        botonSalirFlotanteSistema.type =
            "button";

        botonSalirFlotanteSistema.className =
            "btn boton-salir-flotante-sistema";

        botonSalirFlotanteSistema.textContent =
            "Salir";

        botonSalirFlotanteSistema.setAttribute(
            "aria-label",
            "Salir de pantalla completa"
        );

        envoltura.appendChild(
            botonSalirFlotanteSistema
        );

        actualizarBotonRotacion();

        return {
            envoltura,
            barra,
            botonPantalla,
            botonRotarCompleta:
                botonRotarPantallaCompleta,
            botonAnimarCompleta:
                botonAnimarPantallaCompleta,
            botonAcercar,
            botonAlejar,
            botonRestaurar,
            botonSalir,
            botonSalirFlotante:
                botonSalirFlotanteSistema,
        };
    }

    function agregarEstilosPantallaCompleta() {
        if (
            document.getElementById(
                "estilos-grafica-sistema-completa"
            )
        ) {
            return;
        }

        const estilos =
            document.createElement("style");

        estilos.id =
            "estilos-grafica-sistema-completa";

        estilos.textContent = `
            .envoltura-grafica-sistema-3d {
                position: relative;
                width: 100%;
            }

            .barra-grafica-sistema-completa {
                display: none;
                flex: 0 0 auto;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 9px;
                padding: 10px 12px;
                background:
                    linear-gradient(
                        90deg,
                        rgba(10, 5, 20, 0.98),
                        rgba(25, 8, 40, 0.98),
                        rgba(10, 5, 20, 0.98)
                    );
                border: 1px solid
                    rgba(0, 245, 212, 0.34);
                border-radius: 13px;
                box-shadow:
                    0 0 18px
                    rgba(0, 245, 212, 0.12);
            }

            .boton-control-grafica-completa {
                min-height: 42px;
                padding: 8px 15px;
                color: #f8f4ff;
                font-size: 0.9rem;
                font-weight: 900;
                white-space: nowrap;
                background:
                    linear-gradient(
                        145deg,
                        rgba(29, 11, 48, 0.98),
                        rgba(8, 5, 16, 0.98)
                    );
                border: 1px solid
                    rgba(0, 245, 212, 0.38);
                border-radius: 10px;
                box-shadow:
                    0 0 10px
                    rgba(0, 245, 212, 0.08);
                transition:
                    transform 160ms ease,
                    border-color 160ms ease,
                    box-shadow 160ms ease;
            }

            .boton-control-grafica-completa:hover,
            .boton-control-grafica-completa:focus-visible {
                color: #ffffff;
                border-color: #ff2bd6;
                transform: translateY(-1px);
                box-shadow:
                    0 0 14px
                    rgba(255, 43, 214, 0.28);
            }

            .boton-control-grafica-completa.activo {
                color: #05030a;
                background:
                    linear-gradient(
                        90deg,
                        #00f5d4,
                        #8aff00
                    );
                border-color: transparent;
                box-shadow:
                    0 0 16px
                    rgba(0, 245, 212, 0.42);
            }

            .boton-control-grafica-completa:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            .boton-salir-flotante-sistema {
                display: none;
                position: fixed;
                top: max(
                    8px,
                    env(safe-area-inset-top)
                );
                right: max(
                    8px,
                    env(safe-area-inset-right)
                );
                z-index: 2147483647;
                min-width: 48px;
                min-height: 42px;
                padding: 7px 11px;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-size: 0.82rem;
                font-weight: 900;
                background:
                    linear-gradient(
                        90deg,
                        rgba(176, 38, 255, 0.98),
                        rgba(255, 43, 214, 0.98)
                    );
                border: 1px solid
                    rgba(255, 255, 255, 0.4);
                border-radius: 11px;
                box-shadow:
                    0 0 18px
                    rgba(255, 43, 214, 0.5);
            }

            .envoltura-grafica-sistema-3d:fullscreen
            .boton-salir-flotante-sistema,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            .boton-salir-flotante-sistema,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            .boton-salir-flotante-sistema {
                display: inline-flex;
            }

            .boton-salir-grafica-completa {
                order: -1;
                position: sticky;
                left: 0;
                z-index: 4;
            }

            .boton-salir-grafica-completa {
                color: #ffffff;
                background:
                    linear-gradient(
                        90deg,
                        rgba(176, 38, 255, 0.98),
                        rgba(255, 43, 214, 0.98)
                    );
                border-color:
                    rgba(255, 255, 255, 0.34);
                box-shadow:
                    0 0 16px
                    rgba(255, 43, 214, 0.34);
            }

            .envoltura-grafica-sistema-3d:fullscreen,
            .envoltura-grafica-sistema-3d:-webkit-full-screen,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada {
                display: flex;
                width: 100vw;
                height: 100vh;
                padding: 10px;
                gap: 9px;
                flex-direction: column;
                overflow: hidden;
                background: #05030a;
                border-radius: 0;
            }

            .envoltura-grafica-sistema-3d.pantalla-completa-simulada {
                position: fixed;
                inset: 0;
                z-index: 10000;
            }

            .envoltura-grafica-sistema-3d:fullscreen
            .barra-grafica-sistema-completa,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            .barra-grafica-sistema-completa,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            .barra-grafica-sistema-completa {
                display: flex;
            }

            .envoltura-grafica-sistema-3d:fullscreen
            #grafica-sistema-3d,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            #grafica-sistema-3d,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            #grafica-sistema-3d {
                flex: 1 1 auto;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                margin: 0 !important;
                border-radius: 12px;
            }

            .envoltura-grafica-sistema-3d:fullscreen
            .modebar-container,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            .modebar-container,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            .modebar-container {
                top: 10px !important;
                right: 10px !important;
            }

            .envoltura-grafica-sistema-3d:fullscreen
            .modebar,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            .modebar,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            .modebar {
                display: flex !important;
                gap: 4px;
                padding: 6px !important;
                background:
                    rgba(8, 5, 16, 0.9) !important;
                border: 1px solid
                    rgba(0, 245, 212, 0.36);
                border-radius: 10px;
                box-shadow:
                    0 0 14px
                    rgba(0, 245, 212, 0.16);
            }

            .envoltura-grafica-sistema-3d:fullscreen
            .modebar-btn,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            .modebar-btn,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            .modebar-btn {
                width: 32px !important;
                height: 32px !important;
                padding: 6px !important;
                border-radius: 7px;
            }

            .envoltura-grafica-sistema-3d:fullscreen
            .modebar-btn:hover,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            .modebar-btn:hover,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            .modebar-btn:hover {
                background:
                    rgba(255, 43, 214, 0.2) !important;
            }

            .envoltura-grafica-sistema-3d:fullscreen
            .modebar-btn svg,
            .envoltura-grafica-sistema-3d:-webkit-full-screen
            .modebar-btn svg,
            .envoltura-grafica-sistema-3d.pantalla-completa-simulada
            .modebar-btn svg {
                width: 20px !important;
                height: 20px !important;
                fill: #00f5d4 !important;
            }

            body.grafica-sistema-completa-activa {
                overflow: hidden;
            }

            @media (max-width: 820px) {
                .boton-salir-flotante-sistema {
                    top: max(
                        6px,
                        env(safe-area-inset-top)
                    );
                    right: max(
                        6px,
                        env(safe-area-inset-right)
                    );
                    min-width: 44px;
                    min-height: 38px;
                    padding: 5px 9px;
                    font-size: 0.75rem;
                }

                .barra-grafica-sistema-completa {
                    padding-right: 58px !important;
                }

                .envoltura-grafica-sistema-3d:fullscreen,
                .envoltura-grafica-sistema-3d:-webkit-full-screen,
                .envoltura-grafica-sistema-3d.pantalla-completa-simulada {
                    padding: 6px;
                    gap: 6px;
                }

                .barra-grafica-sistema-completa {
                    justify-content: flex-start;
                    gap: 6px;
                    padding: 7px;
                    overflow-x: auto;
                    flex-wrap: nowrap;
                    scrollbar-width: thin;
                }

                .boton-control-grafica-completa {
                    min-height: 38px;
                    padding: 7px 11px;
                    font-size: 0.78rem;
                }

                .envoltura-grafica-sistema-3d:fullscreen
                .modebar-container,
                .envoltura-grafica-sistema-3d:-webkit-full-screen
                .modebar-container,
                .envoltura-grafica-sistema-3d.pantalla-completa-simulada
                .modebar-container {
                    top: 6px !important;
                    right: 6px !important;
                }
            }
        `;

        document.head.appendChild(
            estilos
        );
    }


    function copiarCamara(
        camara
    ) {
        return JSON.parse(
            JSON.stringify(
                camara || camaraActual()
            )
        );
    }

    function obtenerCamaraGrafica() {
        const camaraLayout =
            contenedor3D.layout
            ?.scene
            ?.camera;

        const camaraCompleta =
            contenedor3D._fullLayout
            ?.scene
            ?.camera;

        return copiarCamara(
            camaraLayout
            || camaraCompleta
            || camaraActual()
        );
    }

    function aplicarCamara(
        camara
    ) {
        actualizandoCamaraAutomaticamente =
            true;

        return Promise.resolve(
            Plotly.relayout(
                contenedor3D,
                {
                    "scene.camera":
                        camara,
                }
            )
        ).finally(() => {
            actualizandoCamaraAutomaticamente =
                false;
        });
    }

    function ajustarZoom(
        factor
    ) {
        detenerRotacionPorUsuario();

        const camara =
            obtenerCamaraGrafica();

        if (!camara.eye) {
            camara.eye =
                camaraActual().eye;
        }

        const distanciaActual =
            Math.hypot(
                Number(camara.eye.x) || 0,
                Number(camara.eye.y) || 0,
                Number(camara.eye.z) || 0
            );

        const distanciaObjetivo =
            Math.min(
                8,
                Math.max(
                    0.45,
                    distanciaActual * factor
                )
            );

        const escala =
            distanciaActual > 0
                ? distanciaObjetivo
                    / distanciaActual
                : 1;

        camara.eye = {
            x:
                (Number(camara.eye.x) || 0)
                * escala,
            y:
                (Number(camara.eye.y) || 0)
                * escala,
            z:
                (Number(camara.eye.z) || 0)
                * escala,
        };

        aplicarCamara(
            camara
        );
    }

    function restaurarVistaGrafica() {
        detenerRotacionPorUsuario();
        anguloCamara = 0.75;

        aplicarCamara(
            camaraActual()
        );
    }

    function sincronizarBotonAnimacionCompleta() {
        if (
            !botonAnimarPantallaCompleta
        ) {
            return;
        }

        botonAnimarPantallaCompleta.textContent =
            botonAnimar.textContent
            || "Animar trayectoria";

        botonAnimarPantallaCompleta.disabled =
            botonAnimar.disabled;
    }

    function moverGraficaSistemaAlBody(
        envoltura
    ) {
        if (
            marcadorUbicacionSistema
            || envoltura.parentNode
                === document.body
        ) {
            return;
        }

        marcadorUbicacionSistema =
            document.createComment(
                "ubicacion-grafica-sistema-3d"
            );

        envoltura.parentNode.insertBefore(
            marcadorUbicacionSistema,
            envoltura
        );

        document.body.appendChild(
            envoltura
        );
    }

    function restaurarUbicacionGraficaSistema(
        envoltura
    ) {
        if (
            !marcadorUbicacionSistema
            || !marcadorUbicacionSistema.parentNode
        ) {
            marcadorUbicacionSistema = null;
            return;
        }

        marcadorUbicacionSistema.parentNode.insertBefore(
            envoltura,
            marcadorUbicacionSistema
        );

        marcadorUbicacionSistema.remove();
        marcadorUbicacionSistema = null;
    }

    function elementoEnPantallaCompleta(
        envoltura
    ) {
        return (
            document.fullscreenElement ===
                envoltura
            ||
            document.webkitFullscreenElement ===
                envoltura
            ||
            pantallaCompletaSimulada
        );
    }

    function redimensionarGrafica() {
        window.setTimeout(() => {
            Plotly.Plots.resize(
                contenedor3D
            );
        }, 80);

        window.setTimeout(() => {
            Plotly.Plots.resize(
                contenedor3D
            );
        }, 280);

        window.setTimeout(() => {
            Plotly.Plots.resize(
                contenedor3D
            );
        }, 620);
    }

    function actualizarBotonesPantallaCompleta(
        controlesPantalla
    ) {
        const activa =
            elementoEnPantallaCompleta(
                controlesPantalla.envoltura
            );

        controlesPantalla.botonPantalla.textContent =
            activa
                ? "Salir de pantalla completa"
                : "Pantalla completa";

        controlesPantalla.botonPantalla.classList.toggle(
            "activo",
            activa
        );

        document.body.classList.toggle(
            "grafica-sistema-completa-activa",
            activa
        );

        redimensionarGrafica();
    }

    async function abrirPantallaCompleta(
        controlesPantalla
    ) {
        detenerRotacion();

        try {
            if (
                controlesPantalla.envoltura
                    .requestFullscreen
            ) {
                await controlesPantalla.envoltura
                    .requestFullscreen();

            } else if (
                controlesPantalla.envoltura
                    .webkitRequestFullscreen
            ) {
                controlesPantalla.envoltura
                    .webkitRequestFullscreen();

            } else {
                pantallaCompletaSimulada = true;

                moverGraficaSistemaAlBody(
                    controlesPantalla.envoltura
                );

                controlesPantalla.envoltura
                    .classList.add(
                        "pantalla-completa-simulada"
                    );
            }
        } catch (error) {
            pantallaCompletaSimulada = true;

            moverGraficaSistemaAlBody(
                controlesPantalla.envoltura
            );

            controlesPantalla.envoltura
                .classList.add(
                    "pantalla-completa-simulada"
                );
        }

        actualizarBotonesPantallaCompleta(
            controlesPantalla
        );

        if (rotacionActiva) {
            iniciarRotacion();
        }
    }

    async function cerrarPantallaCompleta(
        controlesPantalla
    ) {
        if (
            document.fullscreenElement
            && document.exitFullscreen
        ) {
            await document.exitFullscreen();

        } else if (
            document.webkitFullscreenElement
            && document.webkitExitFullscreen
        ) {
            document.webkitExitFullscreen();
        }

        pantallaCompletaSimulada = false;

        controlesPantalla.envoltura
            .classList.remove(
                "pantalla-completa-simulada"
            );

        restaurarUbicacionGraficaSistema(
            controlesPantalla.envoltura
        );

        actualizarBotonesPantallaCompleta(
            controlesPantalla
        );

        if (rotacionActiva) {
            iniciarRotacion();
        }
    }

    function instalarInteraccionPlotly() {
        if (
            eventosPlotlyInstalados
            || typeof contenedor3D.on !==
                "function"
        ) {
            return;
        }

        eventosPlotlyInstalados = true;

        contenedor3D.on(
            "plotly_relayout",
            cambios => {
                if (
                    actualizandoCamaraAutomaticamente
                ) {
                    return;
                }

                const claves =
                    Object.keys(
                        cambios || {}
                    );

                const cambioCamara =
                    claves.some(
                        clave =>
                            clave.startsWith(
                                "scene.camera"
                            )
                    );

                if (cambioCamara) {
                    detenerRotacionPorUsuario();
                }
            }
        );
    }

    function instalarControlesInteractivos() {
        agregarEstilosPantallaCompleta();

        const controlesPantalla =
            crearControlesPantallaCompleta();

        const iniciarControlManual = () => {
            detenerRotacionPorUsuario();
        };

        controlesPantalla.botonRotarCompleta
            .addEventListener(
                "click",
                () => {
                    botonRotar.click();
                }
            );

        controlesPantalla.botonAnimarCompleta
            .addEventListener(
                "click",
                () => {
                    botonAnimar.click();
                    sincronizarBotonAnimacionCompleta();
                }
            );

        controlesPantalla.botonAcercar
            .addEventListener(
                "click",
                () => {
                    ajustarZoom(0.78);
                }
            );

        controlesPantalla.botonAlejar
            .addEventListener(
                "click",
                () => {
                    ajustarZoom(1.28);
                }
            );

        controlesPantalla.botonRestaurar
            .addEventListener(
                "click",
                restaurarVistaGrafica
            );

        const observadorAnimacion =
            new MutationObserver(
                sincronizarBotonAnimacionCompleta
            );

        observadorAnimacion.observe(
            botonAnimar,
            {
                childList: true,
                characterData: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "disabled",
                    "class",
                ],
            }
        );

        sincronizarBotonAnimacionCompleta();

        contenedor3D.addEventListener(
            "pointerdown",
            iniciarControlManual,
            {
                passive: true,
            }
        );

        contenedor3D.addEventListener(
            "wheel",
            iniciarControlManual,
            {
                passive: true,
            }
        );

        contenedor3D.addEventListener(
            "touchstart",
            iniciarControlManual,
            {
                passive: true,
            }
        );

        contenedor3D.addEventListener(
            "mouseenter",
            detenerRotacion
        );

        contenedor3D.addEventListener(
            "mouseleave",
            () => {
                if (rotacionActiva) {
                    iniciarRotacion();
                }
            }
        );

        controlesPantalla.botonPantalla
            .addEventListener(
                "click",
                () => {
                    if (
                        elementoEnPantallaCompleta(
                            controlesPantalla
                                .envoltura
                        )
                    ) {
                        cerrarPantallaCompleta(
                            controlesPantalla
                        );
                    } else {
                        abrirPantallaCompleta(
                            controlesPantalla
                        );
                    }
                }
            );

        controlesPantalla.botonSalir
            .addEventListener(
                "click",
                () => {
                    cerrarPantallaCompleta(
                        controlesPantalla
                    );
                }
            );

        controlesPantalla.botonSalirFlotante
            .addEventListener(
                "click",
                () => {
                    cerrarPantallaCompleta(
                        controlesPantalla
                    );
                }
            );

        const cambioPantalla = () => {
            if (
                !document.fullscreenElement
                && !document
                    .webkitFullscreenElement
                && !pantallaCompletaSimulada
            ) {
                controlesPantalla.envoltura
                    .classList.remove(
                        "pantalla-completa-simulada"
                    );
            }

            actualizarBotonesPantallaCompleta(
                controlesPantalla
            );
        };

        document.addEventListener(
            "fullscreenchange",
            cambioPantalla
        );

        document.addEventListener(
            "webkitfullscreenchange",
            cambioPantalla
        );

        document.addEventListener(
            "keydown",
            evento => {
                if (
                    evento.key === "Escape"
                    && pantallaCompletaSimulada
                ) {
                    cerrarPantallaCompleta(
                        controlesPantalla
                    );
                }
            }
        );

        window.addEventListener(
            "resize",
            redimensionarGrafica
        );
    }

    window.addEventListener(
        "beforeunload",
        () => {
            detenerRotacion();
            detenerAnimacion();
        }
    );

    async function inicializarGraficas() {
        await Promise.all([
            dibujar3D(),
            dibujarErrores(),
        ]);

        instalarInteraccionPlotly();
        instalarControlesInteractivos();
        actualizarBotonRotacion();
        iniciarRotacion();
    }

    inicializarGraficas();
});