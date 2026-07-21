import math
import re
from collections.abc import Iterable
from statistics import median
from typing import Any, Dict, List, Sequence, Tuple, Union

import sympy as sp
from sympy.matrices.exceptions import NonInvertibleMatrixError
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)


TextoLista = Union[str, Iterable[str]]

FUNCIONES_PERMITIDAS = {
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "asin": sp.asin,
    "acos": sp.acos,
    "atan": sp.atan,
    "sqrt": sp.sqrt,
    "log": sp.log,
    "ln": sp.log,
    "log10": lambda valor: sp.log(valor, 10),
    "exp": sp.exp,
    "abs": sp.Abs,
    "Abs": sp.Abs,
    "pi": sp.pi,
    "e": sp.E,
    "E": sp.E,
}

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

NOMBRES_RESERVADOS = {
    nombre.lower()
    for nombre in FUNCIONES_PERMITIDAS
} | {
    "i",
    "oo",
    "zoo",
    "nan",
    "infinity",
}

PATRON_VARIABLE = re.compile(
    r"^[A-Za-z][A-Za-z0-9_]*$"
)

PATRON_EXPRESION = re.compile(
    r"^[0-9A-Za-z_+\-*/^().,=\s]+$"
)

TRANSFORMACIONES = (
    standard_transformations
    + (
        convert_xor,
        implicit_multiplication_application,
    )
)

GLOBALES_SEGUROS = {
    "__builtins__": {},
    "Integer": sp.Integer,
    "Float": sp.Float,
    "Rational": sp.Rational,
    "Symbol": sp.Symbol,
}


def _separar_texto(
    valor: TextoLista,
) -> List[str]:
    """Convierte texto separado por líneas o punto y coma en una lista."""

    if isinstance(valor, str):
        partes = re.split(
            r"[\n;]+",
            valor,
        )
    else:
        partes = list(valor)

    return [
        str(parte).strip()
        for parte in partes
        if str(parte).strip()
    ]


def _crear_variables(
    variables_texto: TextoLista,
) -> Tuple[List[str], Tuple[sp.Symbol, ...]]:
    """Valida y crea los símbolos reales del sistema."""

    if isinstance(
        variables_texto,
        str,
    ):
        nombres = [
            nombre.strip()
            for nombre in re.split(
                r"[,\s]+",
                variables_texto,
            )
            if nombre.strip()
        ]
    else:
        nombres = [
            str(nombre).strip()
            for nombre in variables_texto
            if str(nombre).strip()
        ]

    if len(nombres) < 2:
        raise ValueError(
            "El modo sistema requiere al menos dos variables."
        )

    if len(nombres) > 8:
        raise ValueError(
            "Para mantener un buen rendimiento se permiten "
            "hasta 8 variables."
        )

    if len(set(nombres)) != len(nombres):
        raise ValueError(
            "Los nombres de las variables no pueden repetirse."
        )

    for nombre in nombres:
        if not PATRON_VARIABLE.fullmatch(
            nombre
        ):
            raise ValueError(
                f"El nombre de variable '{nombre}' no es válido."
            )

        if (
            nombre.lower()
            in NOMBRES_RESERVADOS
        ):
            raise ValueError(
                f"'{nombre}' está reservado para una "
                "función o constante matemática."
            )

    simbolos = tuple(
        sp.Symbol(
            nombre,
            real=True,
        )
        for nombre in nombres
    )

    return nombres, simbolos


def _normalizar_ecuacion(
    texto: str,
) -> str:
    """Convierte una ecuación con '=' en una expresión igualada a cero."""

    texto = texto.strip()

    if not texto:
        raise ValueError(
            "Todas las ecuaciones deben tener contenido."
        )

    texto_minusculas = texto.lower()

    if any(
        palabra in texto_minusculas
        for palabra in PALABRAS_PROHIBIDAS
    ):
        raise ValueError(
            "Una ecuación contiene elementos no permitidos."
        )

    if not PATRON_EXPRESION.fullmatch(
        texto
    ):
        raise ValueError(
            "Una ecuación contiene caracteres no permitidos."
        )

    if texto.count("=") > 1:
        raise ValueError(
            "Cada ecuación puede contener como máximo un signo '='."
        )

    texto = texto.replace(
        "^",
        "**",
    )

    if "=" in texto:
        izquierda, derecha = texto.split(
            "=",
            1,
        )

        izquierda = izquierda.strip()
        derecha = derecha.strip()

        if not izquierda or not derecha:
            raise ValueError(
                "Los dos lados de la ecuación deben tener contenido."
            )

        texto = (
            f"({izquierda})"
            f"-({derecha})"
        )

    return texto


def _crear_expresiones(
    funciones_texto: TextoLista,
    nombres: Sequence[str],
    variables: Sequence[sp.Symbol],
) -> List[sp.Expr]:
    """Convierte las ecuaciones ingresadas en expresiones seguras."""

    funciones = _separar_texto(
        funciones_texto
    )

    if len(funciones) != len(
        variables
    ):
        raise ValueError(
            "El número de ecuaciones debe ser igual "
            "al número de variables."
        )

    entorno = {
        **FUNCIONES_PERMITIDAS,
        **dict(
            zip(
                nombres,
                variables,
            )
        ),
    }

    expresiones = []

    for funcion_texto in funciones:
        texto = _normalizar_ecuacion(
            funcion_texto
        )

        try:
            expresion = parse_expr(
                texto,
                local_dict=entorno,
                global_dict=GLOBALES_SEGUROS,
                transformations=TRANSFORMACIONES,
                evaluate=True,
            )

        except (
            SyntaxError,
            TypeError,
            ValueError,
            NameError,
        ) as error:
            raise ValueError(
                f"La ecuación '{funcion_texto}' no es válida."
            ) from error

        if not isinstance(
            expresion,
            sp.Expr,
        ):
            raise ValueError(
                f"La ecuación '{funcion_texto}' no es válida."
            )

        simbolos_extra = (
            expresion.free_symbols
            - set(variables)
        )

        if simbolos_extra:
            extras = ", ".join(
                sorted(
                    str(simbolo)
                    for simbolo
                    in simbolos_extra
                )
            )

            raise ValueError(
                "Se encontraron variables no declaradas: "
                f"{extras}."
            )

        if expresion.has(
            sp.I,
            sp.oo,
            -sp.oo,
            sp.zoo,
            sp.nan,
        ):
            raise ValueError(
                "Las ecuaciones deben producir valores reales y finitos."
            )

        expresiones.append(
            expresion
        )

    return expresiones


def _crear_valores_iniciales(
    valores_texto: TextoLista,
    cantidad: int,
) -> List[float]:
    """Valida los valores iniciales del sistema."""

    if isinstance(
        valores_texto,
        str,
    ):
        partes = [
            parte.strip()
            for parte in re.split(
                r"[,\s;]+",
                valores_texto,
            )
            if parte.strip()
        ]
    else:
        partes = [
            str(parte).strip()
            for parte in valores_texto
            if str(parte).strip()
        ]

    if len(partes) != cantidad:
        raise ValueError(
            "Debes ingresar un valor inicial por cada variable."
        )

    try:
        valores = [
            float(parte)
            for parte in partes
        ]
    except (
        TypeError,
        ValueError,
    ) as error:
        raise ValueError(
            "Todos los valores iniciales deben ser numéricos."
        ) from error

    if not all(
        math.isfinite(valor)
        for valor in valores
    ):
        raise ValueError(
            "Los valores iniciales deben ser finitos."
        )

    return valores


def _convertir_real(
    valor: Any,
    mensaje: str,
) -> float:
    """Convierte un resultado numérico a real finito."""

    try:
        numero_complejo = complex(
            valor
        )
    except (
        TypeError,
        ValueError,
        OverflowError,
    ) as error:
        raise ValueError(
            mensaje
        ) from error

    if (
        not math.isfinite(
            numero_complejo.real
        )
        or not math.isfinite(
            numero_complejo.imag
        )
        or abs(
            numero_complejo.imag
        ) > 1e-10
    ):
        raise ValueError(
            mensaje
        )

    return float(
        numero_complejo.real
    )


def _norma_infinito(
    valores: Iterable[float],
) -> float:
    """Calcula la norma infinito de un vector."""

    return max(
        (
            abs(float(valor))
            for valor in valores
        ),
        default=0.0,
    )


def _evaluar_vector(
    funcion,
    valores: Sequence[float],
) -> List[float]:
    """Evalúa el vector de funciones."""

    try:
        resultado = funcion(
            *valores
        )
    except (
        ValueError,
        TypeError,
        OverflowError,
        ZeroDivisionError,
    ) as error:
        raise ValueError(
            "No fue posible evaluar el sistema con la "
            "aproximación actual."
        ) from error

    if isinstance(
        resultado,
        sp.MatrixBase,
    ):
        elementos = list(
            resultado
        )
    elif isinstance(
        resultado,
        (list, tuple),
    ):
        elementos = list(
            resultado
        )
    else:
        elementos = [
            resultado
        ]

    return [
        _convertir_real(
            elemento,
            "El sistema produjo valores no reales o no finitos.",
        )
        for elemento in elementos
    ]


def _evaluar_jacobiana(
    funcion,
    valores: Sequence[float],
) -> sp.Matrix:
    """Evalúa la matriz Jacobiana."""

    try:
        resultado = funcion(
            *valores
        )

        matriz = sp.Matrix(
            resultado
        )
    except (
        ValueError,
        TypeError,
        OverflowError,
        ZeroDivisionError,
    ) as error:
        raise ValueError(
            "No fue posible evaluar la matriz Jacobiana "
            "con la aproximación actual."
        ) from error

    elementos = [
        _convertir_real(
            elemento,
            "La matriz Jacobiana produjo valores no reales "
            "o no finitos.",
        )
        for elemento in matriz
    ]

    return sp.Matrix(
        matriz.rows,
        matriz.cols,
        elementos,
    )


def _matriz_a_lista(
    matriz: sp.Matrix,
) -> List[List[float]]:
    """Convierte una matriz de SymPy en una lista serializable."""

    return [
        [
            float(
                matriz[
                    fila,
                    columna,
                ]
            )
            for columna in range(
                matriz.cols
            )
        ]
        for fila in range(
            matriz.rows
        )
    ]


def _resolver_delta(
    matriz_jacobiana: sp.Matrix,
    valores_funciones: Sequence[float],
) -> List[float]:
    """Resuelve J(X)·DeltaX = F(X) sin calcular la inversa."""

    try:
        vector_delta = (
            matriz_jacobiana.LUsolve(
                sp.Matrix(
                    valores_funciones
                )
            )
        )

    except (
        NonInvertibleMatrixError,
        ZeroDivisionError,
        ValueError,
    ) as error:
        raise ValueError(
            "La matriz Jacobiana es singular o no se puede "
            "resolver en esta aproximación. Prueba otros "
            "valores iniciales."
        ) from error

    delta = [
        _convertir_real(
            valor,
            "El método produjo una corrección no válida.",
        )
        for valor in vector_delta
    ]

    return delta


def _limites_eje(
    valores: Sequence[float],
) -> Tuple[float, float]:
    """Calcula límites visuales razonables para un eje."""

    finitos = [
        float(valor)
        for valor in valores
        if math.isfinite(
            float(valor)
        )
    ]

    if not finitos:
        return -2.0, 2.0

    centro = median(
        finitos
    )

    distancia = max(
        (
            abs(valor - centro)
            for valor in finitos
        ),
        default=0.0,
    )

    semirango = max(
        2.0,
        distancia * 1.35,
    )

    return (
        centro - semirango,
        centro + semirango,
    )


def _crear_superficies_dos_variables(
    expresiones: Sequence[sp.Expr],
    variables: Sequence[sp.Symbol],
    iteraciones: Sequence[Dict[str, Any]],
    aproximacion_final: Sequence[float],
) -> Dict[str, Any]:
    """Genera superficies 3D para sistemas de dos variables."""

    valores_x = [
        float(
            fila["actual"][0]
        )
        for fila in iteraciones
    ]

    valores_y = [
        float(
            fila["actual"][1]
        )
        for fila in iteraciones
    ]

    valores_x.append(
        float(
            aproximacion_final[0]
        )
    )

    valores_y.append(
        float(
            aproximacion_final[1]
        )
    )

    minimo_x, maximo_x = _limites_eje(
        valores_x
    )

    minimo_y, maximo_y = _limites_eje(
        valores_y
    )

    cantidad = 45

    puntos_x = [
        (
            minimo_x
            + indice
            * (
                maximo_x
                - minimo_x
            )
            / (
                cantidad - 1
            )
        )
        for indice in range(
            cantidad
        )
    ]

    puntos_y = [
        (
            minimo_y
            + indice
            * (
                maximo_y
                - minimo_y
            )
            / (
                cantidad - 1
            )
        )
        for indice in range(
            cantidad
        )
    ]

    funciones = [
        sp.lambdify(
            variables,
            expresion,
            modules="math",
        )
        for expresion in expresiones
    ]

    superficies = []

    for numero, funcion in enumerate(
        funciones,
        start=1,
    ):
        matriz_z = []

        for valor_y in puntos_y:
            fila_z = []

            for valor_x in puntos_x:
                try:
                    valor_z = _convertir_real(
                        funcion(
                            valor_x,
                            valor_y,
                        ),
                        "Valor no válido.",
                    )

                    if abs(
                        valor_z
                    ) < 1_000_000:
                        fila_z.append(
                            valor_z
                        )
                    else:
                        fila_z.append(
                            None
                        )

                except (
                    ValueError,
                    TypeError,
                    OverflowError,
                    ZeroDivisionError,
                ):
                    fila_z.append(
                        None
                    )

            matriz_z.append(
                fila_z
            )

        superficies.append(
            {
                "numero":
                    numero,
                "z":
                    matriz_z,
            }
        )

    trayectoria_x = [
        float(
            fila["actual"][0]
        )
        for fila in iteraciones
    ]

    trayectoria_y = [
        float(
            fila["actual"][1]
        )
        for fila in iteraciones
    ]

    trayectoria_x.append(
        float(
            aproximacion_final[0]
        )
    )

    trayectoria_y.append(
        float(
            aproximacion_final[1]
        )
    )

    return {
        "tipo":
            "superficies_2d",

        "x":
            puntos_x,

        "y":
            puntos_y,

        "superficies":
            superficies,

        "trayectoria": {
            "x":
                trayectoria_x,

            "y":
                trayectoria_y,

            "z": [
                0.0
                for _ in trayectoria_x
            ],
        },

        "solucion": {
            "x":
                float(
                    aproximacion_final[0]
                ),

            "y":
                float(
                    aproximacion_final[1]
                ),

            "z":
                0.0,
        },

        "rango_x": [
            minimo_x,
            maximo_x,
        ],

        "rango_y": [
            minimo_y,
            maximo_y,
        ],
    }


def _crear_trayectoria_multivariable(
    nombres: Sequence[str],
    iteraciones: Sequence[Dict[str, Any]],
    aproximacion_final: Sequence[float],
) -> Dict[str, Any]:
    """Genera una proyección 3D para tres o más variables."""

    indices = list(
        range(
            min(
                3,
                len(nombres),
            )
        )
    )

    while len(indices) < 3:
        indices.append(
            indices[-1]
        )

    trayectoria = {
        "x": [
            float(
                fila["actual"][
                    indices[0]
                ]
            )
            for fila in iteraciones
        ],

        "y": [
            float(
                fila["actual"][
                    indices[1]
                ]
            )
            for fila in iteraciones
        ],

        "z": [
            float(
                fila["actual"][
                    indices[2]
                ]
            )
            for fila in iteraciones
        ],
    }

    trayectoria["x"].append(
        float(
            aproximacion_final[
                indices[0]
            ]
        )
    )

    trayectoria["y"].append(
        float(
            aproximacion_final[
                indices[1]
            ]
        )
    )

    trayectoria["z"].append(
        float(
            aproximacion_final[
                indices[2]
            ]
        )
    )

    return {
        "tipo":
            "trayectoria_3d",

        "variables_proyectadas": [
            nombres[indice]
            for indice in indices
        ],

        "trayectoria":
            trayectoria,

        "solucion": {
            "x":
                float(
                    aproximacion_final[
                        indices[0]
                    ]
                ),

            "y":
                float(
                    aproximacion_final[
                        indices[1]
                    ]
                ),

            "z":
                float(
                    aproximacion_final[
                        indices[2]
                    ]
                ),
        },

        "advertencia": (
            "La gráfica muestra una proyección de las "
            "primeras tres variables."
            if len(nombres) > 3
            else None
        ),
    }


def crear_datos_grafica_sistema(
    expresiones: Sequence[sp.Expr],
    variables: Sequence[sp.Symbol],
    nombres: Sequence[str],
    iteraciones: Sequence[Dict[str, Any]],
    aproximacion_final: Sequence[float],
    convergio: bool,
) -> Dict[str, Any]:
    """Crea datos visuales según el número de variables."""

    iteraciones_visibles = (
        list(iteraciones)
        if convergio
        else list(
            iteraciones[:8]
        )
    )

    if (
        not convergio
        and iteraciones_visibles
    ):
        aproximacion_visual = list(
            iteraciones_visibles[-1][
                "siguiente"
            ]
        )
    else:
        aproximacion_visual = list(
            aproximacion_final
        )

    if len(
        variables
    ) == 2:
        return _crear_superficies_dos_variables(
            expresiones=expresiones,
            variables=variables,
            iteraciones=iteraciones_visibles,
            aproximacion_final=aproximacion_visual,
        )

    return _crear_trayectoria_multivariable(
        nombres=nombres,
        iteraciones=iteraciones_visibles,
        aproximacion_final=aproximacion_visual,
    )


def resolver_newton_sistema(
    variables_texto: TextoLista,
    funciones_texto: TextoLista,
    valores_iniciales_texto: TextoLista,
    tolerancia: float,
    max_iteraciones: int,
) -> Dict[str, Any]:
    """Resuelve sistemas no lineales mediante Newton-Raphson."""

    try:
        tolerancia = float(
            tolerancia
        )

        max_iteraciones = int(
            max_iteraciones
        )

    except (
        TypeError,
        ValueError,
    ) as error:
        raise ValueError(
            "La tolerancia o las iteraciones máximas no son válidas."
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

    if max_iteraciones <= 0:
        raise ValueError(
            "Las iteraciones máximas deben ser mayores que cero."
        )

    nombres, variables = _crear_variables(
        variables_texto
    )

    expresiones = _crear_expresiones(
        funciones_texto=funciones_texto,
        nombres=nombres,
        variables=variables,
    )

    valores_actuales = _crear_valores_iniciales(
        valores_texto=valores_iniciales_texto,
        cantidad=len(
            variables
        ),
    )

    vector_funciones = sp.Matrix(
        expresiones
    )

    jacobiana = (
        vector_funciones.jacobian(
            variables
        )
    )

    try:
        funcion_vector = sp.lambdify(
            variables,
            list(
                vector_funciones
            ),
            modules="math",
        )

        funcion_jacobiana = sp.lambdify(
            variables,
            jacobiana.tolist(),
            modules="math",
        )

    except Exception as error:
        raise ValueError(
            "No fue posible convertir el sistema a "
            "funciones numéricas."
        ) from error

    iteraciones = []

    for numero in range(
        1,
        max_iteraciones + 1,
    ):
        valores_funciones = _evaluar_vector(
            funcion_vector,
            valores_actuales,
        )

        matriz_jacobiana = _evaluar_jacobiana(
            funcion_jacobiana,
            valores_actuales,
        )

        residuo_actual = _norma_infinito(
            valores_funciones
        )

        if residuo_actual <= tolerancia:
            delta = [
                0.0
                for _ in variables
            ]

            valores_siguientes = list(
                valores_actuales
            )

            error_aproximado = 0.0
            residuo_siguiente = (
                residuo_actual
            )

        else:
            delta = _resolver_delta(
                matriz_jacobiana,
                valores_funciones,
            )

            valores_siguientes = [
                actual - correccion
                for actual, correccion
                in zip(
                    valores_actuales,
                    delta,
                )
            ]

            if not all(
                math.isfinite(
                    valor
                )
                for valor
                in valores_siguientes
            ):
                raise ValueError(
                    "El método produjo una aproximación no válida."
                )

            error_aproximado = _norma_infinito(
                (
                    siguiente - actual
                    for actual, siguiente
                    in zip(
                        valores_actuales,
                        valores_siguientes,
                    )
                )
            )

            valores_funciones_siguientes = (
                _evaluar_vector(
                    funcion_vector,
                    valores_siguientes,
                )
            )

            residuo_siguiente = _norma_infinito(
                valores_funciones_siguientes
            )

        iteraciones.append(
            {
                "numero":
                    numero,

                "actual":
                    list(
                        valores_actuales
                    ),

                "funciones":
                    list(
                        valores_funciones
                    ),

                "jacobiana":
                    _matriz_a_lista(
                        matriz_jacobiana
                    ),

                "delta":
                    list(
                        delta
                    ),

                "siguiente":
                    list(
                        valores_siguientes
                    ),

                "error":
                    float(
                        error_aproximado
                    ),

                "residuo":
                    float(
                        residuo_siguiente
                    ),
            }
        )

        valores_actuales = list(
            valores_siguientes
        )

        if (
            error_aproximado
            <= tolerancia
            and residuo_siguiente
            <= tolerancia
        ):
            solucion = {
                nombre:
                    float(valor)
                for nombre, valor
                in zip(
                    nombres,
                    valores_actuales,
                )
            }

            return {
                "modo":
                    "sistema",

                "variables":
                    list(nombres),

                "funciones_latex": [
                    sp.latex(
                        expresion
                    )
                    for expresion
                    in expresiones
                ],

                "jacobiana_latex":
                    sp.latex(
                        jacobiana
                    ),

                "solucion":
                    solucion,

                "solucion_vector":
                    list(
                        valores_actuales
                    ),

                "convergio":
                    True,

                "iteraciones":
                    iteraciones,

                "error_final":
                    float(
                        error_aproximado
                    ),

                "residuo_final":
                    float(
                        residuo_siguiente
                    ),

                "grafica":
                    crear_datos_grafica_sistema(
                        expresiones=expresiones,
                        variables=variables,
                        nombres=nombres,
                        iteraciones=iteraciones,
                        aproximacion_final=valores_actuales,
                        convergio=True,
                    ),
            }

    ultima_aproximacion = {
        nombre:
            float(valor)
        for nombre, valor
        in zip(
            nombres,
            valores_actuales,
        )
    }

    residuo_final = _norma_infinito(
        _evaluar_vector(
            funcion_vector,
            valores_actuales,
        )
    )

    return {
        "modo":
            "sistema",

        "variables":
            list(nombres),

        "funciones_latex": [
            sp.latex(
                expresion
            )
            for expresion
            in expresiones
        ],

        "jacobiana_latex":
            sp.latex(
                jacobiana
            ),

        "solucion":
            None,

        "solucion_vector":
            None,

        "ultima_aproximacion":
            ultima_aproximacion,

        "ultima_aproximacion_vector":
            list(
                valores_actuales
            ),

        "convergio":
            False,

        "iteraciones":
            iteraciones,

        "error_final": (
            float(
                iteraciones[-1][
                    "error"
                ]
            )
            if iteraciones
            else None
        ),

        "residuo_final":
            float(
                residuo_final
            ),

        "grafica":
            crear_datos_grafica_sistema(
                expresiones=expresiones,
                variables=variables,
                nombres=nombres,
                iteraciones=iteraciones,
                aproximacion_final=valores_actuales,
                convergio=False,
            ),
    }