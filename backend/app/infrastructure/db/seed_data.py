MUSCLE_GROUPS = [
    "Pecho",
    "Espalda",
    "Piernas",
    "Hombros",
    "Brazos",
    "Core",
    "Gluteos",
]

EQUIPMENT = [
    "Barra",
    "Mancuernas",
    "Maquina",
    "Polea",
    "Peso corporal",
    "Banco",
]

EXERCISES = [
    {
        "name": "Sentadilla",
        "description": "Ejercicio basico de tren inferior con enfasis en piernas y gluteos.",
        "difficulty": "intermediate",
        "technique_notes": "Mantener el torso estable y controlar la profundidad segun movilidad.",
        "muscle_groups": ["Piernas", "Gluteos", "Core"],
        "equipment": ["Barra"],
    },
    {
        "name": "Press banca",
        "description": "Empuje horizontal para pecho, hombros y triceps.",
        "difficulty": "intermediate",
        "technique_notes": "Escapulas retraidas, pies firmes y recorrido controlado.",
        "muscle_groups": ["Pecho", "Hombros", "Brazos"],
        "equipment": ["Barra", "Banco"],
    },
    {
        "name": "Peso muerto",
        "description": "Bisagra de cadera para cadena posterior y fuerza general.",
        "difficulty": "advanced",
        "technique_notes": "Columna neutra, barra cerca del cuerpo y empuje fuerte del suelo.",
        "muscle_groups": ["Espalda", "Piernas", "Gluteos", "Core"],
        "equipment": ["Barra"],
    },
    {
        "name": "Dominadas",
        "description": "Traccion vertical con peso corporal.",
        "difficulty": "intermediate",
        "technique_notes": "Iniciar con depresion escapular y evitar balanceos excesivos.",
        "muscle_groups": ["Espalda", "Brazos", "Core"],
        "equipment": ["Peso corporal"],
    },
    {
        "name": "Remo con barra",
        "description": "Traccion horizontal para espalda y brazos.",
        "difficulty": "intermediate",
        "technique_notes": "Mantener bisagra estable y llevar la barra hacia el torso.",
        "muscle_groups": ["Espalda", "Brazos"],
        "equipment": ["Barra"],
    },
    {
        "name": "Press militar",
        "description": "Empuje vertical para hombros y triceps.",
        "difficulty": "intermediate",
        "technique_notes": "Bloquear core y evitar hiperextension lumbar.",
        "muscle_groups": ["Hombros", "Brazos", "Core"],
        "equipment": ["Barra"],
    },
    {
        "name": "Curl biceps",
        "description": "Aislamiento de flexion de codo para biceps.",
        "difficulty": "beginner",
        "technique_notes": "Evitar balanceo y controlar la fase excentrica.",
        "muscle_groups": ["Brazos"],
        "equipment": ["Mancuernas"],
    },
    {
        "name": "Extension triceps en polea",
        "description": "Aislamiento de triceps con polea.",
        "difficulty": "beginner",
        "technique_notes": "Mantener codos estables y extender completamente.",
        "muscle_groups": ["Brazos"],
        "equipment": ["Polea"],
    },
    {
        "name": "Plancha",
        "description": "Ejercicio isometrico de core.",
        "difficulty": "beginner",
        "technique_notes": "Mantener linea recta de cabeza a pies sin hundir la cadera.",
        "muscle_groups": ["Core"],
        "equipment": ["Peso corporal"],
    },
]

RANKS = [
    {
        "name": "Novato",
        "description": "Rango inicial hasta registrar rendimiento con carga suficiente.",
        "min_score": "0",
        "sort_order": 1,
    },
    {
        "name": "Principiante",
        "description": "Primer progreso medible por volumen o mejora de carga.",
        "min_score": "100",
        "sort_order": 2,
    },
    {
        "name": "Intermedio",
        "description": "Rendimiento consistente con volumen y progresion acumulada.",
        "min_score": "300",
        "sort_order": 3,
    },
    {
        "name": "Avanzado",
        "description": "Buenas marcas y progreso en varios ejercicios.",
        "min_score": "700",
        "sort_order": 4,
    },
    {
        "name": "Atleta",
        "description": "Alto rendimiento acumulado por carga y progresion.",
        "min_score": "1500",
        "sort_order": 5,
    },
    {
        "name": "Elite",
        "description": "Rendimiento muy alto sostenido en multiples levantamientos.",
        "min_score": "3000",
        "sort_order": 6,
    },
    {
        "name": "Leyenda",
        "description": "Nivel maximo del sistema inicial de rangos.",
        "min_score": "6000",
        "sort_order": 7,
    },
]
