document.addEventListener("DOMContentLoaded", () => {
    const elementoDatos =
        document.getElementById("datos-ejercicios");

    const titulo =
        document.getElementById("titulo-practica");

    const descripcion =
        document.getElementById("descripcion-practica");

    const funcion =
        document.getElementById("funcion-practica");

    const nivel =
        document.getElementById("nivel-practica");

    const valorInicial =
        document.getElementById("valor-inicial-practica");

    const tolerancia =
        document.getElementById("tolerancia-practica");

    const respuesta =
        document.getElementById("respuesta-practica");

    const mensaje =
        document.getElementById("mensaje-practica");

    const botonRevisar =
        document.getElementById("revisar-respuesta");

    const botonNuevo =
        document.getElementById("nuevo-ejercicio");

    const ejercicios = JSON.parse(
        elementoDatos.textContent
    );

    let ejercicioActual = null;

    function seleccionarEjercicio() {
        const indice = Math.floor(
            Math.random() * ejercicios.length
        );

        ejercicioActual = ejercicios[indice];

        titulo.textContent =
            ejercicioActual.titulo;

        descripcion.textContent =
            ejercicioActual.descripcion;

        funcion.innerHTML = `
            \\[
                f(x) =
                ${ejercicioActual.funcion_latex}
            \\]
        `;

        nivel.textContent =
            ejercicioActual.nivel;

        nivel.className =
            `nivel-ejercicio nivel-${
                ejercicioActual.nivel.toLowerCase()
            }`;

        valorInicial.textContent =
            ejercicioActual.valor_inicial;

        tolerancia.textContent =
            ejercicioActual.tolerancia;

        respuesta.value = "";
        mensaje.innerHTML = "";

        if (
            window.MathJax &&
            window.MathJax.typesetPromise
        ) {
            window.MathJax.typesetPromise(
                [funcion]
            );
        }
    }

    botonRevisar.addEventListener("click", () => {
        const valorUsuario =
            Number(respuesta.value);

        if (!Number.isFinite(valorUsuario)) {
            mensaje.innerHTML = `
                <div class="alert alert-warning mensaje-animado">
                    Escribe una respuesta válida.
                </div>
            `;

            return;
        }

        const resultadoCorrecto =
            Number(ejercicioActual.resultado);

        const diferencia = Math.abs(
            valorUsuario - resultadoCorrecto
        );

        const margen = Math.max(
            Number(ejercicioActual.tolerancia) * 10,
            0.001
        );

        if (diferencia <= margen) {
            mensaje.innerHTML = `
                <div class="alert alert-success respuesta-correcta">
                    ¡Respuesta correcta! La raíz aproximada es
                    <strong>${resultadoCorrecto}</strong>.
                </div>
            `;
        } else {
            mensaje.innerHTML = `
                <div class="alert alert-danger mensaje-animado">
                    La respuesta todavía no es correcta.
                    Revisa las iteraciones e inténtalo nuevamente.
                </div>
            `;
        }
    });

    botonNuevo.addEventListener(
        "click",
        seleccionarEjercicio
    );

    seleccionarEjercicio();
});