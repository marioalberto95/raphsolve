import json
import math
from pathlib import Path

from flask import Flask, render_template, request

from metodos.newton import resolver_newton
from metodos.newton_sistemas import resolver_newton_sistema


app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
RUTA_EJERCICIOS = (
    BASE_DIR
    / "static"
    / "data"
    / "ejercicios.json"
)


def formatear_numero(valor, decimales=8):
    """Elimina ceros innecesarios de los resultados."""

    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return valor

    if not math.isfinite(numero):
        return str(valor)

    if abs(numero) < 10 ** (-decimales):
        numero = 0.0

    if numero.is_integer():
        return str(int(numero))

    return (
        f"{numero:.{decimales}f}"
        .rstrip("0")
        .rstrip(".")
    )


app.jinja_env.filters["numero"] = formatear_numero


def obtener_modo_activo():
    """Obtiene y valida el modo del solucionador."""

    modo = request.form.get(
        "modo",
        request.args.get(
            "modo",
            "una_variable",
        ),
    )

    if modo not in {
        "una_variable",
        "sistema",
    }:
        return "una_variable"

    return modo


def separar_ecuaciones_formulario():
    """Obtiene las ecuaciones dinámicas del sistema."""

    ecuaciones = [
        ecuacion.strip()
        for ecuacion in request.form.getlist(
            "funciones_sistema"
        )
        if ecuacion.strip()
    ]

    if len(ecuaciones) == 1:
        texto = ecuaciones[0]

        ecuaciones = [
            linea.strip()
            for linea in texto.replace(
                ";",
                "\n",
            ).splitlines()
            if linea.strip()
        ]

    return ecuaciones


def obtener_valores_iniciales_sistema():
    """Obtiene los valores iniciales del sistema."""

    valores = [
        valor.strip()
        for valor in request.form.getlist(
            "valores_iniciales_sistema"
        )
        if valor.strip()
    ]

    if len(valores) == 1:
        return valores[0]

    return valores


def validar_parametros_generales():
    """Valida la tolerancia y el máximo de iteraciones."""

    texto_tolerancia = request.form.get(
        "tolerancia",
        "",
    ).strip()

    texto_iteraciones = request.form.get(
        "max_iteraciones",
        "",
    ).strip()

    if not texto_tolerancia:
        raise ValueError(
            "Debes ingresar una tolerancia."
        )

    if not texto_iteraciones:
        raise ValueError(
            "Debes ingresar el número máximo de iteraciones."
        )

    tolerancia = float(
        texto_tolerancia
    )

    max_iteraciones = int(
        texto_iteraciones
    )

    if (
        not math.isfinite(tolerancia)
        or tolerancia <= 0
    ):
        raise ValueError(
            "La tolerancia debe ser un número mayor que cero."
        )

    if max_iteraciones < 1:
        raise ValueError(
            "Las iteraciones máximas deben ser mayores que cero."
        )

    return tolerancia, max_iteraciones


def cargar_ejercicios():
    """Carga de forma segura el archivo de ejercicios."""

    try:
        with RUTA_EJERCICIOS.open(
            "r",
            encoding="utf-8",
        ) as archivo:
            datos = json.load(
                archivo
            )

        if not isinstance(datos, list):
            raise ValueError(
                "El archivo de ejercicios debe contener una lista."
            )

        return datos

    except FileNotFoundError:
        app.logger.error(
            "No se encontró el archivo %s",
            RUTA_EJERCICIOS,
        )

    except json.JSONDecodeError as error:
        app.logger.error(
            "El archivo ejercicios.json no contiene JSON válido: %s",
            error,
        )

    except (OSError, ValueError) as error:
        app.logger.error(
            "No fue posible cargar los ejercicios: %s",
            error,
        )

    return []


@app.route("/", methods=["GET", "POST"])
def inicio():
    resultado = None
    resultado_sistema = None
    mensaje_error = None

    modo_activo = obtener_modo_activo()

    if request.method == "POST":
        try:
            (
                tolerancia,
                max_iteraciones,
            ) = validar_parametros_generales()

            if modo_activo == "sistema":
                variables = request.form.get(
                    "variables_sistema",
                    "",
                ).strip()

                ecuaciones = (
                    separar_ecuaciones_formulario()
                )

                valores_iniciales = (
                    obtener_valores_iniciales_sistema()
                )

                if not variables:
                    raise ValueError(
                        "Debes indicar las variables del sistema."
                    )

                if not ecuaciones:
                    raise ValueError(
                        "Debes ingresar las ecuaciones del sistema."
                    )

                if not valores_iniciales:
                    raise ValueError(
                        "Debes ingresar un valor inicial para cada variable."
                    )

                resultado_sistema = (
                    resolver_newton_sistema(
                        variables_texto=variables,
                        funciones_texto=ecuaciones,
                        valores_iniciales_texto=valores_iniciales,
                        tolerancia=tolerancia,
                        max_iteraciones=max_iteraciones,
                    )
                )

            else:
                funcion = request.form.get(
                    "funcion",
                    "",
                ).strip()

                texto_valor_inicial = (
                    request.form.get(
                        "valor_inicial",
                        "",
                    ).strip()
                )

                if not funcion:
                    raise ValueError(
                        "Debes ingresar una función."
                    )

                if not texto_valor_inicial:
                    raise ValueError(
                        "Debes ingresar un valor inicial."
                    )

                valor_inicial = float(
                    texto_valor_inicial
                )

                if not math.isfinite(
                    valor_inicial
                ):
                    raise ValueError(
                        "El valor inicial debe ser un número finito."
                    )

                resultado = resolver_newton(
                    funcion_texto=funcion,
                    valor_inicial=valor_inicial,
                    tolerancia=tolerancia,
                    max_iteraciones=max_iteraciones,
                )

        except (
            ValueError,
            TypeError,
            ArithmeticError,
        ) as error:
            mensaje_error = str(error)

        except Exception:
            app.logger.exception(
                "Ocurrió un error inesperado al resolver el ejercicio."
            )

            mensaje_error = (
                "Ocurrió un error inesperado al realizar el cálculo. "
                "Revisa las ecuaciones y los valores ingresados."
            )

    return render_template(
        "index.html",
        resultado=resultado,
        resultado_sistema=resultado_sistema,
        mensaje_error=mensaje_error,
        modo_activo=modo_activo,
    )


@app.route("/aprende")
def aprende():
    return render_template(
        "aprende.html"
    )


@app.route("/ejercicios")
def ejercicios():
    return render_template(
        "ejercicios.html",
        ejercicios=cargar_ejercicios(),
    )


@app.route("/practica")
def practica():
    return render_template(
        "practica.html",
        ejercicios=cargar_ejercicios(),
    )


@app.route("/historial")
def historial():
    return render_template(
        "historial.html"
    )


@app.route("/calculadora")
def calculadora():
    return render_template(
        "calculadora.html"
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )