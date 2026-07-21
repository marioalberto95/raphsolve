document.addEventListener("DOMContentLoaded", () => {
    const pantalla = document.getElementById(
        "pantalla-calculadora"
    );

    const mensaje = document.getElementById(
        "mensaje-calculadora"
    );

    const teclas = document.querySelectorAll(
        ".tecla"
    );

    function agregarValor(valor) {
        pantalla.value += valor;
        mensaje.textContent = "";
    }

    function limpiar() {
        pantalla.value = "";
        mensaje.textContent = "";
    }

    function borrar() {
        pantalla.value = pantalla.value.slice(0, -1);
        mensaje.textContent = "";
    }

    function calcular() {
        const expresion = pantalla.value.trim();

        if (!expresion) {
            mensaje.textContent =
                "Escribe una operación.";

            mensaje.className =
                "mensaje-calculadora mensaje-error";

            return;
        }

        try {
            const resultado = math.evaluate(expresion);

            pantalla.value = math.format(
                resultado,
                {
                    precision: 12,
                }
            );

            mensaje.textContent =
                "Operación realizada correctamente.";

            mensaje.className =
                "mensaje-calculadora mensaje-correcto";
        } catch (error) {
            mensaje.textContent =
                "La operación no es válida.";

            mensaje.className =
                "mensaje-calculadora mensaje-error";
        }
    }

    teclas.forEach((tecla) => {
        tecla.addEventListener("click", () => {
            const valor = tecla.dataset.valor;
            const accion = tecla.dataset.accion;

            if (valor) {
                agregarValor(valor);
                return;
            }

            if (accion === "limpiar") {
                limpiar();
                return;
            }

            if (accion === "borrar") {
                borrar();
                return;
            }

            if (accion === "calcular") {
                calcular();
            }
        });
    });

    document.addEventListener("keydown", (evento) => {
        const teclasPermitidas =
            "0123456789.+-*/^()";

        if (teclasPermitidas.includes(evento.key)) {
            agregarValor(evento.key);
            return;
        }

        if (evento.key === "Enter") {
            evento.preventDefault();
            calcular();
            return;
        }

        if (evento.key === "Backspace") {
            borrar();
            return;
        }

        if (evento.key === "Escape") {
            limpiar();
        }
    });
});