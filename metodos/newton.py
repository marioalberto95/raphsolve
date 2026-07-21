import math
import re

import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)


PATRON_EXPRESION = re.compile(
    r"^[0-9A-Za-z_+\-*/^().,\s=]+$"
)

PALABRAS_PROHIBIDAS = {
    "__",
    "import",
    "eval",
    "exec",
    "open",
    "lambda",
    "globals",
    "locals",
    "compile",
    "input",
    "os",
    "sys",
    "subprocess",
}


def _normalizar_funcion(texto):
    """Limpia y normaliza la función ingresada."""

    texto = texto.strip()

    if not texto:
        raise ValueError(
            "Debes ingresar una función."
        )

    if not PATRON_EXPRESION.fullmatch(
        texto
    ):
        raise ValueError(
            "La función contiene caracteres no permitidos."
        )

    texto_minusculas = texto.lower()

    if any(
        palabra in texto_minusculas
        for palabra in PALABRAS_PROHIBIDAS
    ):
        raise ValueError(
            "La función contiene elementos no permitidos."
        )

    texto = texto.replace(
        "^",
        "**",
    )

    if "=" in texto:
        partes = texto.split("=")

        if len(partes) != 2:
            raise ValueError(
                "La ecuación debe contener solamente un signo igual."
            )

        izquierda, derecha = (
            parte.strip()
            for parte in partes
        )

        if not izquierda or not derecha:
            raise ValueError(
                "La ecuación no está completa."
            )

        texto = (
            f"({izquierda})"
            f"-({derecha})"
        )

    return texto


def _crear_expresion(
    funcion_texto,
    x,
):
    """Convierte el texto en una expresión simbólica segura."""

    funciones_permitidas = {
        "x": x,
        "sin": sp.sin,
        "cos": sp.cos,
        "tan": sp.tan,
        "asin": sp.asin,
        "acos": sp.acos,
        "atan": sp.atan,
        "sqrt": sp.sqrt,
        "log": sp.log,
        "ln": sp.log,
        "log10": (
            lambda valor:
            sp.log(valor, 10)
        ),
        "exp": sp.exp,
        "abs": sp.Abs,
        "Abs": sp.Abs,
        "pi": sp.pi,
        "e": sp.E,
        "E": sp.E,
    }

    globales_seguros = {
        "__builtins__": {},
        "Integer": sp.Integer,
        "Float": sp.Float,
        "Rational": sp.Rational,
        "Symbol": sp.Symbol,
    }

    transformaciones = (
        standard_transformations
        + (
            convert_xor,
            implicit_multiplication_application,
        )
    )

    texto = _normalizar_funcion(
        funcion_texto
    )

    try:
        expresion = parse_expr(
            texto,
            local_dict=funciones_permitidas,
            global_dict=globales_seguros,
            transformations=transformaciones,
            evaluate=True,
        )

    except (
        SyntaxError,
        TypeError,
        ValueError,
        NameError,
    ) as error:
        raise ValueError(
            "La función matemática no es válida."
        ) from error

    if not isinstance(
        expresion,
        sp.Expr,
    ):
        raise ValueError(
            "La función matemática no es válida."
        )

    simbolos_extra = (
        expresion.free_symbols
        - {x}
    )

    if simbolos_extra:
        raise ValueError(
            "Solamente se permite utilizar la variable x."
        )

    return expresion


def _evaluar_real(
    funcion,
    valor,
    mensaje,
):
    """Evalúa una función y comprueba que el resultado sea real y finito."""

    try:
        resultado = funcion(valor)
        numero = float(resultado)

    except (
        ValueError,
        TypeError,
        OverflowError,
        ZeroDivisionError,
    ) as error:
        raise ValueError(
            mensaje
        ) from error

    if not math.isfinite(numero):
        raise ValueError(
            "La función produjo un resultado no válido."
        )

    return numero


def crear_datos_grafica(
    funcion,
    iteraciones,
    raiz=None,
    convergio=False,
):
    """Genera los puntos, tangentes y rangos para Plotly."""

    if not iteraciones:
        return {
            "x": [],
            "y": [],
            "raiz": (
                float(raiz)
                if (
                    convergio
                    and raiz is not None
                )
                else None
            ),
            "convergio": bool(
                convergio
            ),
            "iteraciones": [],
            "total_iteraciones": 0,
            "iteraciones_mostradas": 0,
            "rango_x": [-5, 5],
            "rango_y": [-5, 5],
        }

    iteraciones_visibles = (
        iteraciones
        if convergio
        else iteraciones[:8]
    )

    valores_x = []

    for fila in iteraciones_visibles:
        for clave in (
            "x_actual",
            "x_siguiente",
        ):
            valor = fila.get(
                clave
            )

            if (
                isinstance(
                    valor,
                    (int, float),
                )
                and math.isfinite(
                    float(valor)
                )
            ):
                valores_x.append(
                    float(valor)
                )

    if (
        convergio
        and raiz is not None
        and math.isfinite(
            float(raiz)
        )
    ):
        valores_x.append(
            float(raiz)
        )

    if not valores_x:
        valores_x = [0.0]

    minimo_valor = min(
        valores_x
    )

    maximo_valor = max(
        valores_x
    )

    if convergio:
        amplitud_x = max(
            maximo_valor
            - minimo_valor,
            2.0,
        )

        margen_x = (
            amplitud_x * 0.35
        )

        minimo = (
            minimo_valor
            - margen_x
        )

        maximo = (
            maximo_valor
            + margen_x
        )

    else:
        valor_inicial = float(
            iteraciones[0][
                "x_actual"
            ]
        )

        minimo = (
            valor_inicial - 5.0
        )

        maximo = (
            valor_inicial + 5.0
        )

    if math.isclose(
        minimo,
        maximo,
    ):
        minimo -= 1.0
        maximo += 1.0

    cantidad_puntos = 400

    paso = (
        (maximo - minimo)
        / (cantidad_puntos - 1)
    )

    puntos_x = []
    puntos_y = []

    for indice in range(
        cantidad_puntos
    ):
        valor_x = (
            minimo
            + indice * paso
        )

        puntos_x.append(
            valor_x
        )

        try:
            valor_y = float(
                funcion(valor_x)
            )

            if (
                math.isfinite(
                    valor_y
                )
                and abs(valor_y)
                < 1_000_000
            ):
                puntos_y.append(
                    valor_y
                )

            else:
                puntos_y.append(
                    None
                )

        except (
            ValueError,
            TypeError,
            OverflowError,
            ZeroDivisionError,
        ):
            puntos_y.append(
                None
            )

    valores_y_validos = sorted(
        valor
        for valor in puntos_y
        if valor is not None
    )

    valores_relevantes_y = [
        0.0,
        *[
            float(fila["fx"])
            for fila
            in iteraciones_visibles
            if math.isfinite(
                float(
                    fila["fx"]
                )
            )
        ],
    ]

    if valores_y_validos:
        if len(
            valores_y_validos
        ) >= 20:
            indice_inferior = int(
                len(
                    valores_y_validos
                )
                * 0.02
            )

            indice_superior = min(
                len(
                    valores_y_validos
                ) - 1,
                int(
                    len(
                        valores_y_validos
                    )
                    * 0.98
                ),
            )

            minimo_y = (
                valores_y_validos[
                    indice_inferior
                ]
            )

            maximo_y = (
                valores_y_validos[
                    indice_superior
                ]
            )

        else:
            minimo_y = min(
                valores_y_validos
            )

            maximo_y = max(
                valores_y_validos
            )

        minimo_y = min(
            minimo_y,
            *valores_relevantes_y,
        )

        maximo_y = max(
            maximo_y,
            *valores_relevantes_y,
        )

        amplitud_y = max(
            maximo_y
            - minimo_y,
            1.0,
        )

        margen_y = (
            amplitud_y
            * 0.12
        )

        limites_y = [
            minimo_y - margen_y,
            maximo_y + margen_y,
        ]

    else:
        limites_y = [-10, 10]

    amplitud_tangente = (
        (maximo - minimo)
        * 0.15
    )

    datos_iteraciones = []

    for fila in iteraciones_visibles:
        actual = float(
            fila["x_actual"]
        )

        valor_funcion = float(
            fila["fx"]
        )

        pendiente = float(
            fila["derivada"]
        )

        siguiente = float(
            fila["x_siguiente"]
        )

        inicio_tangente = (
            actual
            - amplitud_tangente
        )

        final_tangente = (
            actual
            + amplitud_tangente
        )

        datos_iteraciones.append(
            {
                "numero":
                    fila["numero"],

                "x_actual":
                    actual,

                "fx":
                    valor_funcion,

                "x_siguiente":
                    siguiente,

                "error":
                    float(
                        fila["error"]
                    ),

                "residuo":
                    float(
                        fila.get(
                            "residuo",
                            abs(
                                valor_funcion
                            ),
                        )
                    ),

                "tangente_x": [
                    inicio_tangente,
                    final_tangente,
                ],

                "tangente_y": [
                    (
                        valor_funcion
                        + pendiente
                        * (
                            inicio_tangente
                            - actual
                        )
                    ),
                    (
                        valor_funcion
                        + pendiente
                        * (
                            final_tangente
                            - actual
                        )
                    ),
                ],
            }
        )

    return {
        "x": puntos_x,
        "y": puntos_y,

        "raiz": (
            float(raiz)
            if (
                convergio
                and raiz is not None
            )
            else None
        ),

        "convergio": bool(
            convergio
        ),

        "iteraciones":
            datos_iteraciones,

        "total_iteraciones":
            len(iteraciones),

        "iteraciones_mostradas":
            len(
                iteraciones_visibles
            ),

        "rango_x": [
            minimo,
            maximo,
        ],

        "rango_y":
            limites_y,
    }


def resolver_newton(
    funcion_texto: str,
    valor_inicial: float,
    tolerancia: float,
    max_iteraciones: int,
) -> dict:
    """Resuelve una ecuación con Newton-Raphson."""

    try:
        tolerancia = float(
            tolerancia
        )

        valor_inicial = float(
            valor_inicial
        )

        max_iteraciones = int(
            max_iteraciones
        )

    except (
        TypeError,
        ValueError,
    ) as error:
        raise ValueError(
            "Los parámetros numéricos no son válidos."
        ) from error

    if (
        not math.isfinite(
            tolerancia
        )
        or tolerancia <= 0
    ):
        raise ValueError(
            "La tolerancia debe ser mayor que cero."
        )

    if not math.isfinite(
        valor_inicial
    ):
        raise ValueError(
            "El valor inicial debe ser un número finito."
        )

    if max_iteraciones <= 0:
        raise ValueError(
            "Las iteraciones máximas deben ser mayores que cero."
        )

    x = sp.symbols(
        "x",
        real=True,
    )

    expresion = _crear_expresion(
        funcion_texto,
        x,
    )

    derivada = sp.diff(
        expresion,
        x,
    )

    try:
        funcion = sp.lambdify(
            x,
            expresion,
            modules="math",
        )

        funcion_derivada = sp.lambdify(
            x,
            derivada,
            modules="math",
        )

    except Exception as error:
        raise ValueError(
            "No fue posible convertir la función "
            "a una expresión numérica."
        ) from error

    actual = valor_inicial
    iteraciones = []

    for numero in range(
        1,
        max_iteraciones + 1,
    ):
        fx = _evaluar_real(
            funcion,
            actual,
            (
                "No fue posible evaluar la función "
                "con ese valor inicial."
            ),
        )

        dfx = _evaluar_real(
            funcion_derivada,
            actual,
            (
                "No fue posible evaluar la derivada "
                "con ese valor inicial."
            ),
        )

        if abs(fx) <= tolerancia:
            siguiente = actual
            error_aproximado = 0.0
            residuo = abs(fx)

            iteraciones.append(
                {
                    "numero":
                        numero,

                    "x_actual":
                        actual,

                    "fx":
                        fx,

                    "derivada":
                        dfx,

                    "x_siguiente":
                        siguiente,

                    "error":
                        error_aproximado,

                    "residuo":
                        residuo,
                }
            )

            return {
                "modo":
                    "una_variable",

                "funcion_latex":
                    sp.latex(
                        expresion
                    ),

                "derivada_latex":
                    sp.latex(
                        derivada
                    ),

                "raiz":
                    siguiente,

                "convergio":
                    True,

                "iteraciones":
                    iteraciones,

                "error_final":
                    error_aproximado,

                "residuo_final":
                    residuo,

                "grafica":
                    crear_datos_grafica(
                        funcion=funcion,
                        iteraciones=iteraciones,
                        raiz=siguiente,
                        convergio=True,
                    ),
            }

        if abs(dfx) < 1e-12:
            raise ValueError(
                "La derivada es cero o demasiado pequeña. "
                "Prueba con otro valor inicial."
            )

        siguiente = (
            actual
            - fx / dfx
        )

        if not math.isfinite(
            siguiente
        ):
            raise ValueError(
                "El método produjo una aproximación no válida."
            )

        residuo_siguiente = abs(
            _evaluar_real(
                funcion,
                siguiente,
                (
                    "No fue posible evaluar "
                    "la nueva aproximación."
                ),
            )
        )

        error_aproximado = abs(
            siguiente - actual
        )

        iteraciones.append(
            {
                "numero":
                    numero,

                "x_actual":
                    actual,

                "fx":
                    fx,

                "derivada":
                    dfx,

                "x_siguiente":
                    siguiente,

                "error":
                    error_aproximado,

                "residuo":
                    residuo_siguiente,
            }
        )

        if (
            error_aproximado
            <= tolerancia
            and residuo_siguiente
            <= tolerancia
        ):
            return {
                "modo":
                    "una_variable",

                "funcion_latex":
                    sp.latex(
                        expresion
                    ),

                "derivada_latex":
                    sp.latex(
                        derivada
                    ),

                "raiz":
                    siguiente,

                "convergio":
                    True,

                "iteraciones":
                    iteraciones,

                "error_final":
                    error_aproximado,

                "residuo_final":
                    residuo_siguiente,

                "grafica":
                    crear_datos_grafica(
                        funcion=funcion,
                        iteraciones=iteraciones,
                        raiz=siguiente,
                        convergio=True,
                    ),
            }

        actual = siguiente

    ultimo_residuo = (
        iteraciones[-1][
            "residuo"
        ]
        if iteraciones
        else None
    )

    ultimo_error = (
        iteraciones[-1][
            "error"
        ]
        if iteraciones
        else None
    )

    return {
        "modo":
            "una_variable",

        "funcion_latex":
            sp.latex(
                expresion
            ),

        "derivada_latex":
            sp.latex(
                derivada
            ),

        "raiz":
            None,

        "ultima_aproximacion":
            actual,

        "convergio":
            False,

        "iteraciones":
            iteraciones,

        "error_final":
            ultimo_error,

        "residuo_final":
            ultimo_residuo,

        "grafica":
            crear_datos_grafica(
                funcion=funcion,
                iteraciones=iteraciones,
                raiz=None,
                convergio=False,
            ),
    }