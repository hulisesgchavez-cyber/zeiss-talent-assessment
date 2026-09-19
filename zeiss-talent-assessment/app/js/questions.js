/* =============================================================================
 * ZEISS Talent Assessment — QUESTIONS (banco de preguntas)
 * -----------------------------------------------------------------------------
 * Tipos de pregunta:
 *   likert : afirmación con escala 1–5. reverse:true = pregunta invertida.
 *   sjt    : caso situacional. Cada opción tiene un nivel de respuesta 0–3
 *            (3 = más efectiva / ética, 0 = contraproducente o de riesgo).
 *   mc     : opción múltiple objetiva con una respuesta correcta (answer: 'A'..'D').
 *   grid   : selección múltiple interactiva (atención). answer = índices correctos.
 * Campos opcionales: figure (SVG generado), table / tables (datos), weight.
 *
 * Para agregar o modificar preguntas: edite los bloques de cada batería.
 * Reglas: IDs únicos, 4 opciones en sjt/mc, niveles 0–3 en sjt.
 * Las respuestas correctas están distribuidas entre A, B, C y D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const ZTA = (global.ZTA = global.ZTA || {});

  /* ----------------------------- Constructores ----------------------------- */
  const L = (id, facet, text, reverse = false, weight = 1) =>
    ({ id, type: 'likert', facet, text, reverse, weight });
  const S = (id, facet, text, options, weight = 1) =>
    ({ id, type: 'sjt', facet, text, weight, options: options.map(([t, s]) => ({ t, s })) });
  const M = (id, facet, text, options, answer, extra = {}) =>
    Object.assign({ id, type: 'mc', facet, text, options, answer, weight: 1 }, extra);
  const G = (id, facet, text, items, answer, extra = {}) =>
    Object.assign({ id, type: 'grid', facet, text, items, answer, weight: 1.5, columns: 4 }, extra);

  const Q = [];
  const battery = (dim, items) => items.forEach((q) => Q.push(Object.assign({ dim }, q)));

  ZTA.LIKERT_OPTIONS = ['Totalmente en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Totalmente de acuerdo'];

  /* Metadatos de aplicación por batería (nombre y textos en config.js → DIMENSIONS) */
  ZTA.BATTERIES = [
    { key: 'personalidad', estMinutes: 4, format: 'Escala de acuerdo y situaciones breves',
      instructions: 'Lee cada afirmación o situación y elige la opción que mejor describe tu forma habitual de trabajar. No hay respuestas correctas o incorrectas; responde con sinceridad.' },
    { key: 'liderazgo', estMinutes: 6, format: 'Casos situacionales y escala de acuerdo',
      instructions: 'Algunas situaciones plantean que coordinas a otras personas. Responde cómo actuarías en ese caso, aunque actualmente no tengas personal a cargo.' },
    { key: 'decisiones', estMinutes: 7, format: 'Casos con información incompleta, riesgo y presión de tiempo',
      instructions: 'Cada caso presenta información incompleta, presión de tiempo, riesgo o prioridades en conflicto. Elige la acción que tomarías.' },
    { key: 'blandas', estMinutes: 5, format: 'Casos de comunicación y colaboración',
      instructions: 'Situaciones de comunicación y colaboración con compañeros, clientes internos y otras áreas. Elige lo que harías.' },
    { key: 'integridad', estMinutes: 6, format: 'Escenarios de criterio ético',
      instructions: 'Situaciones laborales que involucran normas, registros y decisiones éticas. Elige lo que harías realmente, no lo que otros esperarían.' },
    { key: 'logico', estMinutes: 7, format: 'Secuencias, patrones y deducción',
      instructions: 'Ejercicios de secuencias, patrones visuales y deducción. Cada pregunta tiene una sola respuesta correcta.' },
    { key: 'numerico', estMinutes: 9, format: 'Problemas de producción, costos e indicadores',
      instructions: 'Problemas de producción, inventarios, costos e indicadores. Puedes apoyarte en papel y lápiz. Cada pregunta tiene una sola respuesta correcta.' },
    { key: 'atencion', estMinutes: 6, format: 'Comparación, detección de errores e identificación de códigos',
      instructions: 'Ejercicios de comparación y detección de diferencias. En algunas preguntas deberás seleccionar varios elementos antes de continuar.' },
    { key: 'critico', estMinutes: 6, format: 'Análisis de argumentos y datos',
      instructions: 'Evalúa argumentos, datos y conclusiones. Elige la respuesta mejor sustentada con la información presentada.' },
    { key: 'adaptabilidad', estMinutes: 4, format: 'Situaciones de cambio, presión e imprevistos',
      instructions: 'Situaciones de cambio, presión e imprevistos. Elige cómo actuarías.' }
  ];

  /* ===================== 01 — PERSONALIDAD LABORAL ===================== */
  battery('personalidad', [
    S('PER-01', 'Planificación', 'Cuando tienes varias actividades con fechas de entrega similares, normalmente…', [
      ['Atiendo primero la que me solicitaron con más insistencia.', 1],
      ['Hago una lista, estimo el tiempo de cada una y defino el orden según su impacto y su fecha.', 3],
      ['Comienzo por las más sencillas para avanzar rápido.', 1],
      ['Trabajo en todas al mismo tiempo para no descuidar ninguna.', 0]
    ]),
    L('PER-02', 'Planificación', 'Antes de iniciar una tarea con varias etapas, defino el orden y el tiempo que dedicaré a cada una.'),
    L('PER-03', 'Responsabilidad', 'Si una entrega depende también de otras personas, no me corresponde dar seguimiento a su parte.', true),
    S('PER-04', 'Orientación a la calidad', 'Terminaste un trabajo que cumple con lo mínimo solicitado, pero notas que con 20 minutos adicionales quedaría claramente mejor. La entrega es mañana y tienes margen. ¿Qué haces normalmente?', [
      ['Lo entrego como está; lo que no se pidió no es prioridad.', 0],
      ['Lo entrego hoy y dejo la mejora para una siguiente versión, si hay tiempo.', 2],
      ['Sigo mejorándolo hasta que quede perfecto, aunque tenga que pedir más plazo.', 1],
      ['Invierto los 20 minutos y lo entrego completo a tiempo.', 3]
    ]),
    L('PER-05', 'Iniciativa', 'Cuando identifico una mejora posible en mi área, la propongo aunque no forme parte de mis funciones.'),
    L('PER-06', 'Estabilidad emocional', 'Cuando se acumula el trabajo, me cuesta mantener la calma y eso se nota en mi trato con los demás.', true),
    L('PER-07', 'Aprendizaje', 'Busco aprender por mi cuenta herramientas o métodos que me ayuden a hacer mejor mi trabajo.'),
    S('PER-08', 'Responsabilidad', 'A mitad de una actividad asignada descubres que tomará el doble del tiempo estimado. ¿Qué haces primero?', [
      ['Aviso a mi jefe del nuevo estimado y propongo cómo reorganizar para cumplir lo más importante.', 3],
      ['Continúo sin avisar y trato de recuperar el tiempo quedándome más tarde.', 1],
      ['La pauso y paso a otra actividad hasta que alguien pregunte por ella.', 0],
      ['Pido a un compañero que la termine mientras atiendo otras tareas.', 1]
    ]),
    L('PER-09', 'Planificación', 'Normalmente comienzo mis actividades sin planificarlas; las organizo sobre la marcha.', true),
    L('PER-10', 'Orientación a la calidad', 'Reviso mi trabajo antes de entregarlo, aunque tenga confianza en que está correcto.')
  ]);

  /* ============================ 02 — LIDERAZGO ============================ */
  battery('liderazgo', [
    S('LID-01', 'Delegación', 'Coordinas un equipo de cinco personas y te asignan un reporte semanal que toma cuatro horas. Uno de tus colaboradores tiene el conocimiento para hacerlo, pero nunca lo ha preparado. ¿Qué haces?', [
      ['Lo sigo haciendo yo; es más rápido que enseñarle.', 1],
      ['Se lo asigno a partir de esta semana para liberar mi tiempo.', 1],
      ['Lo preparamos juntos la primera vez, acordamos criterios de calidad y reviso las primeras entregas antes de soltarlo por completo.', 3],
      ['Lo divido entre todo el equipo para que nadie se sobrecargue.', 0]
    ], 1.2),
    S('LID-02', 'Manejo de conflictos', 'Dos integrantes de tu equipo discuten frente a otros compañeros por la asignación de horas extra. ¿Qué haces primero?', [
      ['Detengo la discusión, hablo con ambos en privado para escuchar cada versión y acordamos un criterio claro de asignación.', 3],
      ['Decido yo la asignación para terminar la discusión.', 1],
      ['Dejo que lo resuelvan entre ellos.', 0],
      ['Reporto la situación a Recursos Humanos para que intervenga.', 1]
    ]),
    L('LID-03', 'Comunicación', 'Dedico tiempo a explicar a otros el porqué de las tareas, no solo lo que deben hacer.'),
    S('LID-04', 'Accountability', 'Tu equipo no alcanzó la meta de producción de la semana por un error en la programación que tú aprobaste. En la junta con la gerencia, ¿qué haces?', [
      ['Explico que el equipo tuvo problemas de desempeño durante la semana.', 0],
      ['Menciono que hubo factores externos que afectaron el resultado.', 1],
      ['Presento el resultado sin entrar en detalles para no generar conflicto.', 1],
      ['Reconozco que el error de programación fue mío, explico el impacto y presento las acciones para recuperar el volumen.', 3]
    ], 1.2),
    S('LID-05', 'Liderazgo situacional', 'Se integra a tu equipo una persona con mucha disposición pero sin experiencia en el proceso. ¿Qué estilo es más adecuado durante sus primeras semanas?', [
      ['Darle autonomía total para que aprenda de sus propios errores.', 0],
      ['Darle instrucciones claras, demostrar el proceso y revisar su trabajo con frecuencia.', 3],
      ['Pedirle que observe al equipo sin asignarle tareas.', 1],
      ['Explicarle los objetivos generales y dejar que proponga cómo hacerlo.', 1]
    ]),
    L('LID-06', 'Influencia', 'Cuando alguien no está de acuerdo con mi propuesta, prefiero imponerla antes que dedicar tiempo a convencerlo.', true),
    S('LID-07', 'Comunicación', 'La dirección decide cambiar el horario de turnos a partir del próximo mes y tu equipo no está de acuerdo. ¿Cuál es la mejor forma de comunicarlo?', [
      ['Enviar un correo con el nuevo horario para que quede por escrito.', 1],
      ['Decirles que es decisión de la dirección y que no hay nada que hacer.', 0],
      ['Explicar en persona las razones del cambio, escuchar las preocupaciones y escalar las que no pueda resolver.', 3],
      ['Esperar a la última semana para comunicarlo y evitar semanas de quejas.', 0]
    ]),
    S('LID-08', 'Priorización', 'Tienes tres pendientes hoy: una auditoría de cliente a las 10:00, la evaluación de desempeño de un colaborador (ya reprogramada una vez) y un reporte que puede enviarse mañana. Surge una falla en una línea que tu técnico de turno puede atender. ¿Qué haces?', [
      ['Asigno la falla al técnico con un punto de seguimiento, atiendo la auditoría, mantengo la evaluación y muevo el reporte a mañana.', 3],
      ['Atiendo personalmente la falla y cancelo lo demás.', 0],
      ['Atiendo la auditoría y dejo todo lo demás para mañana.', 1],
      ['Reprogramo la auditoría para atender la falla junto con el técnico.', 0]
    ]),
    L('LID-09', 'Desarrollo de personas', 'Doy retroalimentación específica y oportuna, tanto cuando algo sale bien como cuando debe mejorar.'),
    S('LID-10', 'Desarrollo de personas', 'Uno de tus mejores colaboradores bajó su desempeño en el último mes y ha llegado tarde varias veces. ¿Qué haces primero?', [
      ['Le aplico una amonestación conforme al reglamento.', 1],
      ['Lo comento con sus compañeros para saber qué le pasa.', 0],
      ['Espero unas semanas; seguramente es algo temporal.', 0],
      ['Hablo en privado con él, le comparto los hechos observados, escucho su situación y acordamos un plan con seguimiento.', 3]
    ], 1.2)
  ]);

  /* ======================== 03 — TOMA DE DECISIONES ======================= */
  battery('decisiones', [
    S('DEC-01', 'Información incompleta', 'Un cliente solicita confirmar hoy una fecha de entrega. El planeador que tiene el dato está de vacaciones y el sistema muestra información de hace una semana. ¿Qué haces?', [
      ['Confirmo la fecha que aparece en el sistema para no retrasar al cliente.', 0],
      ['Informo al cliente que no puedo confirmar hasta que regrese el planeador.', 1],
      ['Valido la capacidad real con producción y materiales, doy una fecha preliminar indicando los supuestos y la confirmo en cuanto tenga el dato.', 3],
      ['Le doy una fecha más larga de lo normal para asegurarme de cumplir.', 1]
    ]),
    S('DEC-02', 'Riesgo', 'Durante el turno, un operador reporta un ruido anormal en un equipo. Detenerlo implica perder el embarque de hoy; mantenerlo operando podría dañar el equipo o generar un riesgo. Mantenimiento tardará 40 minutos en llegar. ¿Qué haces?', [
      ['Detengo el equipo de forma segura, informo a mi jefe y a mantenimiento, y busco alternativas para el embarque (otra línea, tiempo extra o envío parcial).', 3],
      ['Lo mantengo operando hasta terminar el embarque y después lo reviso.', 0],
      ['Reduzco la velocidad del equipo y sigo produciendo hasta que llegue mantenimiento.', 1],
      ['Pido al operador que siga vigilando el ruido y me avise si empeora.', 0]
    ], 1.2),
    S('DEC-03', 'Información contradictoria', 'El reporte de calidad indica que un lote cumple especificación, pero un inspector te comenta que vio piezas con rayas. El lote debe embarcarse en dos horas. ¿Qué haces?', [
      ['Confío en el reporte oficial; es el documento válido.', 0],
      ['Retengo el lote completo sin más análisis hasta nueva orden.', 1],
      ['Pido al inspector que documente su hallazgo por escrito y embarco el lote.', 0],
      ['Solicito con calidad una verificación rápida por muestreo antes del embarque y escalo si se confirma el defecto.', 3]
    ], 1.2),
    S('DEC-04', 'Conflicto de prioridades', 'Dos gerentes te solicitan, al mismo tiempo, trabajos urgentes y no puedes completar ambos hoy. ¿Qué haces?', [
      ['Hago primero el del gerente con mayor jerarquía.', 1],
      ['Expongo la situación a ambos (o a mi jefe) con el impacto de cada trabajo y acordamos la prioridad.', 3],
      ['Hago el que me solicitaron primero.', 0],
      ['Avanzo la mitad de cada uno para quedar bien con ambos.', 0]
    ]),
    S('DEC-05', 'Presión de tiempo', 'Faltan 15 minutos para una junta en la que debes presentar una recomendación. Acabas de encontrar un dato que contradice parte de tu análisis. ¿Qué haces?', [
      ['Presento la recomendación original; no hay tiempo para cambios.', 0],
      ['Cancelo la junta hasta tener un análisis completo.', 1],
      ['Presento el análisis, señalo el dato nuevo, explico cómo podría cambiar la conclusión y propongo una fecha para confirmarla.', 3],
      ['Elimino la parte del análisis afectada y presento el resto.', 0]
    ]),
    S('DEC-06', 'Priorización', 'Al iniciar tu turno encuentras cuatro situaciones: (1) un derrame menor de químico en un pasillo, (2) un cliente que pide el estatus de su pedido, (3) una máquina detenida por falta de material y (4) un correo de Recursos Humanos sobre una capacitación. ¿En qué orden las atenderías?', [
      ['3 → 1 → 2 → 4', 1],
      ['1 → 3 → 2 → 4', 3],
      ['2 → 3 → 1 → 4', 0],
      ['1 → 2 → 3 → 4', 2]
    ]),
    S('DEC-07', 'Análisis de alternativas', 'Debes elegir entre dos proveedores de empaque. El proveedor X es 8% más barato; el proveedor Y tiene mejor historial de entregas a tiempo. No tienes datos de calidad de X. ¿Qué haces?', [
      ['Solicito muestras y datos de calidad de X, estimo el costo de un retraso o rechazo y comparo el costo total antes de decidir.', 3],
      ['Elijo a X; el ahorro es significativo.', 0],
      ['Elijo a Y; el historial de entregas es lo único que importa.', 1],
      ['Divido el volumen 50/50 entre ambos sin más análisis.', 1]
    ]),
    L('DEC-08', 'Proceso de decisión', 'Cuando debo decidir algo importante, prefiero esperar a tener el 100% de la información, aunque eso retrase la decisión.', true),
    L('DEC-09', 'Proceso de decisión', 'Después de tomar una decisión importante, reviso sus resultados para aprender y ajustar si es necesario.'),
    S('DEC-10', 'Riesgo', 'Detectas que una instrucción de trabajo vigente contiene un parámetro de temperatura distinto al que indica la especificación del cliente. La producción está corriendo. ¿Qué haces?', [
      ['Sigo la instrucción de trabajo; es el documento controlado de la planta.', 0],
      ['Cambio el parámetro en el equipo a lo que indica el cliente.', 1],
      ['Lo comento con un compañero para ver si alguien más lo notó.', 0],
      ['Notifico de inmediato a calidad e ingeniería con la evidencia y solicito que definan si se debe contener el producto mientras se aclara.', 3]
    ], 1.2)
  ]);

  /* ======================= 04 — HABILIDADES BLANDAS ======================= */
  battery('blandas', [
    S('BLA-01', 'Escucha activa', 'Un compañero de otra área te explica un problema de forma desordenada y con molestia. ¿Qué haces?', [
      ['Le pido que me lo envíe por correo para revisarlo con calma.', 1],
      ['Lo escucho sin interrumpir, hago preguntas para aclarar los puntos clave y resumo lo que entendí antes de proponer algo.', 3],
      ['Le indico que el problema corresponde a su área.', 0],
      ['Le propongo de inmediato una solución para no perder tiempo.', 1]
    ]),
    L('BLA-02', 'Comunicación', 'Adapto la forma en que explico algo según la persona con la que hablo (operador, ingeniero, gerente o cliente).'),
    S('BLA-03', 'Negociación', 'Necesitas que el almacén te entregue material hoy, pero tiene otras prioridades programadas. ¿Qué haces?', [
      ['Escalo a mi gerente para que presione al almacén.', 1],
      ['Voy personalmente y tomo el material que necesito.', 0],
      ['Espero a que el almacén lo entregue cuando pueda.', 0],
      ['Hablo con el responsable, explico el impacto, entiendo sus prioridades y buscamos juntos una opción (entrega parcial, horario alterno o apoyo de mi equipo).', 3]
    ]),
    L('BLA-04', 'Retroalimentación', 'Prefiero no dar retroalimentación negativa a mis compañeros para no afectar la relación.', true),
    S('BLA-05', 'Servicio al cliente interno', 'Otra área te pide información que te tomará dos horas preparar, pero tienes una entrega urgente. ¿Cómo respondes?', [
      ['Explico mi situación, pregunto para cuándo la necesitan realmente y acordamos una fecha o una versión parcial.', 3],
      ['No respondo hasta terminar mi entrega.', 0],
      ['Les digo que no puedo y que la pidan a otra persona.', 0],
      ['Dejo mi entrega y preparo la información para no quedar mal.', 1]
    ]),
    L('BLA-06', 'Colaboración', 'Comparto información y conocimientos con compañeros de otras áreas, aunque no me lo pidan formalmente.'),
    S('BLA-07', 'Empatía', 'Un compañero que normalmente es muy participativo ha estado callado y distraído varios días. ¿Qué haces?', [
      ['No intervengo; son asuntos personales.', 0],
      ['Le pregunto frente al equipo si le pasa algo.', 1],
      ['Busco un momento en privado para preguntarle cómo está y si hay algo en lo que pueda apoyar.', 3],
      ['Le recuerdo que debe mantener su nivel de desempeño.', 0]
    ]),
    L('BLA-08', 'Comunicación', 'Cuando no entiendo una instrucción, prefiero resolverla por mi cuenta antes que preguntar.', true),
    S('BLA-09', 'Manejo de conflictos', 'Recibes un correo, con copia a tu jefe, en el que un compañero te culpa injustamente de un retraso. ¿Qué haces?', [
      ['Respondo a todos con evidencia de que la responsabilidad fue suya.', 0],
      ['Lo ignoro para no escalar el conflicto.', 1],
      ['Me quejo con mi jefe del comportamiento de mi compañero.', 1],
      ['Hablo primero con mi compañero para aclarar los hechos y después envío una respuesta objetiva, centrada en la solución.', 3]
    ]),
    S('BLA-10', 'Trabajo en equipo', 'Tu equipo decide un método de trabajo con el que no estás de acuerdo, después de haber escuchado tu opinión. ¿Qué haces?', [
      ['Aplico el método acordado y comparto datos si observo resultados que justifiquen revisarlo.', 3],
      ['Aplico mi propio método; al final lo importante es el resultado.', 0],
      ['Aplico el método acordado, pero comento con otros que no funcionará.', 1],
      ['Pido a mi jefe que revierta la decisión.', 1]
    ])
  ]);

  /* ======================== 05 — INTEGRIDAD Y ÉTICA ======================= */
  /* Scoring situacional: 3 ética y proactiva · 2 adecuada parcial · 1 pasiva u
   * omisión · 0 conducta de riesgo (genera indicador para entrevista). */
  battery('integridad', [
    S('INT-01', 'Transparencia', 'Detectas que cometiste un error en un reporte que ya fue enviado y nadie lo ha identificado. ¿Qué haces?', [
      ['Lo corrijo en la siguiente versión sin mencionarlo.', 1],
      ['Aviso de inmediato a quienes recibieron el reporte, envío la corrección y explico el impacto.', 3],
      ['No hago nada; si nadie lo notó, probablemente no es relevante.', 0],
      ['Lo comento con mi jefe solo si alguien pregunta por el dato.', 0]
    ], 1.3),
    S('INT-02', 'Veracidad de registros', 'Al final del turno faltan 30 piezas para la meta. Tu supervisor sugiere registrarlas en el sistema y producirlas mañana temprano. ¿Qué haces?', [
      ['Las registro; es una práctica común y mañana se reponen.', 0],
      ['Registro solo la mitad para reducir el riesgo.', 0],
      ['Explico que prefiero registrar la producción real y propongo reportar la diferencia con su causa.', 3],
      ['No las registro, pero no digo nada para evitar un conflicto.', 2]
    ], 1.3),
    L('INT-03', 'Apego a normas', 'Si un procedimiento es demasiado lento, es aceptable saltarse algunos pasos cuando se tiene experiencia.', true),
    S('INT-04', 'Conflicto de interés', 'Un proveedor con el que trabajas te ofrece, como cortesía, pagar una cena para ti y tu familia mientras evalúas su cotización. ¿Qué haces?', [
      ['Declino, pero no lo comento con nadie.', 2],
      ['Acepto; es solo una cortesía y no influirá en mi decisión.', 0],
      ['Acepto solo si la cena es después de tomar la decisión.', 0],
      ['Declino amablemente e informo a mi jefe o al área de cumplimiento conforme a la política.', 3]
    ], 1.3),
    S('INT-05', 'Confidencialidad', 'Un amigo que trabaja en otra empresa del parque industrial te pregunta cuánto gana la gente de tu puesto y qué clientes nuevos tiene tu empresa. ¿Qué haces?', [
      ['Le comparto datos generales; no es información tan delicada.', 0],
      ['Le comparto solo los sueldos, pero no los clientes.', 0],
      ['Le explico que es información confidencial y no la comparto.', 3],
      ['Le digo que no sé, para evitar la conversación.', 1]
    ]),
    S('INT-06', 'Calidad y seguridad', 'Un cliente importante presiona por un embarque urgente. Faltan los resultados de una prueba de calidad que tarda tres horas. Tu gerente pregunta si se puede enviar "como está". ¿Qué respondes?', [
      ['Explico el riesgo de embarcar sin la prueba, propongo alternativas (envío parcial de lotes liberados o prueba acelerada) y dejo que calidad autorice.', 3],
      ['Respondo que sí; la prueba casi siempre sale bien.', 0],
      ['Respondo que es decisión suya y me mantengo al margen.', 1],
      ['Embarco y hago la prueba después con una muestra.', 0]
    ], 1.3),
    L('INT-07', 'Transparencia', 'Cuando cometo un error que nadie ha notado, lo informo aunque pueda afectar mi evaluación.'),
    S('INT-08', 'Uso de recursos', 'Observas que un compañero con quien llevas buena relación saca de la planta material de desecho que, según la política, debe permanecer en el contenedor de scrap. ¿Qué haces?', [
      ['Lo reporto de forma anónima sin hablar con él.', 2],
      ['Lo ignoro; es material de desecho.', 0],
      ['Le pido que me dé una parte.', 0],
      ['Le digo que va contra la política y lo reporto por el canal correspondiente.', 3]
    ]),
    S('INT-09', 'Veracidad de registros', 'Un compañero te pide que registres su entrada en el reloj checador porque viene retrasado por el tráfico. ¿Qué haces?', [
      ['Lo registro; a cualquiera le puede pasar.', 0],
      ['Me niego y le sugiero avisar a su supervisor del retraso.', 3],
      ['Me niego, pero no le digo nada más.', 2],
      ['Lo registro solo esta vez y le advierto que no lo haré de nuevo.', 0]
    ], 1.3),
    L('INT-10', 'Apego a normas', 'Sigo los procedimientos establecidos aunque nadie esté supervisando.')
  ]);

  /* ======================== 06 — RAZONAMIENTO LÓGICO ====================== */
  const poly = (sides, fill) => ({ shape: 'poly', sides, fill });
  const arrow = (angle) => ({ shape: 'arrow', angle });
  const group = (shape, count) => ({ shape, count });
  battery('logico', [
    M('LOG-01', 'Secuencias numéricas', '¿Qué número continúa la serie?  3, 7, 15, 31, 63, …', ['125', '127', '126', '129'], 'B'),
    M('LOG-02', 'Patrones visuales', 'Observa la secuencia de figuras. ¿Cuál continúa la serie?', [
      { fig: poly(7, false), alt: 'Heptágono sin relleno' },
      { fig: poly(8, true), alt: 'Octágono relleno' },
      { fig: poly(7, true), alt: 'Heptágono relleno' },
      { fig: poly(6, true), alt: 'Hexágono relleno' }
    ], 'C', { figure: { kind: 'sequence', items: [poly(3, true), poly(4, false), poly(5, true), poly(6, false)] } }),
    M('LOG-03', 'Patrones visuales', 'La flecha cambia de posición siguiendo una regla. ¿Cuál es la siguiente posición?', [
      { fig: arrow(225), alt: 'Flecha hacia abajo a la izquierda' },
      { fig: arrow(90), alt: 'Flecha hacia la derecha' },
      { fig: arrow(0), alt: 'Flecha hacia arriba' },
      { fig: arrow(180), alt: 'Flecha hacia abajo' }
    ], 'D', { figure: { kind: 'sequence', items: [arrow(0), arrow(45), arrow(90), arrow(135)] } }),
    M('LOG-04', 'Matrices', 'Cada fila y cada columna siguen una regla. ¿Qué figura completa la matriz?', [
      { fig: group('square', 3), alt: 'Tres cuadrados' },
      { fig: group('triangle', 3), alt: 'Tres triángulos' },
      { fig: group('square', 2), alt: 'Dos cuadrados' },
      { fig: group('circle', 3), alt: 'Tres círculos' }
    ], 'A', { figure: { kind: 'matrix', cells: [
      group('circle', 1), group('square', 2), group('triangle', 3),
      group('square', 1), group('triangle', 2), group('circle', 3),
      group('triangle', 1), group('circle', 2), null
    ] } }),
    M('LOG-05', 'Deducción', 'Todas las piezas del lote 45 pasaron por inspección final. Algunas piezas que pasaron por inspección final fueron retrabajadas. Con base únicamente en esta información, ¿qué afirmación es necesariamente verdadera?', [
      'Algunas piezas del lote 45 fueron retrabajadas.',
      'Ninguna pieza del lote 45 fue retrabajada.',
      'Todas las piezas retrabajadas pertenecen al lote 45.',
      'No es posible determinar si alguna pieza del lote 45 fue retrabajada.'
    ], 'D'),
    M('LOG-06', 'Deducción', 'Cinco equipos (P, Q, R, S y T) reciben mantenimiento, uno por día, de lunes a viernes. Q se atiende después de P. S se atiende el miércoles. T se atiende el día inmediato anterior a R. P no se atiende el lunes. ¿Qué equipo se atiende el lunes?', ['P', 'T', 'Q', 'R'], 'B', { weight: 1.3 }),
    M('LOG-07', 'Relaciones', 'Lente es a óptica como engrane es a…', ['máquina', 'metal', 'mecánica', 'rotación'], 'C'),
    M('LOG-08', 'Clasificación', '¿Qué número NO pertenece al grupo?', ['49', '81', '64', '72'], 'D'),
    M('LOG-09', 'Secuencias numéricas', '¿Qué número continúa la serie?  2, 12, 4, 10, 6, 8, …', ['10', '4', '8', '6'], 'C'),
    M('LOG-10', 'Deducción', 'Regla de la planta: si un equipo tiene etiqueta roja, no puede operarse. La regla se cumple siempre. El equipo M-12 está operando. ¿Qué se puede concluir?', [
      'M-12 no tiene etiqueta roja.',
      'M-12 tiene etiqueta verde.',
      'M-12 fue revisado por mantenimiento hoy.',
      'No es posible concluir nada sobre la etiqueta de M-12.'
    ], 'A')
  ]);

  /* ======================= 07 — RAZONAMIENTO NUMÉRICO ===================== */
  battery('numerico', [
    M('NUM-01', 'Porcentajes', 'Una línea produjo 1,200 piezas durante un turno y el 6% presentó defecto. ¿Cuántas piezas buenas se obtuvieron?', ['1,072', '1,140', '1,128', '1,194'], 'C'),
    M('NUM-02', 'Productividad', 'Un inspector revisa 45 lentes por hora. ¿Cuántas horas necesitan 3 inspectores, trabajando al mismo ritmo, para revisar 1,620 lentes?', ['12 horas', '36 horas', '8 horas', '10 horas'], 'A'),
    M('NUM-03', 'Inventarios', 'El inventario de un material es de 2,400 unidades, el consumo es de 180 unidades por día y el punto de reorden es de 600 unidades. ¿En cuántos días se alcanzará el punto de reorden?', ['8 días', '12 días', '13.3 días', '10 días'], 'D'),
    M('NUM-04', 'Variaciones', 'El costo de un insumo subió de $250 a $285 por unidad. ¿Cuál fue el incremento porcentual?', ['12.3%', '14%', '15%', '35%'], 'B'),
    M('NUM-05', 'Proporciones', 'Una mezcla requiere resina y endurecedor en proporción 5 : 2. Si se tienen 35 litros de resina, ¿cuántos litros de endurecedor se necesitan?', ['10 litros', '12 litros', '14 litros', '17.5 litros'], 'C'),
    M('NUM-06', 'Indicadores', 'Una máquina tiene una capacidad estándar de 400 piezas por hora. En un turno de 8 horas produjo 2,720 piezas. ¿Cuál fue su eficiencia?', ['68%', '80%', '88%', '85%'], 'D'),
    M('NUM-07', 'Tiempo', 'Un pedido de 2,000 piezas se procesa en una celda cuyo cuello de botella tarda 1.2 minutos por pieza. ¿Cuántas horas se requieren, aproximadamente, para completar el pedido?', ['40 horas', '24 horas', '33.3 horas', '48 horas'], 'A'),
    M('NUM-08', 'Costos', 'La mano de obra cuesta $95 por hora por operador. Un trabajo requiere 6 operadores durante 7.5 horas, más 2 horas de tiempo extra de 3 operadores, pagadas al doble. ¿Cuál es el costo total de mano de obra?', ['$4,845', '$5,415', '$4,275', '$5,985'], 'B', { weight: 1.3 }),
    M('NUM-09', 'Indicadores', 'Tres turnos produjeron 1,500, 1,200 y 800 piezas, con 2%, 3% y 5% de scrap, respectivamente. ¿Cuál es, aproximadamente, el porcentaje de scrap total de la planta?', ['3.3%', '3.5%', '2.8%', '3.0%'], 'D', { weight: 1.3 }),
    M('NUM-10', 'Interpretación de datos', 'Con base en la tabla, ¿qué mes tuvo el MAYOR porcentaje de entregas a tiempo?', ['Enero', 'Febrero', 'Marzo', 'Enero y febrero empatan'], 'B', {
      table: { headers: ['Mes', 'Entregas a tiempo', 'Entregas totales'], rows: [['Enero', '92', '100'], ['Febrero', '85', '90'], ['Marzo', '110', '125']] }
    })
  ]);

  /* ===================== 08 — ATENCIÓN Y CONCENTRACIÓN ==================== */
  battery('atencion', [
    G('ATE-01', 'Identificación de códigos', 'Selecciona TODOS los códigos idénticos al modelo: ZL-4827-B', [
      'ZL-4872-B', 'ZL-4827-B', 'ZI-4827-B', 'ZL-4827-8',
      'ZL-4827-B', 'LZ-4827-B', 'ZL-4827-B', 'ZL-4287-B',
      'ZL-4827-D', 'Z1-4827-B', 'ZL-48227-B', 'ZL-4827-B',
      'ZL-4827-R', 'ZL-8427-B', 'ZL-4827-B', 'ZL-4827-P'
    ], [1, 4, 6, 11, 14], { target: 'ZL-4827-B' }),
    M('ATE-02', 'Comparación de documentos', 'Compara la orden de compra con la factura del proveedor. ¿Cuántas diferencias hay entre ambos documentos?', ['2', '3', '4', '5'], 'B', {
      tables: [
        { title: 'Orden de compra', headers: ['No. de parte', 'Cantidad', 'Precio unitario'], rows: [
          ['LN-1045', '250', '$18.40'], ['LN-2210', '120', '$22.75'], ['CT-0087', '500', '$3.10'],
          ['PK-5532', '75', '$41.00'], ['LN-3301', '300', '$16.95'], ['CT-0142', '1,000', '$2.35']] },
        { title: 'Factura del proveedor', headers: ['No. de parte', 'Cantidad', 'Precio unitario'], rows: [
          ['LN-1045', '250', '$18.40'], ['LN-2210', '210', '$22.75'], ['CT-0087', '500', '$3.10'],
          ['PK-5532', '75', '$41.10'], ['LN-3031', '300', '$16.95'], ['CT-0142', '1,000', '$2.35']] }
      ], weight: 1.3
    }),
    M('ATE-03', 'Detección de diferencias', 'La etiqueta del lote indica 7730-LX-09281. ¿Qué registro coincide EXACTAMENTE con la etiqueta?', ['7730-LX-09821', '7730-XL-09281', '7703-LX-09281', '7730-LX-09281'], 'D', { mono: true }),
    G('ATE-04', 'Detección de errores', 'Especificación de espesor de centro: 1.80 a 2.20 mm (ambos valores incluidos). Selecciona TODAS las lecturas FUERA de especificación.', [
      '1.95', '2.21', '1.80', '2.05', '1.79', '2.18', '2.20', '1.88',
      '2.02', '1.97', '2.25', '1.83', '1.99', '2.10', '1.78', '2.00'
    ], [1, 4, 10, 14]),
    M('ATE-05', 'Comparación de información', 'Compara el registro del sistema con la etiqueta física del contenedor. ¿Qué campo es diferente?', ['Pedido', 'Cliente', 'Material', 'Cantidad'], 'B', {
      lines: ['Sistema:   Pedido 45821 · Cliente 3307 · Material 1.67 AR · Cantidad 240', 'Etiqueta:  Pedido 45821 · Cliente 3370 · Material 1.67 AR · Cantidad 240']
    }),
    M('ATE-06', 'Búsqueda de patrones', '¿Cuántas veces aparece la secuencia 3-8 (un 3 seguido inmediatamente de un 8) en la siguiente cadena?', ['2', '3', '4', '5'], 'C', {
      lines: ['4 3 8 1 3 3 8 9 8 3 0 3 8 3 8 2 7 3 1 8']
    }),
    G('ATE-07', 'Identificación de códigos', 'Selecciona TODOS los números de parte que comienzan con AX y terminan en -R.', [
      'AX-2231-R', 'AX-2231-L', 'XA-5510-R', 'AK-9002-R',
      'AX-9002-R', 'AX-0412-P', 'AY-7715-R', 'AX-7715-R',
      'AX-3006-B', 'XA-3006-R', 'AX-3006-R', 'AX-6120-K',
      'AX-5528-R', 'HX-5528-R', 'AX-5528-A', 'AV-4410-R'
    ], [0, 4, 7, 10, 12]),
    M('ATE-08', 'Comparación de documentos', 'Compara las dos revisiones de la hoja de parámetros del proceso. ¿Qué parámetro cambió?', ['Tiempo de curado', 'Temperatura de curado', 'Presión de aire', 'Tiempo de enfriamiento'], 'A', {
      tables: [
        { title: 'Revisión C', headers: ['Parámetro', 'Valor'], rows: [['Temperatura de curado', '115 °C'], ['Tiempo de curado', '45 min'], ['Velocidad de giro', '1,200 rpm'], ['Humedad máxima', '40%'], ['Presión de aire', '5.5 bar'], ['Tiempo de enfriamiento', '12 min']] },
        { title: 'Revisión D', headers: ['Parámetro', 'Valor'], rows: [['Temperatura de curado', '115 °C'], ['Tiempo de curado', '54 min'], ['Velocidad de giro', '1,200 rpm'], ['Humedad máxima', '40%'], ['Presión de aire', '5.5 bar'], ['Tiempo de enfriamiento', '12 min']] }
      ]
    }),
    G('ATE-09', 'Comparación de información', 'Cada fila muestra el código capturado en el sistema y el código de la etiqueta. Selecciona TODAS las filas donde los códigos NO coinciden.', [
      '45821 | 45821', '33071 | 33017', '90412 | 90412', '11873 | 11873',
      '70034 | 70034', '62590 | 62509', '28816 | 28816', '84402 | 84402',
      '51147 | 51741', '39958 | 39958', '16620 | 16260', '77301 | 77301'
    ], [1, 5, 8, 10], { columns: 3 }),
    M('ATE-10', 'Seguimiento de instrucciones', 'Instrucción: «Si la temperatura es mayor a 80 °C y la presión es menor a 3 bar, detener el equipo. Si la temperatura es mayor a 80 °C y la presión es de 3 bar o más, reducir la velocidad. En cualquier otro caso, continuar operando». Lectura actual: 82 °C y 3.0 bar. ¿Qué acción corresponde?', ['Continuar operando', 'Detener el equipo', 'Reducir la velocidad', 'Detener y llamar a mantenimiento'], 'C')
  ]);

  /* ======================== 09 — PENSAMIENTO CRÍTICO ====================== */
  battery('critico', [
    M('CRI-01', 'Identificación de supuestos', '«Desde que instalamos la nueva iluminación, el scrap bajó 15%; por lo tanto, la iluminación redujo el scrap». ¿Qué supuesto hace esta conclusión?', [
      'Que ningún otro factor relevante cambió durante el mismo periodo.',
      'Que la nueva iluminación tuvo un costo razonable.',
      'Que el scrap seguirá bajando en los próximos meses.',
      'Que los operadores prefieren la nueva iluminación.'
    ], 'A'),
    M('CRI-02', 'Evaluación de evidencia', 'El área A tuvo 12 accidentes en el año y el área B tuvo 6. El gerente concluye que el área A es menos segura. ¿Qué dato es MÁS necesario para evaluar esa conclusión?', [
      'La antigüedad de los supervisores de cada área.',
      'El número de horas trabajadas o de personas en cada área.',
      'El tipo de equipo de protección que utilizan.',
      'El presupuesto de seguridad de cada área.'
    ], 'B'),
    M('CRI-03', 'Hechos y opiniones', '¿Cuál de las siguientes afirmaciones es un HECHO verificable y no una opinión?', [
      'El nuevo proceso es mucho más eficiente que el anterior.',
      'El proveedor X es el más confiable del mercado.',
      'La línea 3 registró 4 paros no programados en septiembre.',
      'El equipo de mantenimiento no está comprometido.'
    ], 'C'),
    M('CRI-04', 'Correlación y causalidad', 'Un análisis muestra que los operadores con más horas de capacitación cometen menos errores. ¿Cuál es la conclusión MÁS adecuada?', [
      'La capacitación elimina los errores.',
      'Los operadores con menos errores solicitan más capacitación.',
      'La capacitación no tiene relación con los errores.',
      'Existe una relación que conviene analizar; otros factores, como la experiencia, podrían explicarla.'
    ], 'D'),
    M('CRI-05', 'Evaluación de evidencia', 'Para medir la satisfacción del personal se encuestó a 20 personas del turno matutino, de un total de 900 colaboradores en tres turnos. El 90% respondió estar satisfecho. ¿Cuál es la principal limitación de este resultado?', [
      'La muestra es pequeña y no representa a todos los turnos.',
      'El porcentaje es demasiado alto para ser real.',
      'La encuesta debió aplicarse en papel.',
      'El resultado debería expresarse en número de personas.'
    ], 'A'),
    M('CRI-06', 'Interpretación de datos', 'Con base en la tabla, ¿qué conclusión está sustentada por los datos?', [
      'La línea 1 tiene mayor tasa de rechazo porque tiene más rechazos.',
      'La línea 2 tiene mayor tasa de rechazo (4.0% frente a 3.0%).',
      'Ambas líneas tienen la misma tasa de rechazo.',
      'No es posible comparar las líneas porque producen cantidades distintas.'
    ], 'B', { table: { headers: ['Línea', 'Piezas producidas', 'Piezas rechazadas'], rows: [['Línea 1', '5,000', '150'], ['Línea 2', '3,000', '120']] } }),
    M('CRI-07', 'Evaluación de argumentos', 'Un proveedor afirma que su nuevo recubrimiento reduce las rayas en 30%, con base en una prueba realizada por él mismo en su laboratorio. ¿Qué información DEBILITARÍA más esta afirmación?', [
      'El recubrimiento cuesta 10% más que el actual.',
      'Otros clientes ya compraron el recubrimiento.',
      'El proveedor tiene 20 años en el mercado.',
      'La prueba se realizó con lentes de un material distinto al que utiliza nuestra planta.'
    ], 'D', { weight: 1.2 }),
    M('CRI-08', 'Errores de razonamiento', '«Contratamos a dos personas egresadas de esa universidad y ninguna funcionó; no debemos contratar más egresados de ahí». ¿Cuál es el principal problema de este razonamiento?', [
      'No menciona el nombre de la universidad.',
      'No considera el salario ofrecido.',
      'Generaliza a partir de muy pocos casos.',
      'Las universidades cambian sus planes de estudio.'
    ], 'C'),
    M('CRI-09', 'Inferencia', 'En la planta se ha comprobado que todo lote curado a menos de 110 °C presenta falla de adherencia. El lote 88 no presentó falla de adherencia. ¿Qué se puede concluir?', [
      'El lote 88 se curó a menos de 110 °C.',
      'La temperatura no influye en la adherencia.',
      'Todo lote curado a 110 °C o más pasa la prueba de adherencia.',
      'El lote 88 se curó a 110 °C o más.'
    ], 'D', { weight: 1.3 }),
    M('CRI-10', 'Decisiones basadas en datos', 'Hay tres propuestas para reducir tiempos muertos: (1) comprar un equipo nuevo, sin datos de impacto; (2) cambiar el método de preparación, con una prueba piloto de dos semanas que redujo 18% el tiempo muerto; (3) aumentar la supervisión, con base en la opinión de dos supervisores. ¿Cuál tiene el MEJOR sustento para implementarse primero?', [
      'La propuesta 1', 'La propuesta 2', 'La propuesta 3', 'Las tres tienen el mismo sustento'
    ], 'B')
  ]);

  /* ================ 10 — ADAPTABILIDAD Y MANEJO DE SITUACIONES ============== */
  battery('adaptabilidad', [
    S('ADA-01', 'Cambio de prioridades', 'A media semana, tu jefe cambia las prioridades y el proyecto en el que llevabas tres días trabajando se pausa. ¿Qué haces?', [
      ['Documento el avance y el estado del proyecto pausado, y me enfoco en la nueva prioridad aclarando expectativas y fechas.', 3],
      ['Termino primero el proyecto actual; ya llevaba mucho avance.', 0],
      ['Me enfoco en la nueva prioridad sin documentar nada; después lo retomo.', 1],
      ['Expreso mi inconformidad y pido que se reconsidere la decisión.', 1]
    ]),
    L('ADA-02', 'Tolerancia a la ambigüedad', 'Puedo avanzar en una tarea aunque no tenga todas las instrucciones, aclarando dudas en el camino.'),
    S('ADA-03', 'Adopción de tecnología', 'La empresa implementa un sistema digital para registrar la producción, que sustituye el formato en papel que dominas. ¿Cuál es tu reacción más probable?', [
      ['Sigo usando el papel en paralelo hasta que el sistema demuestre que funciona.', 1],
      ['Pido capacitación, practico y apoyo a compañeros que tengan dificultades.', 3],
      ['Espero a que otros lo aprendan primero y les pregunto después.', 1],
      ['Uso el sistema solo cuando alguien lo revisa.', 0]
    ]),
    L('ADA-04', 'Manejo de presión', 'Bajo presión mantengo la calma y la claridad para decidir.'),
    S('ADA-05', 'Imprevistos', 'Al llegar a tu turno te informan que faltaron dos personas de tu área. La meta del día no cambia. ¿Qué haces?', [
      ['Informo a mi jefe que no podremos cumplir la meta.', 1],
      ['Trabajo a ritmo normal; no es mi responsabilidad que falte personal.', 0],
      ['Pido apoyo a otra área sin analizar prioridades.', 1],
      ['Reviso con el equipo las prioridades, redistribuyo actividades, aseguro lo crítico y aviso a tiempo lo que no se alcanzará.', 3]
    ], 1.2),
    L('ADA-06', 'Apertura al cambio', 'Me siento más cómodo cuando mi trabajo se realiza siempre de la misma manera y prefiero evitar cambios.', true),
    S('ADA-07', 'Aprendizaje de la retroalimentación', 'En tu evaluación de desempeño recibes una crítica que consideras injusta sobre tu forma de comunicarte. ¿Qué haces?', [
      ['Defiendo mi postura y pido que se retire el comentario.', 0],
      ['Acepto el comentario sin decir nada, aunque no esté de acuerdo.', 1],
      ['Pido ejemplos concretos para entender la percepción y acuerdo acciones para mejorar.', 3],
      ['Pregunto a mis compañeros si opinan lo mismo antes de responder.', 1]
    ]),
    L('ADA-08', 'Resiliencia', 'Cuando algo no sale como esperaba, me cuesta varios días recuperar la motivación.', true),
    S('ADA-09', 'Ambigüedad', 'Te asignan un proyecto nuevo con objetivos poco claros y sin un procedimiento previo. ¿Qué haces primero?', [
      ['Comienzo a trabajar con lo que entiendo y ajusto después.', 1],
      ['Espero a que me den instrucciones más específicas.', 0],
      ['Busco un proyecto similar y replico su enfoque.', 1],
      ['Aclaro con el solicitante el resultado esperado, los criterios de éxito y la fecha; después propongo un plan inicial.', 3]
    ]),
    S('ADA-10', 'Manejo de presión', 'Durante una auditoría de cliente, una falla en el sistema impide mostrar los registros solicitados. ¿Qué haces?', [
      ['Explico la situación con calma, muestro la evidencia alternativa disponible (respaldos, registros físicos) y acuerdo con el auditor cuándo entregaré lo pendiente.', 3],
      ['Pido que la auditoría se suspenda hasta que funcione el sistema.', 1],
      ['Improviso una explicación general para que no se note la falla.', 0],
      ['Busco a alguien de sistemas y dejo al auditor esperando.', 1]
    ], 1.2)
  ]);

  /* --------------------------------------------------------------------------
   * PARES DE CONSISTENCIA
   * Preguntas separadas en el examen que miden lo mismo (a veces con redacción
   * invertida o en otro formato). Tras aplicar la inversión, sus respuestas
   * deberían ser similares. Diferencias grandes reducen el Índice de
   * consistencia de respuestas (no detecta mentiras; solo señala contradicciones).
   * ------------------------------------------------------------------------ */
  ZTA.CONSISTENCY_PAIRS = [
    { a: 'PER-02', b: 'PER-09', topic: 'Planificación de actividades' },
    { a: 'PER-06', b: 'ADA-04', topic: 'Calma bajo presión' },
    { a: 'LID-09', b: 'BLA-04', topic: 'Retroalimentación a otros' },
    { a: 'DEC-08', b: 'ADA-02', topic: 'Avance con información incompleta' },
    { a: 'BLA-08', b: 'ADA-09', topic: 'Aclaración de dudas e instrucciones' },
    { a: 'INT-01', b: 'INT-07', topic: 'Transparencia ante errores propios' },
    { a: 'INT-02', b: 'INT-09', topic: 'Veracidad de registros' },
    { a: 'INT-03', b: 'INT-10', topic: 'Apego a procedimientos' },
    { a: 'ADA-06', b: 'ADA-03', topic: 'Disposición al cambio' }
  ];

  /* --------------------- Normalización y exportación --------------------- */
  const LETTERS = ['A', 'B', 'C', 'D'];
  Q.forEach((q) => {
    if (q.type === 'mc' && typeof q.answer === 'string') q.answer = LETTERS.indexOf(q.answer);
  });

  ZTA.QUESTION_BANK = {
    version: '1.0.0',
    batteries: ZTA.BATTERIES,
    questions: Q,
    consistencyPairs: ZTA.CONSISTENCY_PAIRS || []
  };
})(typeof window !== 'undefined' ? window : globalThis);
