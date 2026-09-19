/* =============================================================================
 * ZEISS Talent Assessment — CONFIG / DATA
 * -----------------------------------------------------------------------------
 * Configuración centralizada: marca, duración, entrega (correo / WhatsApp),
 * perfiles y ponderaciones, umbrales, niveles de interpretación, colores y
 * textos narrativos por dimensión.
 *
 * IMPORTANTE: Las ponderaciones y umbrales son valores de referencia para un
 * prototipo. NO están validados científicamente; ajústelos desde el panel de
 * administración o editando este archivo.
 *
 * Este archivo funciona en el navegador (window.ZTA) y en Node.js (globalThis.ZTA)
 * para que el backend pueda recalcular el scoring con la misma lógica.
 * ========================================================================== */
(function (global) {
  'use strict';
  const ZTA = (global.ZTA = global.ZTA || {});

  /* ---------------------------------------------------------------------------
   * DIMENSIONES (una por batería). Orden = orden de aplicación.
   * ------------------------------------------------------------------------- */
  ZTA.DIMENSIONS = [
    {
      key: 'personalidad', name: 'Personalidad Laboral', short: 'Personalidad',
      description: 'Estilo de trabajo: organización, responsabilidad, orientación a la calidad, iniciativa y estabilidad ante la carga laboral.',
      phraseHigh: 'un estilo de trabajo organizado y orientado al cumplimiento',
      phraseLow: 'organización personal y constancia en el seguimiento de compromisos',
      strength: 'Muestra un estilo de trabajo organizado y constante, con orientación a cumplir compromisos y a cuidar la calidad de lo que entrega.',
      development: 'Se recomienda fortalecer hábitos de planificación y seguimiento de compromisos mediante herramientas de gestión del tiempo, listas de verificación y metas semanales revisadas con el jefe inmediato.',
      interviewFocus: 'Organización personal y cumplimiento de compromisos',
      interviewQuestions: [
        'Descríbeme cómo organizaste tu trabajo la última vez que tuviste varias entregas en la misma semana.',
        'Cuéntame sobre un compromiso que no pudiste cumplir a tiempo. ¿Qué pasó y qué hiciste después?'
      ]
    },
    {
      key: 'liderazgo', name: 'Liderazgo', short: 'Liderazgo',
      description: 'Delegación, influencia, comunicación, accountability, desarrollo de personas, manejo de conflictos y liderazgo situacional.',
      phraseHigh: 'la capacidad para influir, delegar y desarrollar a otros',
      phraseLow: 'delegación, influencia y desarrollo de colaboradores',
      strength: 'Tiende a dirigir mediante la comunicación, la delegación con seguimiento y el desarrollo del equipo, más que por la autoridad formal.',
      development: 'Se recomienda desarrollar habilidades de delegación, retroalimentación y manejo de conflictos mediante un programa de liderazgo práctico con acompañamiento (coaching) y metas de desarrollo de equipo.',
      interviewFocus: 'Delegación y desarrollo de colaboradores',
      interviewQuestions: [
        'Cuéntame sobre una ocasión en la que delegaste una tarea importante. ¿Cómo diste seguimiento y cuál fue el resultado?',
        'Descríbeme un conflicto entre miembros de tu equipo y cómo intervenir para resolverlo.'
      ]
    },
    {
      key: 'decisiones', name: 'Toma de Decisiones', short: 'Decisiones',
      description: 'Criterio y proceso de decisión ante información incompleta, presión de tiempo, riesgo, prioridades en conflicto e información contradictoria.',
      phraseHigh: 'la toma de decisiones con criterio bajo presión',
      phraseLow: 'análisis de riesgos y proceso de toma de decisiones',
      strength: 'Muestra criterio para decidir bajo presión: identifica riesgos, busca la información crítica y actúa a tiempo sin comprometer la seguridad ni la calidad.',
      development: 'Se recomienda fortalecer el proceso de decisión mediante metodologías estructuradas (análisis de riesgo, matriz de decisión, 8D o A3) y la revisión de casos reales con un mentor.',
      interviewFocus: 'Toma de decisiones con información incompleta',
      interviewQuestions: [
        'Cuéntame sobre una ocasión en la que tuviste que tomar una decisión con información incompleta. ¿Qué consideraste y cuál fue el resultado?',
        'Descríbeme una decisión que tomaste bajo presión de tiempo y que hoy harías de forma diferente.'
      ]
    },
    {
      key: 'blandas', name: 'Habilidades Blandas', short: 'Hab. blandas',
      description: 'Comunicación, colaboración, empatía, escucha activa, negociación y servicio al cliente interno.',
      phraseHigh: 'la comunicación clara y la colaboración',
      phraseLow: 'comunicación asertiva y colaboración con otras áreas',
      strength: 'Se comunica con claridad y construye relaciones de colaboración; tiende a escuchar, negociar y buscar acuerdos.',
      development: 'Se recomienda fortalecer la comunicación efectiva mediante talleres de comunicación asertiva, escucha activa y negociación, con práctica en situaciones reales del área.',
      interviewFocus: 'Comunicación y colaboración con otras áreas',
      interviewQuestions: [
        'Cuéntame sobre una ocasión en la que tuviste que colaborar con alguien con quien no tenías buena relación. ¿Cómo lo manejaste?',
        'Descríbeme una situación en la que tuviste que dar una mala noticia a un cliente interno o externo.'
      ]
    },
    {
      key: 'integridad', name: 'Integridad y Ética', short: 'Integridad',
      description: 'Apego a normas, transparencia en el reporte de errores, conflictos de interés, confidencialidad y cumplimiento.',
      phraseHigh: 'el apego a normas y la transparencia',
      phraseLow: 'criterio ético ante situaciones de presión',
      strength: 'Sus respuestas reflejan apego a normas, transparencia en el reporte de errores y disposición a escalar situaciones que comprometen la calidad o la ética.',
      development: 'Se recomienda reforzar el conocimiento del código de conducta, las políticas de cumplimiento y los canales de reporte, y validar en entrevista el criterio ético ante situaciones de presión.',
      interviewFocus: 'Criterio ético y apego a normas bajo presión',
      interviewQuestions: [
        'Cuéntame sobre una ocasión en la que cometiste un error que nadie había detectado. ¿Qué hiciste?',
        'Descríbeme una situación en la que recibiste presión para omitir un procedimiento o una norma. ¿Cómo respondiste?'
      ]
    },
    {
      key: 'logico', name: 'Razonamiento Lógico', short: 'Lógico',
      description: 'Identificación de patrones, secuencias, relaciones, deducción y clasificación.',
      phraseHigh: 'el razonamiento estructurado y la identificación de patrones',
      phraseLow: 'razonamiento lógico y análisis de patrones',
      strength: 'Identifica patrones y relaciones con rapidez y obtiene conclusiones válidas a partir de reglas y premisas.',
      development: 'Se recomienda fortalecer el razonamiento analítico mediante ejercicios de solución estructurada de problemas (causa raíz, diagramas de flujo, lógica de procesos) aplicados a casos del área.',
      interviewFocus: 'Análisis y solución de problemas',
      interviewQuestions: [
        'Descríbeme el problema técnico u operativo más complejo que hayas resuelto. ¿Cómo identificaste la causa?',
        'Cuéntame sobre un proceso que hayas mejorado a partir de detectar un patrón o una tendencia.'
      ]
    },
    {
      key: 'numerico', name: 'Razonamiento Numérico', short: 'Numérico',
      description: 'Cálculo aplicado a producción, inventarios, porcentajes, costos, tiempos, proporciones e indicadores.',
      phraseHigh: 'el manejo preciso de datos numéricos e indicadores',
      phraseLow: 'razonamiento numérico y manejo de indicadores',
      strength: 'Interpreta y calcula con precisión indicadores operativos: porcentajes, proporciones, variaciones y costos.',
      development: 'Se recomienda fortalecer el manejo de indicadores y cálculos operativos (porcentajes, rendimientos, variaciones) mediante capacitación práctica en Excel y análisis de KPI del área.',
      interviewFocus: 'Manejo de indicadores y datos numéricos',
      interviewQuestions: [
        '¿Qué indicadores has utilizado para medir tu trabajo o el de tu área? Explícame cómo se calculan.',
        'Cuéntame sobre una ocasión en la que detectaste un error en un cálculo, reporte o indicador.'
      ]
    },
    {
      key: 'atencion', name: 'Atención y Concentración', short: 'Atención',
      description: 'Detección de diferencias y errores, comparación de información e identificación de códigos.',
      phraseHigh: 'la precisión y la atención al detalle',
      phraseLow: 'atención al detalle y verificación de información',
      strength: 'Detecta diferencias y errores con precisión al comparar información, códigos y documentos.',
      development: 'Se recomienda fortalecer la atención al detalle mediante listas de verificación, doble revisión en tareas críticas y ejercicios de comparación de documentos y códigos.',
      interviewFocus: 'Atención al detalle y control de errores',
      interviewQuestions: [
        'Descríbeme qué mecanismos utilizas para evitar errores en tareas repetitivas o de alto volumen.',
        'Cuéntame sobre un error que detectaste antes de que llegara al cliente. ¿Cómo lo identificaste?'
      ]
    },
    {
      key: 'critico', name: 'Pensamiento Crítico', short: 'P. crítico',
      description: 'Evaluación de argumentos, identificación de supuestos, interpretación de datos y conclusiones válidas.',
      phraseHigh: 'el análisis objetivo de la información',
      phraseLow: 'análisis de información y evaluación de argumentos',
      strength: 'Evalúa la información de manera objetiva: distingue datos de supuestos, identifica conclusiones no sustentadas y cuestiona con fundamento.',
      development: 'Se recomienda fortalecer el pensamiento crítico mediante el análisis de casos, la práctica de separar hechos de supuestos y el uso de datos para sustentar conclusiones.',
      interviewFocus: 'Análisis de información y juicio basado en datos',
      interviewQuestions: [
        'Cuéntame sobre una ocasión en la que cuestionaste una conclusión o propuesta porque los datos no la sustentaban.',
        'Descríbeme cómo validas la información antes de tomar una decisión importante.'
      ]
    },
    {
      key: 'adaptabilidad', name: 'Adaptabilidad y Manejo de Situaciones', short: 'Adaptabilidad',
      description: 'Respuesta ante cambios, presión, ambigüedad, imprevistos y aprendizaje continuo.',
      phraseHigh: 'la adaptación a cambios y el manejo de la presión',
      phraseLow: 'manejo de la presión y adaptación al cambio',
      strength: 'Se ajusta con rapidez a cambios de prioridades, procesos o condiciones, y mantiene la estabilidad y el desempeño bajo presión.',
      development: 'Se recomienda fortalecer el manejo del cambio y de la presión mediante participación gradual en proyectos de mejora, rotación controlada de actividades y herramientas de manejo del estrés.',
      interviewFocus: 'Manejo de presión y adaptación al cambio',
      interviewQuestions: [
        'Cuéntame sobre un cambio importante en tu trabajo que al principio no te gustó. ¿Cómo lo manejaste?',
        'Descríbeme la situación de mayor presión que hayas vivido en el trabajo y cómo la resolviste.'
      ]
    }
  ];

  /* ---------------------------------------------------------------------------
   * CONFIGURACIÓN POR DEFECTO (editable desde el panel de administración;
   * los cambios se guardan en localStorage y pueden exportarse como JSON).
   * ------------------------------------------------------------------------- */
  ZTA.DEFAULT_CONFIG = {
    schemaVersion: 1,
    company: {
      name: 'ZEISS',
      platformName: 'ZEISS Talent Assessment',
      subtitle: 'Evaluación Integral de Competencias y Potencial',
      tagline: 'Esta evaluación nos ayudará a conocer tus principales fortalezas, estilo de trabajo y capacidades relacionadas con el puesto.',
      logoDataUrl: '',            // Reemplazar por el logo oficial (PNG/SVG en base64) desde el panel
      primaryDomain: 'zeiss.com'  // Solo se usa para advertir dominios distintos; nunca corrige
    },
    exam: {
      durationMinutes: 60,
      warningMinutes: [10, 5],
      idPrefix: 'ZA',
      allowBackWithinBattery: true,
      rapidResponseSeconds: 2.5  // Respuestas más rápidas que esto se consideran "muy rápidas"
    },
    delivery: {
      // URL del backend (ver /backend). Vacío = modo configuración: no se envía nada.
      apiEndpoint: '',
      emailRecipients: ['Candy.paramo@zeiss.com', 'Hugo.guerrero@zess.com'],
      whatsappRecipients: ['6633732713', '6643896885'],
      whatsappCountryCode: '52',
      emailSubjectTemplate: 'Evaluación Psicométrica | {candidato} | {puesto} | {id}'
    },
    // Índice Global = promedio ponderado de las 10 dimensiones (suma = 100)
    globalWeights: {
      personalidad: 10, liderazgo: 10, decisiones: 10, blandas: 10, integridad: 10,
      logico: 10, numerico: 10, atencion: 10, critico: 10, adaptabilidad: 10
    },
    // Perfiles de referencia. weights suma 100. critical = mínimos por dimensión.
    profiles: {
      operativo: {
        label: 'Operativo',
        weights: { personalidad: 12, liderazgo: 3, decisiones: 8, blandas: 12, integridad: 20, logico: 8, numerico: 10, atencion: 17, critico: 3, adaptabilidad: 7 },
        critical: { integridad: 50, atencion: 40 }
      },
      tecnico: {
        label: 'Técnico',
        weights: { personalidad: 8, liderazgo: 4, decisiones: 12, blandas: 8, integridad: 15, logico: 15, numerico: 13, atencion: 12, critico: 8, adaptabilidad: 5 },
        critical: { integridad: 50, logico: 40 }
      },
      administrativo: {
        label: 'Administrativo',
        weights: { personalidad: 10, liderazgo: 3, decisiones: 10, blandas: 12, integridad: 18, logico: 8, numerico: 14, atencion: 15, critico: 5, adaptabilidad: 5 },
        critical: { integridad: 50, atencion: 40 }
      },
      profesional: {
        label: 'Profesional',
        weights: { personalidad: 8, liderazgo: 7, decisiones: 13, blandas: 10, integridad: 15, logico: 12, numerico: 10, atencion: 5, critico: 13, adaptabilidad: 7 },
        critical: { integridad: 50, critico: 40 }
      },
      supervisor: {
        label: 'Supervisor',
        weights: { personalidad: 2, liderazgo: 20, decisiones: 15, blandas: 15, integridad: 15, logico: 5, numerico: 5, atencion: 3, critico: 10, adaptabilidad: 10 },
        critical: { integridad: 50, liderazgo: 45 }
      },
      coordinador: {
        label: 'Coordinador',
        weights: { personalidad: 5, liderazgo: 15, decisiones: 14, blandas: 16, integridad: 14, logico: 6, numerico: 6, atencion: 5, critico: 9, adaptabilidad: 10 },
        critical: { integridad: 50, blandas: 45 }
      },
      gerencial: {
        label: 'Gerencial',
        weights: { personalidad: 3, liderazgo: 22, decisiones: 18, blandas: 12, integridad: 15, logico: 4, numerico: 5, atencion: 1, critico: 12, adaptabilidad: 8 },
        critical: { integridad: 55, liderazgo: 50, decisiones: 45 }
      }
    },
    defaultProfile: 'supervisor',
    // Penalización a la compatibilidad por cada punto debajo de un mínimo crítico
    criticalPenaltyFactor: 0.5,
    // Clasificación del resultado psicométrico (herramienta complementaria)
    classification: {
      favorable: { global: 70, compatibility: 70, consistency: 70, integrity: 60 },
      unfavorable: { global: 50, compatibility: 50, integrity: 40 },
      minConsistencyForConclusion: 50, // debajo: siempre "requiere validación"
      minCompletion: 0.8               // debajo del 80% respondido: "requiere validación"
    },
    // Niveles descriptivos (ordenados de mayor a menor)
    levels: [
      { min: 90, label: 'Muy alto' },
      { min: 75, label: 'Alto' },
      { min: 60, label: 'Medio alto' },
      { min: 45, label: 'Medio' },
      { min: 30, label: 'Medio bajo' },
      { min: 0, label: 'Bajo' }
    ],
    security: {
      // SHA-256 de 'zta-admin:' + PIN. PIN por defecto: 2026 (cámbielo en el panel).
      adminPinHash: '2183cb9f410b2b1691e4eee77e0ae341737bc2b75186dde4e7eea867cd3ff206'
    },
    theme: {
      navy: '#0B1F3F', primary: '#1552D6', primaryDark: '#0E3A9C', primarySoft: '#E8EFFD',
      ink: '#101C31', muted: '#5A6A82', line: '#DFE5EE', surface: '#FFFFFF', bg: '#F3F5F9',
      success: '#177A4B', warning: '#8A5300', danger: '#B8322A',
      chartGrid: '#E4E9F1', chartMuted: '#A9B6C9'
    }
  };

  /* Textos de clasificación y leyendas institucionales */
  ZTA.TEXTS = {
    classification: {
      FAVORABLE: {
        label: 'FAVORABLE',
        text: 'Los resultados se ubican dentro de los criterios configurados para el perfil de referencia.'
      },
      VALIDACION: {
        label: 'REQUIERE VALIDACIÓN ADICIONAL',
        text: 'Algunos resultados requieren validación adicional mediante entrevista, referencias u otras evaluaciones antes de emitir una conclusión.'
      },
      NO_FAVORABLE: {
        label: 'NO FAVORABLE SEGÚN LOS CRITERIOS CONFIGURADOS',
        text: 'Los resultados se ubican por debajo de los criterios configurados para el perfil de referencia. Esta información debe considerarse junto con el resto del proceso.'
      }
    },
    complementary: 'Este resultado constituye una herramienta complementaria para el proceso de selección y debe interpretarse junto con experiencia, entrevista, referencias y demás evaluaciones aplicables.',
    methodology: 'Esta evaluación constituye una herramienta complementaria dentro del proceso de selección. Los resultados no representan un diagnóstico clínico ni deben utilizarse como único criterio para determinar una contratación. Para uso formal como instrumento psicométrico deberá realizarse un proceso de validación de confiabilidad y validez con la población correspondiente.',
    prototype: 'Prototipo funcional. Antes de utilizarse como instrumento psicométrico formal para decisiones de selección, el contenido debe someterse a procesos de validación, confiabilidad, validez de constructo, validez de criterio, análisis de ítems, calibración y revisión por profesionales especializados.',
    validationSteps: ['Validación', 'Confiabilidad', 'Validez de constructo', 'Validez de criterio', 'Análisis de ítems', 'Calibración', 'Revisión por profesionales especializados'],
    consent: 'Confirmo que he leído y acepto el aviso de privacidad y autorizo el tratamiento de mis datos para fines del proceso de selección.'
  };
})(typeof window !== 'undefined' ? window : globalThis);
