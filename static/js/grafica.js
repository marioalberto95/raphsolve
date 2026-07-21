document.addEventListener("DOMContentLoaded", () => {
    const elementoDatos =
        document.getElementById("datos-grafica");

    const grafica2D =
        document.getElementById("grafica-newton-2d");

    const grafica3D =
        document.getElementById("grafica-newton-3d");

    const boton2D =
        document.getElementById("modo-grafica-2d");

    const boton3D =
        document.getElementById("modo-grafica-3d");

    const botonAnimar =
        document.getElementById("boton-animar");

    if (
        !elementoDatos ||
        !grafica2D ||
        !grafica3D ||
        !boton2D ||
        !boton3D ||
        !botonAnimar
    ) {
        return;
    }

    let datos;

    try {
        datos = JSON.parse(
            elementoDatos.textContent
        );
    } catch (error) {
        grafica2D.innerHTML = `
            <div class="alert alert-danger">
                No fue posible cargar los datos de la gráfica.
            </div>
        `;

        botonAnimar.disabled = true;
        return;
    }

    if (
        !Array.isArray(datos.iteraciones) ||
        datos.iteraciones.length === 0
    ) {
        grafica2D.innerHTML = `
            <div class="alert alert-warning">
                No hay iteraciones disponibles para mostrar.
            </div>
        `;

        botonAnimar.disabled = true;
        boton2D.disabled = true;
        boton3D.disabled = true;
        return;
    }

    const COLORES = {
        fondo: "#05030a",
        panel: "#0b0614",
        texto: "#f8f4ff",
        secundario: "#c9bdd8",
        turquesa: "#00f5d4",
        turquesaSuave: "rgba(0, 245, 212, 0.18)",
        rosa: "#ff2bd6",
        rosaSuave: "rgba(255, 43, 214, 0.18)",
        morado: "#b026ff",
        verde: "#8aff00",
        azul: "#00c8ff",
        lineaIteracion: "#ff80d9",
        cuadricula: "rgba(0, 245, 212, 0.15)",
        eje: "rgba(248, 244, 255, 0.7)",
    };

    const configuracion = {
        responsive: true,
        displaylogo: false,
        displayModeBar: true,
        scrollZoom: true,
        doubleClick: "reset+autosize",
        showTips: true,
        modeBarButtonsToRemove: [
            "lasso2d",
            "select2d",
        ],
    };

    const cantidadTotal =
        datos.iteraciones.length;

    let modoActual = "2d";
    let temporizador = null;
    let temporizadorCamara = null;
    let animando = false;
    let anguloCamara = 0.7;
    let rotacionActiva = true;
    let actualizacionesCamara = 0;
    let eventos3DInstalados = false;
    let pantallaCompletaSimulada = false;

    let botonPantallaCompleta = null;
    let botonRotarCompleto = null;
    let botonAnimarCompleto = null;
    let envoltura3D = null;
    let barraCompleta = null;

    function obtenerRangoX() {
        if (
            Array.isArray(datos.rango_x) &&
            datos.rango_x.length === 2
        ) {
            return datos.rango_x;
        }

        const valores = datos.x.filter(
            valor => Number.isFinite(Number(valor))
        );

        return [
            Math.min(...valores),
            Math.max(...valores),
        ];
    }

    function obtenerRangoY() {
        if (
            Array.isArray(datos.rango_y) &&
            datos.rango_y.length === 2
        ) {
            return datos.rango_y;
        }

        const valores = datos.y.filter(
            valor => Number.isFinite(Number(valor))
        );

        return [
            Math.min(...valores),
            Math.max(...valores),
        ];
    }

    function crearTrazos2D(cantidad) {
        const trazos = [];

        trazos.push({
            x: datos.x,
            y: datos.y,
            type: "scatter",
            mode: "lines",
            name: "Brillo de f(x)",
            line: {
                color: COLORES.turquesaSuave,
                width: 13,
            },
            hoverinfo: "skip",
            showlegend: false,
        });

        trazos.push({
            x: datos.x,
            y: datos.y,
            type: "scatter",
            mode: "lines",
            name: "f(x)",
            line: {
                color: COLORES.turquesa,
                width: 4,
            },
            hovertemplate:
                "x: %{x:.6f}<br>" +
                "f(x): %{y:.6f}" +
                "<extra>f(x)</extra>",
        });

        datos.iteraciones
            .slice(0, cantidad)
            .forEach((iteracion, indice) => {
                trazos.push({
                    x: iteracion.tangente_x,
                    y: iteracion.tangente_y,
                    type: "scatter",
                    mode: "lines",
                    line: {
                        color: COLORES.rosaSuave,
                        width: 10,
                    },
                    hoverinfo: "skip",
                    showlegend: false,
                });

                trazos.push({
                    x: iteracion.tangente_x,
                    y: iteracion.tangente_y,
                    type: "scatter",
                    mode: "lines",
                    name: `Tangente ${indice + 1}`,
                    line: {
                        color: COLORES.rosa,
                        width: 3,
                        dash: "dash",
                    },
                    hovertemplate:
                        `Tangente ${indice + 1}` +
                        "<extra></extra>",
                    showlegend: indice === 0,
                });

                trazos.push({
                    x: [
                        iteracion.x_actual,
                        iteracion.x_siguiente,
                    ],
                    y: [
                        iteracion.fx,
                        0,
                    ],
                    type: "scatter",
                    mode: "lines+markers",
                    name: `Iteración ${indice + 1}`,
                    line: {
                        color: COLORES.lineaIteracion,
                        width: 3,
                    },
                    marker: {
                        color: [
                            COLORES.azul,
                            COLORES.verde,
                        ],
                        size: 11,
                        line: {
                            color: COLORES.texto,
                            width: 1,
                        },
                    },
                    text: [
                        `x actual: ${Number(
                            iteracion.x_actual
                        ).toFixed(6)}`,

                        `x siguiente: ${Number(
                            iteracion.x_siguiente
                        ).toFixed(6)}`,
                    ],
                    hovertemplate:
                        "%{text}<extra></extra>",
                    showlegend: false,
                });
            });

        if (
            datos.convergio === true &&
            datos.raiz !== null &&
            cantidad === cantidadTotal
        ) {
            trazos.push({
                x: [datos.raiz],
                y: [0],
                type: "scatter",
                mode: "markers",
                marker: {
                    color: "rgba(138, 255, 0, 0.22)",
                    size: 34,
                    line: {
                        width: 0,
                    },
                },
                hoverinfo: "skip",
                showlegend: false,
            });

            trazos.push({
                x: [datos.raiz],
                y: [0],
                type: "scatter",
                mode: "markers+text",
                name: "Raíz",
                text: ["Raíz"],
                textposition: "top center",
                textfont: {
                    color: COLORES.verde,
                    size: 14,
                },
                marker: {
                    color: COLORES.verde,
                    size: 16,
                    line: {
                        color: COLORES.texto,
                        width: 2,
                    },
                },
                hovertemplate:
                    `Raíz aproximada: ${Number(
                        datos.raiz
                    ).toFixed(8)}` +
                    "<extra></extra>",
            });
        }

        return trazos;
    }

    function crearDiseno2D() {
        return {
            autosize: true,
            paper_bgcolor: COLORES.fondo,
            plot_bgcolor: COLORES.panel,

            font: {
                color: COLORES.texto,
                family: "Inter, Arial, sans-serif",
            },

            margin: {
                t: 50,
                r: 35,
                b: 70,
                l: 80,
            },

            xaxis: {
                title: {
                    text: "x",
                    font: {
                        color: COLORES.turquesa,
                    },
                },
                range: obtenerRangoX(),
                autorange: false,
                color: COLORES.texto,
                gridcolor: COLORES.cuadricula,
                zeroline: true,
                zerolinecolor: COLORES.turquesa,
                zerolinewidth: 2,
                linecolor: COLORES.morado,
                mirror: true,
            },

            yaxis: {
                title: {
                    text: "f(x)",
                    font: {
                        color: COLORES.rosa,
                    },
                },
                range: obtenerRangoY(),
                autorange: false,
                color: COLORES.texto,
                gridcolor: COLORES.cuadricula,
                zeroline: true,
                zerolinecolor: COLORES.turquesa,
                zerolinewidth: 2,
                linecolor: COLORES.morado,
                mirror: true,
            },

            legend: {
                orientation: "h",
                x: 0,
                y: 1.13,
                font: {
                    color: COLORES.texto,
                },
                bgcolor: "rgba(0, 0, 0, 0)",
            },

            hoverlabel: {
                bgcolor: "#170923",
                bordercolor: COLORES.turquesa,
                font: {
                    color: COLORES.texto,
                },
            },

            transition: {
                duration: 450,
                easing: "cubic-in-out",
            },

            uirevision: "grafica-neon-2d",
        };
    }

    function crearTrazos3D(cantidad) {
        const trazos = [];

        const profundidadFuncion =
            datos.x.map(() => 0);

        trazos.push({
            x: datos.x,
            y: profundidadFuncion,
            z: datos.y,
            type: "scatter3d",
            mode: "lines",
            name: "Brillo de f(x)",
            line: {
                color: "rgba(0, 245, 212, 0.18)",
                width: 14,
            },
            hoverinfo: "skip",
            showlegend: false,
        });

        trazos.push({
            x: datos.x,
            y: profundidadFuncion,
            z: datos.y,
            type: "scatter3d",
            mode: "lines",
            name: "f(x)",
            line: {
                color: COLORES.turquesa,
                width: 6,
            },
            hovertemplate:
                "x: %{x:.6f}<br>" +
                "f(x): %{z:.6f}<br>" +
                "Plano base" +
                "<extra>f(x)</extra>",
        });

        datos.iteraciones
            .slice(0, cantidad)
            .forEach((iteracion, indice) => {
                const profundidad =
                    (indice + 1) * 0.35;

                trazos.push({
                    x: iteracion.tangente_x,
                    y: [
                        profundidad,
                        profundidad,
                    ],
                    z: iteracion.tangente_y,
                    type: "scatter3d",
                    mode: "lines",
                    line: {
                        color: "rgba(255, 43, 214, 0.2)",
                        width: 12,
                    },
                    hoverinfo: "skip",
                    showlegend: false,
                });

                trazos.push({
                    x: iteracion.tangente_x,
                    y: [
                        profundidad,
                        profundidad,
                    ],
                    z: iteracion.tangente_y,
                    type: "scatter3d",
                    mode: "lines",
                    name: `Tangente ${indice + 1}`,
                    line: {
                        color: COLORES.rosa,
                        width: 5,
                        dash: "dash",
                    },
                    hovertemplate:
                        `Tangente ${indice + 1}` +
                        "<br>Profundidad: %{y:.2f}" +
                        "<extra></extra>",
                    showlegend: indice === 0,
                });

                trazos.push({
                    x: [
                        iteracion.x_actual,
                        iteracion.x_siguiente,
                    ],
                    y: [
                        profundidad,
                        profundidad,
                    ],
                    z: [
                        iteracion.fx,
                        0,
                    ],
                    type: "scatter3d",
                    mode: "lines+markers",
                    line: {
                        color: COLORES.lineaIteracion,
                        width: 5,
                    },
                    marker: {
                        color: [
                            COLORES.azul,
                            COLORES.verde,
                        ],
                        size: 6,
                        line: {
                            color: COLORES.texto,
                            width: 1,
                        },
                    },
                    text: [
                        `x actual: ${Number(
                            iteracion.x_actual
                        ).toFixed(6)}`,

                        `x siguiente: ${Number(
                            iteracion.x_siguiente
                        ).toFixed(6)}`,
                    ],
                    hovertemplate:
                        "%{text}<br>" +
                        `Iteración ${indice + 1}` +
                        "<extra></extra>",
                    showlegend: false,
                });
            });

        if (
            datos.convergio === true &&
            datos.raiz !== null &&
            cantidad === cantidadTotal
        ) {
            trazos.push({
                x: [datos.raiz],
                y: [0],
                z: [0],
                type: "scatter3d",
                mode: "markers+text",
                name: "Raíz",
                text: ["Raíz"],
                textposition: "top center",
                textfont: {
                    color: COLORES.verde,
                    size: 15,
                },
                marker: {
                    color: COLORES.verde,
                    size: 10,
                    opacity: 1,
                    line: {
                        color: COLORES.texto,
                        width: 2,
                    },
                },
                hovertemplate:
                    `Raíz aproximada: ${Number(
                        datos.raiz
                    ).toFixed(8)}` +
                    "<extra></extra>",
            });
        }

        return trazos;
    }

    function obtenerCamara() {
        return {
            eye: {
                x: 1.65 * Math.cos(anguloCamara),
                y: 1.65 * Math.sin(anguloCamara),
                z: 1.15,
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

    function crearDiseno3D() {
        const profundidadMaxima = Math.max(
            1.5,
            cantidadTotal * 0.35 + 0.5
        );

        return {
            autosize: true,
            paper_bgcolor: COLORES.fondo,

            font: {
                color: COLORES.texto,
                family: "Inter, Arial, sans-serif",
            },

            margin: {
                t: 25,
                r: 20,
                b: 25,
                l: 20,
            },

            scene: {
                bgcolor: COLORES.panel,
                dragmode: "orbit",

                xaxis: {
                    title: {
                        text: "x",
                        font: {
                            color: COLORES.turquesa,
                        },
                    },
                    range: obtenerRangoX(),
                    color: COLORES.texto,
                    gridcolor: COLORES.cuadricula,
                    zerolinecolor: COLORES.turquesa,
                    backgroundcolor: "#090511",
                    showbackground: true,
                },

                yaxis: {
                    title: {
                        text: "Iteración",
                        font: {
                            color: COLORES.morado,
                        },
                    },
                    range: [
                        0,
                        profundidadMaxima,
                    ],
                    color: COLORES.texto,
                    gridcolor:
                        "rgba(176, 38, 255, 0.2)",
                    zerolinecolor: COLORES.morado,
                    backgroundcolor: "#080410",
                    showbackground: true,
                },

                zaxis: {
                    title: {
                        text: "f(x)",
                        font: {
                            color: COLORES.rosa,
                        },
                    },
                    range: obtenerRangoY(),
                    color: COLORES.texto,
                    gridcolor:
                        "rgba(255, 43, 214, 0.17)",
                    zerolinecolor: COLORES.rosa,
                    backgroundcolor: "#07040d",
                    showbackground: true,
                },

                camera: obtenerCamara(),

                aspectmode: "manual",

                aspectratio: {
                    x: 1.55,
                    y: 0.9,
                    z: 1,
                },
            },

            legend: {
                orientation: "h",
                x: 0,
                y: 1.05,
                font: {
                    color: COLORES.texto,
                },
                bgcolor: "rgba(0, 0, 0, 0)",
            },

            hoverlabel: {
                bgcolor: "#170923",
                bordercolor: COLORES.rosa,
                font: {
                    color: COLORES.texto,
                },
            },

            uirevision: "grafica-neon-3d",
        };
    }

    function dibujar2D(cantidad) {
        return Plotly.react(
            grafica2D,
            crearTrazos2D(cantidad),
            crearDiseno2D(),
            configuracion
        );
    }

    function dibujar3D(cantidad) {
        return Plotly.react(
            grafica3D,
            crearTrazos3D(cantidad),
            crearDiseno3D(),
            configuracion
        );
    }

    function dibujar(cantidad) {
        if (modoActual === "3d") {
            return dibujar3D(cantidad);
        }

        return dibujar2D(cantidad);
    }

    function detenerRotacion() {
        if (temporizadorCamara !== null) {
            clearInterval(temporizadorCamara);
            temporizadorCamara = null;
        }
    }

    function actualizarBotonRotacionCompleta() {
        if (!botonRotarCompleto) {
            return;
        }

        botonRotarCompleto.classList.toggle(
            "activo",
            rotacionActiva
        );

        botonRotarCompleto.textContent =
            rotacionActiva
                ? "Rotación activa"
                : "Rotación detenida";
    }

    function detenerRotacionPorUsuario() {
        if (!rotacionActiva) {
            return;
        }

        rotacionActiva = false;
        detenerRotacion();
        actualizarBotonRotacionCompleta();
    }

    function iniciarRotacion() {
        detenerRotacion();

        const reducirMovimiento =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

        if (
            reducirMovimiento ||
            modoActual !== "3d" ||
            !rotacionActiva
        ) {
            return;
        }

        temporizadorCamara = setInterval(() => {
            if (
                modoActual !== "3d" ||
                !rotacionActiva
            ) {
                detenerRotacion();
                return;
            }

            anguloCamara += 0.025;
            actualizacionesCamara += 1;

            Promise.resolve(
                Plotly.relayout(
                    grafica3D,
                    {
                        "scene.camera":
                            obtenerCamara(),
                    }
                )
            ).finally(() => {
                actualizacionesCamara =
                    Math.max(
                        0,
                        actualizacionesCamara - 1
                    );
            });
        }, 90);
    }

    function sincronizarBotonAnimacionCompleta() {
        if (!botonAnimarCompleto) {
            return;
        }

        botonAnimarCompleto.textContent =
            botonAnimar.textContent;

        botonAnimarCompleto.disabled =
            botonAnimar.disabled;
    }

    function detenerAnimacion() {
        if (temporizador !== null) {
            clearInterval(temporizador);
            temporizador = null;
        }

        animando = false;
        botonAnimar.disabled = false;
        botonAnimar.textContent = "Reproducir";
        sincronizarBotonAnimacionCompleta();
    }

    function actualizarBotonesModo() {
        boton2D.classList.toggle(
            "activo",
            modoActual === "2d"
        );

        boton3D.classList.toggle(
            "activo",
            modoActual === "3d"
        );
    }

    async function cambiarModo(nuevoModo) {
        if (modoActual === nuevoModo) {
            return;
        }

        detenerAnimacion();
        detenerRotacion();

        modoActual = nuevoModo;
        actualizarBotonesModo();

        if (modoActual === "3d") {
            grafica2D.classList.add("d-none");

            if (envoltura3D) {
                envoltura3D.classList.remove(
                    "d-none"
                );
            }

            botonPantallaCompleta?.classList.remove(
                "d-none"
            );

            await dibujar3D(cantidadTotal);

            instalarEventosInteraccion3D();
            Plotly.Plots.resize(grafica3D);
            iniciarRotacion();

        } else {
            if (
                envoltura3D &&
                elementoEnPantallaCompleta()
            ) {
                await cerrarPantallaCompleta();
            }

            envoltura3D?.classList.add(
                "d-none"
            );

            botonPantallaCompleta?.classList.add(
                "d-none"
            );

            grafica2D.classList.remove("d-none");

            await dibujar2D(cantidadTotal);

            Plotly.Plots.resize(grafica2D);
        }
    }


    function agregarEstilosPantallaCompleta() {
        if (
            document.getElementById(
                "estilos-grafica-newton-completa"
            )
        ) {
            return;
        }

        const estilos =
            document.createElement("style");

        estilos.id =
            "estilos-grafica-newton-completa";

        estilos.textContent = `
            .envoltura-grafica-newton-3d {
                position: relative;
                width: 100%;
            }

            .barra-grafica-newton-completa {
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

            .boton-control-newton-completo {
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

            .boton-control-newton-completo:hover,
            .boton-control-newton-completo:focus-visible {
                color: #ffffff;
                border-color: #ff2bd6;
                transform: translateY(-1px);
                box-shadow:
                    0 0 14px
                    rgba(255, 43, 214, 0.28);
            }

            .boton-control-newton-completo.activo {
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

            .boton-control-newton-completo:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            .boton-salir-newton-completo {
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

            .envoltura-grafica-newton-3d:fullscreen,
            .envoltura-grafica-newton-3d:-webkit-full-screen,
            .envoltura-grafica-newton-3d.pantalla-completa-simulada {
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

            .envoltura-grafica-newton-3d.pantalla-completa-simulada {
                position: fixed;
                inset: 0;
                z-index: 10000;
            }

            .envoltura-grafica-newton-3d:fullscreen
            .barra-grafica-newton-completa,
            .envoltura-grafica-newton-3d:-webkit-full-screen
            .barra-grafica-newton-completa,
            .envoltura-grafica-newton-3d.pantalla-completa-simulada
            .barra-grafica-newton-completa {
                display: flex;
            }

            .envoltura-grafica-newton-3d:fullscreen
            #grafica-newton-3d,
            .envoltura-grafica-newton-3d:-webkit-full-screen
            #grafica-newton-3d,
            .envoltura-grafica-newton-3d.pantalla-completa-simulada
            #grafica-newton-3d {
                flex: 1 1 auto;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                margin: 0 !important;
                border-radius: 12px;
            }

            .envoltura-grafica-newton-3d:fullscreen
            .modebar-container,
            .envoltura-grafica-newton-3d:-webkit-full-screen
            .modebar-container,
            .envoltura-grafica-newton-3d.pantalla-completa-simulada
            .modebar-container {
                top: 10px !important;
                right: 10px !important;
            }

            .envoltura-grafica-newton-3d:fullscreen
            .modebar,
            .envoltura-grafica-newton-3d:-webkit-full-screen
            .modebar,
            .envoltura-grafica-newton-3d.pantalla-completa-simulada
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

            .envoltura-grafica-newton-3d:fullscreen
            .modebar-btn,
            .envoltura-grafica-newton-3d:-webkit-full-screen
            .modebar-btn,
            .envoltura-grafica-newton-3d.pantalla-completa-simulada
            .modebar-btn {
                width: 32px !important;
                height: 32px !important;
                padding: 6px !important;
                border-radius: 7px;
            }

            .envoltura-grafica-newton-3d:fullscreen
            .modebar-btn svg,
            .envoltura-grafica-newton-3d:-webkit-full-screen
            .modebar-btn svg,
            .envoltura-grafica-newton-3d.pantalla-completa-simulada
            .modebar-btn svg {
                width: 20px !important;
                height: 20px !important;
                fill: #00f5d4 !important;
            }

            body.grafica-newton-completa-activa {
                overflow: hidden;
            }

            @media (max-width: 820px) {
                .envoltura-grafica-newton-3d:fullscreen,
                .envoltura-grafica-newton-3d:-webkit-full-screen,
                .envoltura-grafica-newton-3d.pantalla-completa-simulada {
                    padding: 6px;
                    gap: 6px;
                }

                .barra-grafica-newton-completa {
                    justify-content: flex-start;
                    gap: 6px;
                    padding: 7px;
                    overflow-x: auto;
                    flex-wrap: nowrap;
                    scrollbar-width: thin;
                }

                .boton-control-newton-completo {
                    min-height: 38px;
                    padding: 7px 11px;
                    font-size: 0.78rem;
                }
            }
        `;

        document.head.appendChild(estilos);
    }

    function crearBotonCompleto({
        id,
        texto,
        titulo,
        clase = "",
    }) {
        const boton =
            document.createElement("button");

        boton.id = id;
        boton.type = "button";

        boton.className =
            `btn boton-control-newton-completo ${clase}`
                .trim();

        boton.textContent = texto;
        boton.title = titulo;

        barraCompleta.appendChild(boton);

        return boton;
    }

    function prepararPantallaCompleta() {
        agregarEstilosPantallaCompleta();

        envoltura3D =
            document.createElement("div");

        envoltura3D.id =
            "envoltura-grafica-newton-3d";

        envoltura3D.className =
            "envoltura-grafica-newton-3d d-none";

        grafica3D.parentNode.insertBefore(
            envoltura3D,
            grafica3D
        );

        grafica3D.classList.remove("d-none");
        envoltura3D.appendChild(grafica3D);

        barraCompleta =
            document.createElement("div");

        barraCompleta.className =
            "barra-grafica-newton-completa";

        envoltura3D.insertBefore(
            barraCompleta,
            grafica3D
        );

        botonRotarCompleto =
            crearBotonCompleto({
                id:
                    "rotar-grafica-newton-completa",
                texto:
                    "Rotación activa",
                titulo:
                    "Activar o detener la rotación automática",
            });

        botonAnimarCompleto =
            crearBotonCompleto({
                id:
                    "animar-grafica-newton-completa",
                texto:
                    "Reproducir",
                titulo:
                    "Reproducir las iteraciones",
            });

        const botonAcercar =
            crearBotonCompleto({
                id:
                    "acercar-grafica-newton-completa",
                texto:
                    "Acercar +",
                titulo:
                    "Acercar la cámara",
            });

        const botonAlejar =
            crearBotonCompleto({
                id:
                    "alejar-grafica-newton-completa",
                texto:
                    "Alejar −",
                titulo:
                    "Alejar la cámara",
            });

        const botonRestaurar =
            crearBotonCompleto({
                id:
                    "restaurar-grafica-newton-completa",
                texto:
                    "Restaurar vista",
                titulo:
                    "Volver a la posición inicial",
            });

        const botonSalir =
            crearBotonCompleto({
                id:
                    "salir-grafica-newton-completa",
                texto:
                    "Salir",
                titulo:
                    "Salir de pantalla completa",
                clase:
                    "boton-salir-newton-completo",
            });

        botonPantallaCompleta =
            document.createElement("button");

        botonPantallaCompleta.id =
            "pantalla-completa-grafica-newton";

        botonPantallaCompleta.type =
            "button";

        botonPantallaCompleta.className =
            "btn boton-modo-grafica d-none";

        botonPantallaCompleta.textContent =
            "Pantalla completa";

        boton3D.parentElement.appendChild(
            botonPantallaCompleta
        );

        botonRotarCompleto.addEventListener(
            "click",
            () => {
                rotacionActiva =
                    !rotacionActiva;

                actualizarBotonRotacionCompleta();

                if (rotacionActiva) {
                    iniciarRotacion();
                } else {
                    detenerRotacion();
                }
            }
        );

        botonAnimarCompleto.addEventListener(
            "click",
            () => {
                botonAnimar.click();
            }
        );

        botonAcercar.addEventListener(
            "click",
            () => ajustarZoom(0.78)
        );

        botonAlejar.addEventListener(
            "click",
            () => ajustarZoom(1.28)
        );

        botonRestaurar.addEventListener(
            "click",
            restaurarVista
        );

        botonSalir.addEventListener(
            "click",
            cerrarPantallaCompleta
        );

        botonPantallaCompleta.addEventListener(
            "click",
            () => {
                if (
                    elementoEnPantallaCompleta()
                ) {
                    cerrarPantallaCompleta();
                } else {
                    abrirPantallaCompleta();
                }
            }
        );

        document.addEventListener(
            "fullscreenchange",
            actualizarEstadoPantallaCompleta
        );

        document.addEventListener(
            "webkitfullscreenchange",
            actualizarEstadoPantallaCompleta
        );

        document.addEventListener(
            "keydown",
            evento => {
                if (
                    evento.key === "Escape"
                    && pantallaCompletaSimulada
                ) {
                    cerrarPantallaCompleta();
                }
            }
        );

        window.addEventListener(
            "resize",
            redimensionar3D
        );

        actualizarBotonRotacionCompleta();
        sincronizarBotonAnimacionCompleta();
    }

    function obtenerCamaraActual() {
        const camara =
            grafica3D.layout?.scene?.camera
            || grafica3D._fullLayout
                ?.scene
                ?.camera
            || obtenerCamara();

        return JSON.parse(
            JSON.stringify(camara)
        );
    }

    function aplicarCamara(camara) {
        actualizacionesCamara += 1;

        return Promise.resolve(
            Plotly.relayout(
                grafica3D,
                {
                    "scene.camera": camara,
                }
            )
        ).finally(() => {
            actualizacionesCamara =
                Math.max(
                    0,
                    actualizacionesCamara - 1
                );
        });
    }

    function ajustarZoom(factor) {
        detenerRotacionPorUsuario();

        const camara =
            obtenerCamaraActual();

        const ojo =
            camara.eye || obtenerCamara().eye;

        const distancia =
            Math.hypot(
                Number(ojo.x) || 0,
                Number(ojo.y) || 0,
                Number(ojo.z) || 0
            );

        const nuevaDistancia =
            Math.min(
                8,
                Math.max(
                    0.45,
                    distancia * factor
                )
            );

        const escala =
            distancia > 0
                ? nuevaDistancia / distancia
                : 1;

        camara.eye = {
            x:
                (Number(ojo.x) || 0)
                * escala,
            y:
                (Number(ojo.y) || 0)
                * escala,
            z:
                (Number(ojo.z) || 0)
                * escala,
        };

        aplicarCamara(camara);
    }

    function restaurarVista() {
        detenerRotacionPorUsuario();
        anguloCamara = 0.7;
        aplicarCamara(obtenerCamara());
    }

    function instalarEventosInteraccion3D() {
        if (
            eventos3DInstalados ||
            typeof grafica3D.on !== "function"
        ) {
            return;
        }

        eventos3DInstalados = true;

        const controlManual = () => {
            detenerRotacionPorUsuario();
        };

        grafica3D.addEventListener(
            "pointerdown",
            controlManual,
            { passive: true }
        );

        grafica3D.addEventListener(
            "wheel",
            controlManual,
            { passive: true }
        );

        grafica3D.addEventListener(
            "touchstart",
            controlManual,
            { passive: true }
        );

        grafica3D.addEventListener(
            "mouseenter",
            detenerRotacion
        );

        grafica3D.addEventListener(
            "mouseleave",
            () => {
                if (rotacionActiva) {
                    iniciarRotacion();
                }
            }
        );

        grafica3D.on(
            "plotly_relayout",
            cambios => {
                if (actualizacionesCamara > 0) {
                    return;
                }

                const cambioCamara =
                    Object.keys(
                        cambios || {}
                    ).some(
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

    function elementoEnPantallaCompleta() {
        return (
            document.fullscreenElement ===
                envoltura3D
            ||
            document.webkitFullscreenElement ===
                envoltura3D
            ||
            pantallaCompletaSimulada
        );
    }

    function redimensionar3D() {
        window.setTimeout(
            () => {
                Plotly.Plots.resize(grafica3D);
            },
            80
        );

        window.setTimeout(
            () => {
                Plotly.Plots.resize(grafica3D);
            },
            260
        );
    }

    function actualizarEstadoPantallaCompleta() {
        const activa =
            elementoEnPantallaCompleta();

        botonPantallaCompleta.textContent =
            activa
                ? "Salir de pantalla completa"
                : "Pantalla completa";

        botonPantallaCompleta.classList.toggle(
            "activo",
            activa
        );

        document.body.classList.toggle(
            "grafica-newton-completa-activa",
            activa
        );

        if (
            !document.fullscreenElement
            && !document.webkitFullscreenElement
            && !pantallaCompletaSimulada
        ) {
            envoltura3D.classList.remove(
                "pantalla-completa-simulada"
            );
        }

        redimensionar3D();
    }

    async function abrirPantallaCompleta() {
        detenerRotacion();

        try {
            if (
                envoltura3D.requestFullscreen
            ) {
                await envoltura3D.requestFullscreen();

            } else if (
                envoltura3D.webkitRequestFullscreen
            ) {
                envoltura3D.webkitRequestFullscreen();

            } else {
                pantallaCompletaSimulada = true;

                envoltura3D.classList.add(
                    "pantalla-completa-simulada"
                );
            }

        } catch (error) {
            pantallaCompletaSimulada = true;

            envoltura3D.classList.add(
                "pantalla-completa-simulada"
            );
        }

        actualizarEstadoPantallaCompleta();

        if (rotacionActiva) {
            iniciarRotacion();
        }
    }

    async function cerrarPantallaCompleta() {
        detenerRotacion();

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

        envoltura3D.classList.remove(
            "pantalla-completa-simulada"
        );

        actualizarEstadoPantallaCompleta();

        if (
            rotacionActiva &&
            modoActual === "3d"
        ) {
            iniciarRotacion();
        }
    }


    boton2D.addEventListener("click", () => {
        cambiarModo("2d");
    });

    boton3D.addEventListener("click", () => {
        cambiarModo("3d");
    });

    botonAnimar.addEventListener(
        "click",
        async () => {
            if (animando) {
                return;
            }

            detenerAnimacion();

            let paso = 0;

            animando = true;
            botonAnimar.disabled = true;
            botonAnimar.textContent =
                "Animando...";

            sincronizarBotonAnimacionCompleta();

            await dibujar(0);

            temporizador = setInterval(
                async () => {
                    paso += 1;

                    await dibujar(paso);

                    if (
                        paso >= cantidadTotal
                    ) {
                        detenerAnimacion();

                        botonAnimar.textContent =
                            "Repetir";

                        sincronizarBotonAnimacionCompleta();

                        if (modoActual === "3d") {
                            iniciarRotacion();
                        }
                    }
                },
                900
            );
        }
    );

    prepararPantallaCompleta();

    dibujar2D(cantidadTotal);
    actualizarBotonesModo();

    window.addEventListener(
        "beforeunload",
        () => {
            detenerRotacion();
            detenerAnimacion();
        }
    );
});