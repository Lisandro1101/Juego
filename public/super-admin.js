import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
// ⭐️⭐️⭐️ NUEVAS IMPORTACIONES DE AUTH ⭐️⭐️⭐️
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
// ⭐️⭐️⭐️ FIN NUEVAS IMPORTACIONES ⭐️⭐️⭐️
import { setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";
import { getDatabase, ref, set, onValue, remove, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// =======================================================================
// CONFIGURACIÓN DE FIREBASE
// =======================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDRsS6YQ481KQadSk8gf9QtxVt_asnrDlc", // Reemplaza con tus datos
  authDomain: "juegos-cumple.firebaseapp.com", // Reemplaza con tus datos
  databaseURL: "https://juegos-cumple-default-rtdb.firebaseio.com", // Reemplaza con tus datos
  projectId: "juegos-cumple", // Reemplaza con tus datos
  storageBucket: "juegos-cumple.firebasestorage.app", // Reemplaza con tus datos
  messagingSenderId: "595312538655", // Reemplaza con tus datos
  appId: "1:595312538655:web:93220a84570ff7461fd12a", // Reemplaza con tus datos
  measurementId: "G-V1YXNZXVQR" // Reemplaza con tus datos
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const functions = getFunctions(app); // ⭐️ NUEVO: Inicializar Firebase Functions

// ⭐️⭐️⭐️ INICIO: NUEVA LÓGICA DE AUTENTICACIÓN ⭐️⭐️⭐️
const auth = getAuth(app);

// ❗️❗️❗️ CAMBIA ESTO por tu email de super-administrador
const SUPER_ADMIN_EMAIL = "lisandrodileva@gmail.com"; 

// --- Referencias a los contenedores del HTML ---
const loginContainer = document.getElementById('login-container');
const panelAdmin = document.getElementById('panel-admin');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// ⭐️ NUEVO: Variable de control para asegurar una única inicialización
let isPanelInitialized = false;

/**
 * 1. Escuchar cambios de estado de Auth
 * Esto decide si mostrar el Login o el Panel de Admin
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario está logueado
        if (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            // Usuario logueado Y es el Super Admin
            loginContainer.style.display = 'none';
            panelAdmin.style.display = 'block';
            
            // Añadimos un botón de "Salir" si no existe
            if (!document.getElementById('logout-btn')) {
                panelAdmin.insertAdjacentHTML('afterbegin', '<button id="logout-btn" style="background: #ef4444; color: white; padding: 5px 10px; border-radius: 5px; float: right; cursor: pointer;">Salir</button>');
                document.getElementById('logout-btn').addEventListener('click', () => {
                    if (confirm("¿Seguro que quieres salir?")) {
                        signOut(auth);
                    }
                });
            }
            // ⭐️ CORREGIDO: Llamar a la inicialización solo una vez
            if (!isPanelInitialized) {
                initializeSuperAdminPanel();
                isPanelInitialized = true;
            }
        } else {
            // Usuario logueado, pero NO es el Super Admin (o user.email es nulo/indefinido)
            if (user.email) { // Solo desloguear si tenemos un email para comparar
                console.warn("Usuario logueado no es el Super Admin. Deslogueando:", user.email);
                signOut(auth);
            }
            loginContainer.style.display = 'block';
            panelAdmin.style.display = 'none';
        }
    } else {
        // No hay usuario logueado
        loginContainer.style.display = 'block';
        panelAdmin.style.display = 'none';
        isPanelInitialized = false; // Resetear el estado si el usuario se desloguea
    }
});

/**
 * 2. Manejador del formulario de login
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Ingresando...';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        // ⭐️ SOLUCIÓN DEFINITIVA: Forzar la persistencia LOCAL.
        // Esto evita que la sesión se cierre automáticamente después de un tiempo.
        // Debe llamarse ANTES de signInWithEmailAndPassword.
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged se encargará de mostrar el panel o dar error de permiso
    } catch (error) {
        console.error("Error de login:", error.message);
        loginError.textContent = "Error: Email o contraseña incorrectos."; // Esto solo se muestra si el login falla
    } finally {
        // ⭐️ CORRECCIÓN: Este bloque se ejecuta SIEMPRE, asegurando que el botón se reactive.
        // Esto soluciona el problema del botón atascado en "Ingresando...".
        submitButton.disabled = false;
        submitButton.textContent = 'Ingresar';
    }
});
// ⭐️⭐️⭐️ FIN: NUEVA LÓGICA DE AUTENTICACIÓN ⭐️⭐️⭐️

// ⭐️⭐️⭐️ INICIO: VARIABLES GLOBALES DEL PANEL ⭐️⭐️⭐️
// Se mueven aquí para que estén definidas antes de cualquier llamada.
let loadedThemeTemplates = {}; // Almacén para datos de plantillas
const themeTemplatesRef = ref(database, 'themeTemplates'); // Referencia a las plantillas de temas
// ⭐️⭐️⭐️ FIN: VARIABLES GLOBALES DEL PANEL ⭐️⭐️⭐️

// ⭐️⭐️⭐️ INICIO: FUNCIONES DE PLANTILLAS DE TEMAS (MOVIDAS FUERA) ⭐️⭐️⭐️
/**
 * Carga las plantillas de temas desde Firebase y las añade al selector.
 */
async function loadThemeTemplates() {
    const themeTemplateSelector = document.getElementById('theme-template-selector');
    if (!themeTemplateSelector) return; // Salir si el elemento no existe

    try {
        const snapshot = await get(themeTemplatesRef);
        if (snapshot.exists()) {
            loadedThemeTemplates = snapshot.val();
            themeTemplateSelector.innerHTML = '<option value="">-- Seleccionar Plantilla --</option>';
            snapshot.forEach(childSnapshot => {
                const templateId = childSnapshot.key;
                const option = document.createElement('option');
                option.value = templateId;
                option.textContent = templateId.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                themeTemplateSelector.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error cargando plantillas de temas:", error);
    }
}

/**
 * Muestra una previsualización de la plantilla de tema seleccionada.
 */
function showThemePreview() {
    const previewContainer = document.getElementById('theme-preview-container');
    const themeTemplateSelector = document.getElementById('theme-template-selector');
    const selectedTemplateId = themeTemplateSelector.value;

    if (!selectedTemplateId || !loadedThemeTemplates[selectedTemplateId]) {
        previewContainer.style.display = 'none';
        return;
    }

    const template = loadedThemeTemplates[selectedTemplateId];
    const theme = template.theme || {};

    document.getElementById('preview-color-primary').style.backgroundColor = theme.color_primary || '#FFFFFF';
    document.getElementById('preview-color-secondary').style.backgroundColor = theme.color_secondary || '#FFFFFF';
    document.getElementById('preview-color-text').style.backgroundColor = theme.color_text || '#000000';
    document.getElementById('preview-font').style.fontFamily = theme.font_family || 'sans-serif';
    document.getElementById('preview-button').style.backgroundColor = theme.btn_portal_bg || '#FACC15';
    document.getElementById('preview-button').style.color = theme.btn_portal_text_color || '#1F2937';

    previewContainer.style.display = 'block';
}

// ⭐️⭐️⭐️ FIN: FUNCIONES DE PLANTILLAS DE TEMAS ⭐️⭐️⭐️


// ⭐️⭐️⭐️ INICIO: CÓDIGO ORIGINAL ENVUELTO ⭐️⭐️⭐️
// Todo tu código original de super-admin.js va ahora
// dentro de esta función.
function initializeSuperAdminPanel() {

    // =======================================================================
    // ⭐️ FUNCIONES DE AYUDA PARA RGBA ⭐️ (Tu código original)
    // =======================================================================

    /**
     * Convierte un color Hex (ej: #FF0000) y una opacidad (ej: 0.8) a un string rgba().
     * @param {string} hex - El color en formato hexadecimal.
     * @param {number | string} opacity - La opacidad (0.1 a 1.0).
     * @returns {string} - El color en formato rgba().
     */
    function hexToRgba(hex, opacity = 1) {
        if (!hex || hex === '') return null; // No convertir si no hay color
        
        // Expandir formato corto (ej. "03F") a formato completo (ej. "0033FF")
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) {
            console.warn("Formato hex inválido:", hex);
            return hex; // Devolver el valor original si no es un hex válido
        }
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        // Si la opacidad es 1, devolver el hex original (más limpio)
        if (parseFloat(opacity) === 1) {
            return hex;
        }
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    /**
     * Convierte un string rgba() (ej: rgba(255, 0, 0, 0.8)) a un objeto { hex, opacity }.
     * @param {string} rgba - El string de color.
     * @returns {{hex: string, opacity: string}} - El color hex y la opacidad.
     */
    function rgbaToHexAndOpacity(rgba) {
        if (!rgba || rgba === '') return { hex: '#FFFFFF', opacity: '1.0' };

        // Caso 1: Ya es un color Hex (opacidad 1)
        if (rgba.startsWith('#')) {
            return { hex: rgba, opacity: '1.0' };
        }
        
        // Caso 2: Es un string rgba()
        let match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) {
            console.warn("Formato rgba inválido, usando defaults:", rgba);
            return { hex: '#FFFFFF', opacity: '1.0' }; // Valor por defecto
        }

        // Convertir R, G, B a Hex
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        const hex = `#${r}${g}${b}`;
        
        // Obtener opacidad (si no existe, es 1.0)
        const opacity = match[4] !== undefined ? match[4] : '1.0';

        return { hex, opacity };
    }

    /**
     * ⭐️ NUEVO: Rellena los <select> de emojis
     */
    function populateEmojiSelectors() {
        // ⭐️ LISTA DE EMOJIS AMPLIADA Y CATEGORIZADA ⭐️
        const emojiList = [
            // Caritas y Emociones
            '😊', '🥳', '❤️', '👍', '😂', '😮', '😢', '😡', '🥰', '😍', '🤔', '😎', '🎉', '🤩', '🤯', '😉', '😘', '😜', '😇', '😂', '🤣', '🥺', '🙏',
            // Personas y Fantasía
            '🐝', '🧜‍♀️', '👑', '🦸', '🧑‍🚀', '👨‍👩‍👧‍👦', '👰', '🤵', '💍', '🤴', '👸', '👨‍🎤', '👩‍🎤', '💃', '🕺', '👶', '👧', '👦', '👨', '👩', '👻', '👽', '🤖', '🤠',
            // Comida y Bebida
            '🎂', '🍰', '🍾', '🥂', '🍕', '🍔', '🍿', '🍩', '🍭', '🍓', '🍉', '🍹', '🍺', '🍷', '🍇', '🍈', '🍊', '🍋', '🍌', '🍍', '🍎', '🍏', '🍐', '🍑', '🍒', '🥝', '🥑',
            // Animales y Naturaleza
            '🐙', '🐠', '🐚', '🌸', '🌻', '🌳', '⭐️', '⚡️', '🌈', '☀️', '🌙', '🔥', '🌊', '🐶', '🐱', '🦄', '🦋', '🐞', '🐢', '🐍', '🐳', '🐬', '🦖', '🦕', '🦁', '🐯', '🐻', '🐼', '🐵',
            // Eventos y Celebración
            '🎁', '🎈', '🎊', '🎀', '🎶', '🎵', '🎤', '📢', '✉️', '💌', '🎄', '🎃', '🎇', '🎆', '✨',
            // Juegos y Actividades
            '🎲', '🕹️', '✍️', '🧠', '💀', '🏆', '❓', '🎯', '🧩', '🎮', '🚀', '🚗', '⚡', '⚽', '🏀', '🏈', '⚾', '🎾', '🎳', '🎱',
            // Objetos y Símbolos
            '💎', '📸', '🎥', '💬', '💖', '🍯', '🛠️', '🤫', '🔑', '💰', '✔️', '❌', '➕', '➖', '💯', '💡', '💣', '📖', '✏️', '📎', '📌', '🔔', '📣',
            // Viajes y Lugares
            '✈️', '🏝️', '🗺️', '🌍', '🏔️', '🏠', '🏰', '🗼', '🗽', '🎡', '🎢',
            // Banderas Populares
            '🇦🇷', '🇪🇸', '🇲🇽', '🇺🇸', '🇧🇷', '🇮🇹', '🇨🇱', '🇨🇴', '🇵🇪', '🇺🇾'
        ];

        // Eliminar duplicados (si los hubiera) y ordenar
        const uniqueSortedEmojis = [...new Set(emojiList)].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));

        const selectors = document.querySelectorAll('select[id^="icon-"]');
        
        selectors.forEach(selector => {
            selector.innerHTML = ''; // Limpiar opciones previas

            // ⭐️ AÑADIDO: Opción para no tener emoji
            const noEmojiOption = document.createElement('option');
            noEmojiOption.value = '';
            noEmojiOption.textContent = 'Vacío';
            selector.appendChild(noEmojiOption);

            uniqueSortedEmojis.forEach(emoji => {
                const option = document.createElement('option');
                option.value = emoji;
                option.textContent = emoji;
                selector.appendChild(option);
            });
        });
    }

    /**
     * ⭐️ NUEVO: Rellena el <datalist> para el input de fuentes.
     * Esto proporciona sugerencias de fuentes al hacer clic en el campo.
     */
    function populateFontDatalist() {
        const fontDatalist = document.getElementById('font-family-list');
        if (!fontDatalist) return;

        // Lista de fuentes populares de Google Fonts
        const fontList = [
            // Fuente estilo Pokémon / Retro
            "'Pokemon Solid', sans-serif", // ⭐️ ¡NUEVA FUENTE PERSONALIZADA! ⭐️
            "'Press Start 2P', cursive",

            // Fuentes de Series Animadas / Caricaturas
            "'Luckiest Guy', cursive",
            "'Bangers', cursive",
            "'Creepster', cursive", // Estilo terror

            // Fuentes Sans-Serif (Modernas, limpias)
            "'Inter', sans-serif",
            "'Roboto', sans-serif",
            "'Lato', sans-serif",
            "'Montserrat', sans-serif",
            "'Open Sans', sans-serif",
            "'Poppins', sans-serif",
            "'Nunito', sans-serif",
            "'Oswald', sans-serif",
            "'Anton', sans-serif",
            "'Righteous', cursive", // Art-deco style

            // Fuentes Serif (Clásicas, con remates)
            "'Merriweather', serif",
            "'Playfair Display', serif",
            "'Lora', serif",
            "'PT Serif', serif",
            "'EB Garamond', serif"

            // Fuentes Display (Decorativas, para títulos)
            // "'Lobster', cursive", // Ya está en la lista con 'cursive'
            // "'Pacifico', cursive", // Ya está en la lista con 'cursive'
            // "'Caveat', cursive", // Ya está en la lista con 'cursive'

            // Fuentes Monospace (Estilo código)
            // "'Roboto Mono', monospace" // Ya está en la lista con 'monospace'
        ];

        fontDatalist.innerHTML = ''; // Limpiar opciones previas
        fontList.forEach(font => fontDatalist.innerHTML += `<option value="${font}"></option>`);
    }

    // =======================================================================
    // LÓGICA PRINCIPAL DEL SUPER-ADMIN (Tu código original)
    // ⭐️ MODIFICACIÓN: Quité el 'DOMContentLoaded' que envolvía esto.
    //    Ahora se ejecuta cuando 'initializeSuperAdminPanel' es llamada.
    // =======================================================================

    // 1. DEFINIR VARIABLES DEL FORMULARIO
    const form = document.getElementById('event-form');
    const saveBtn = document.getElementById('save-event-btn');
    const statusMsg = document.getElementById('status-message');
    const eventIdInput = document.getElementById('event-id');
    const loadEventBtn = document.getElementById('load-event-btn'); // ⭐️ NUEVO: Botón para cargar

    // 2. VARIABLES PARA LA LISTA DE EVENTOS
    const eventsListElement = document.getElementById('existing-events-list');
// ⭐️ NUEVO: Lógica para plantillas de temas (MOVIDO ARRIBA)
const themeTemplateSelector = document.getElementById('theme-template-selector');
const applyTemplateBtn = document.getElementById('apply-template-btn');

    // 3. ASIGNAR EVENTOS
    loadEventBtn.addEventListener('click', loadEventSettings); // ⭐️ NUEVO: Evento para el botón
    form.addEventListener('submit', handleFormSubmit);
    onValue(ref(database, 'events'), renderEventsList); // ⭐️ CORREGIDO: Usar la referencia directamente
    eventsListElement.addEventListener('click', handleListClick); 
    populateEmojiSelectors(); // ⭐️ NUEVO: Llenar los selectores de emojis al iniciar
    populateFontDatalist(); // ⭐️ NUEVO: Llenar el datalist de fuentes
    themeTemplateSelector.addEventListener('change', showThemePreview); // ⭐️ NUEVO: Evento para previsualizar
    loadThemeTemplates(); // Cargar plantillas al iniciar el panel
    applyTemplateBtn.addEventListener('click', applyThemeTemplate);


    /**
     * Carga los settings de un Evento
     */
    async function loadEventSettings(eventIdToLoad) {
        let eventId;
        // Si la función recibe un ID directamente (desde la lista), lo usa.
        // Si no (desde el botón 'Buscar/Cargar'), toma el valor del input.
        if (typeof eventIdToLoad === 'string') {
            eventId = eventIdToLoad;
        } else {
            eventId = eventIdInput.value.trim().toLowerCase();
        }

        if (!eventId) return;

        statusMsg.textContent = `Buscando configuración para "${eventId}"...`;
        const configRef = ref(database, `events/${eventId}/config`);

        try {
            const snapshot = await get(configRef);
            if (snapshot.exists()) {
                const config = snapshot.val();
                populateForm(config); 
                statusMsg.textContent = `Configuración de "${eventId}" cargada. Lista para modificar.`;
            } else {
                statusMsg.textContent = `Evento "${eventId}" no encontrado. Se creará uno nuevo con esta configuración.`;
                resetFormToDefaults(); 
            }
        } catch (error) {
            console.error("Error cargando configuración:", error);
            statusMsg.textContent = `Error al buscar la configuración: ${error.message}`;
        }
    }

    // Esta función depende de `populateForm`, por lo que debe permanecer o definirse aquí.
    async function applyThemeTemplate() {
        const themeTemplateSelector = document.getElementById('theme-template-selector');
        const selectedTemplateId = themeTemplateSelector.value;
        if (!selectedTemplateId) return;

        const templateRef = ref(database, `themeTemplates/${selectedTemplateId}`);
        const snapshot = await get(templateRef);
        if (snapshot.exists()) {
            populateForm(snapshot.val()); // Aplicar la plantilla COMPLETA
            statusMsg.textContent = `Plantilla "${selectedTemplateId}" aplicada al formulario.`;
        }
    }

    /**
     * ⭐️ NUEVO: Obtiene el valor de un elemento de forma segura.
     * @param {string} id - El ID del elemento HTML.
     * @param {string} [property='value'] - La propiedad a leer (ej: 'value', 'checked').
     * @returns {*} El valor de la propiedad o `undefined` si no se encuentra.
     */
    function getValue(id, property = 'value') {
        const element = document.getElementById(id);
        return element ? element[property] : undefined;
    }

    /**
     * ⭐️ NUEVO: Asigna un valor a la propiedad de un elemento de forma segura.
     * Evita errores si el elemento no existe en el HTML.
     * @param {string} id - El ID del elemento HTML.
     * @param {string} value - El valor a asignar.
     * @param {string} [property='value'] - La propiedad a modificar (ej: 'value', 'checked').
     */
    function safeSet(id, value, property = 'value') {
        const element = document.getElementById(id);
        if (element) {
            element[property] = value;
        }
    }

    /**
     * Rellena el formulario con datos de Firebase
     */
    function populateForm(config) {
        // Extraer secciones con valores por defecto
        const theme = config.theme || {};
        const features = config.features || {};
        const status = config.status || {};
        const texts = config.texts || {};
        const icons = theme.icons || {};
        // ⭐️ NUEVO: Extraer la configuración de autenticación
        const authConfig = config.auth || {};

        // Rellenar Funcionalidades y Estado
        safeSet('games-enabled', features.games_enabled !== false, 'checked');
        safeSet('event-active', status.is_active !== false, 'checked');


        // Rellenar Tema Global
        // ⭐️ NUEVO: Rellenar campos de autenticación
        safeSet('auth-event-username', authConfig.username || '');
        safeSet('auth-event-password', authConfig.password || '');

        safeSet('color-primary', theme.color_primary || '#FACC15');
        safeSet('color-secondary', theme.color_secondary || '#F59E0B');
        safeSet('color-text', theme.color_text || '#1F2937');
        safeSet('color-success', theme.color_success || '#4CAF50');
        safeSet('color-danger', theme.color_danger || '#E53935');
        safeSet('color-text-light', theme.color_text_light || '#FFFFFF');
        safeSet('font-family', theme.font_family || "'Inter', sans-serif");
        safeSet('btn-shadow', theme.btn_shadow || '0 5px');

        // ⭐️ NUEVO: Rellenar contorno de texto
        safeSet('text-stroke-width', theme.text_stroke_width || '');
        safeSet('text-stroke-color', theme.text_stroke_color || '#000000');

        // Rellenar Textos
        safeSet('text-portal-greeting', texts.portal_greeting || '¡Bienvenido a la Colmena!');
        safeSet('text-portal-greeting-color', texts.portal_greeting_color || '#6B7280');
        safeSet('text-portal-greeting-font-size', texts.portal_greeting_font_size || '');
        safeSet('text-portal-greeting-font-family', texts.portal_greeting_font_family || '');
        safeSet('text-portal-greeting-letter-spacing', texts.portal_greeting_letter_spacing || '');
        safeSet('text-portal-greeting-stroke-width', texts.portal_greeting_stroke_width || '');
        safeSet('text-portal-greeting-stroke-color', texts.portal_greeting_stroke_color || '#000000');

        safeSet('text-portal-title', texts.portal_title || 'Portal de Recuerdos 🍯');
        safeSet('portal-title-color', theme.portal_title_color || '#1F2937');
        safeSet('portal-title-font-size', theme.portal_title_font_size || '');
        safeSet('text-portal-title-font-family', texts.portal_title_font_family || '');
        safeSet('text-portal-title-letter-spacing', texts.portal_title_letter_spacing || '');
        safeSet('text-portal-title-stroke-width', texts.portal_title_stroke_width || '');
        safeSet('text-portal-title-stroke-color', texts.portal_title_stroke_color || '#000000');

        safeSet('text-portal-subtitle', texts.portal_subtitle || 'Deja un mensaje, una foto o video capturado.');
        safeSet('text-portal-subtitle-color', texts.portal_subtitle_color || '#4B5563');
        safeSet('text-portal-subtitle-font-size', texts.portal_subtitle_font_size || '');
        safeSet('text-portal-subtitle-font-family', texts.portal_subtitle_font_family || '');
        safeSet('text-portal-subtitle-letter-spacing', texts.portal_subtitle_letter_spacing || '');
        safeSet('text-portal-subtitle-stroke-width', texts.portal_subtitle_stroke_width || '');
        safeSet('text-portal-subtitle-stroke-color', texts.portal_subtitle_stroke_color || '#000000');

        safeSet('text-memories-section-title', texts.memories_section_title || 'Deja tu Recuerdo');
        safeSet('text-memories-section-title-color', texts.memories_section_title_color || '#1F2937');
        safeSet('text-memories-section-title-font-family', texts.memories_section_title_font_family || '');
        safeSet('text-memories-section-title-letter-spacing', texts.memories_section_title_letter_spacing || '');
        safeSet('text-memories-section-title-stroke-width', texts.memories_section_title_stroke_width || '');
        safeSet('text-memories-section-title-stroke-color', texts.memories_section_title_stroke_color || '#000000');

        safeSet('text-memories-list-title', texts.memories_list_title || 'Recuerdos de la Colmena');
        safeSet('text-memories-list-title-color', texts.memories_list_title_color || '#4B5563');
        safeSet('text-memories-list-title-font-size', texts.memories_list_title_font_size || '');
        safeSet('text-memories-list-title-font-family', texts.memories_list_title_font_family || '');
        safeSet('text-memories-list-title-letter-spacing', texts.memories_list_title_letter_spacing || '');
        safeSet('text-memories-list-title-stroke-width', texts.memories_list_title_stroke_width || '');
        safeSet('text-memories-list-title-stroke-color', texts.memories_list_title_stroke_color || '#000000');

        // ⭐️ NUEVO: Rellenar textos de botones de juegos
        safeSet('text-juegos-menu-trivia', texts.juegos_menu_trivia || '¿Cuanto conoces a Amo?');
        safeSet('text-juegos-menu-memory', texts.juegos_menu_memory || 'Memoria con Amo');
        safeSet('text-juegos-menu-hangman', texts.juegos_menu_hangman || 'Ahorcado');


        // Rellenar Iconos
        safeSet('icon-main', icons.icon_main || '🐝');
        safeSet('icon-portal', icons.icon_portal || '💬');
        safeSet('icon-trivia', icons.icon_trivia || '✍️');
        safeSet('icon-memory', icons.icon_memory || '🧠');
        safeSet('icon-hangman', icons.icon_hangman || '💀');
        safeSet('icon-ranking', icons.icon_ranking || '🏆');
        safeSet('icon-win', icons.icon_win || '🎉');
        safeSet('icon-games', icons.icon_games || '🕹️');
        safeSet('icon-like', icons.icon_like || '❤️');
        safeSet('icon-memories', icons.icon_memories || '💖');


        // Rellenar Personalización del Portal
        // ⭐️ MODIFICADO: Usar la función de conversión para 'portal_bg'
        const portalBg = rgbaToHexAndOpacity(theme.portal_bg);
        safeSet('portal-bg', portalBg.hex);
        safeSet('portal-bg-opacity', portalBg.opacity);
        
        safeSet('portal-border-radius', theme.portal_border_radius || '');
        safeSet('portal-title-color', theme.portal_title_color || '#1F2937');
        safeSet('btn-portal-bg', theme.btn_portal_bg || '#FACC15');
        safeSet('btn-portal-text-color', theme.btn_portal_text_color || '#1F2937');
        safeSet('btn-portal-border-radius', theme.btn_portal_border_radius || '');
        safeSet('btn-portal-shadow-color', theme.btn_portal_shadow_color || '#F59E0B');
        safeSet('btn-portal-shadow-color-hover', theme.btn_portal_shadow_color_hover || '#dd6b20');
        safeSet('btn-portal-font-family', theme.btn_portal_font_family || '');
        safeSet('btn-portal-text-stroke-width', theme.btn_portal_text_stroke_width || '');
        safeSet('btn-portal-text-stroke-color', theme.btn_portal_text_stroke_color || '#000000');

        // ⭐️ NUEVO: Rellenar Personalización de Botones del Menú de Juegos
        safeSet('btn-juegos-menu-bg', theme.btn_juegos_menu_bg || '#66BB6A');
        safeSet('btn-juegos-menu-text-color', theme.btn_juegos_menu_text_color || '#FFFFFF');
        safeSet('btn-juegos-menu-border-color', theme.btn_juegos_menu_border_color || '#388E3C');
        safeSet('btn-juegos-menu-shadow-color', theme.btn_juegos_menu_shadow_color || '#388E3C');
        safeSet('btn-juegos-menu-border-radius', theme.btn_juegos_menu_border_radius || '');
        safeSet('btn-juegos-menu-font-family', theme.btn_juegos_menu_font_family || '');
        safeSet('btn-juegos-menu-text-stroke-width', theme.btn_juegos_menu_text_stroke_width || '');
        safeSet('btn-juegos-menu-text-stroke-color', theme.btn_juegos_menu_text_stroke_color || '#000000');

        // ⭐️ NUEVO: Rellenar Personalización de Trivia (Contenedor y Textos)
        const triviaContainerBg = rgbaToHexAndOpacity(theme.trivia_container_bg);
        safeSet('trivia-container-bg', triviaContainerBg.hex);
        safeSet('trivia-container-bg-opacity', triviaContainerBg.opacity);
        safeSet('trivia-container-border-radius', theme.trivia_container_border_radius || '');
        safeSet('text-trivia-title', texts.trivia_title || 'Trivia del Evento 🐝');
        safeSet('text-trivia-welcome', texts.trivia_welcome || '¡Bienvenido a la Colmena!');
        safeSet('text-trivia-subtitle', texts.trivia_subtitle || '¿Cuanto sabes de Amo?');
        safeSet('text-trivia-title-font-family', texts.trivia_title_font_family || '');
        safeSet('text-trivia-title-stroke-width', texts.trivia_title_stroke_width || '');
        safeSet('text-trivia-title-stroke-color', texts.trivia_title_stroke_color || '#000000');
        safeSet('text-trivia-title-letter-spacing', texts.trivia_title_letter_spacing || '');
        safeSet('text-trivia-welcome-font-family', texts.trivia_welcome_font_family || '');
        safeSet('text-trivia-welcome-letter-spacing', texts.trivia_welcome_letter_spacing || '');
        safeSet('text-trivia-start-button', texts.trivia_start_button || 'INICIAR JUEGO');
        safeSet('text-trivia-next-button', texts.trivia_next_button || 'Siguiente Pregunta');

        // Rellenar Personalización de Trivia
        safeSet('btn-trivia-bg', theme.btn_trivia_bg || '#ffb300');
        safeSet('btn-trivia-bg-hover', theme.btn_trivia_bg_hover || '#ff9900');
        safeSet('btn-trivia-text-color', theme.btn_trivia_text_color || '#FFFFFF');
        safeSet('btn-trivia-border-color', theme.btn_trivia_border_color || '#e69900');
        safeSet('btn-trivia-shadow-color', theme.btn_trivia_shadow_color || '#e69900');
        safeSet('btn-trivia-border-radius', theme.btn_trivia_border_radius || '');
        safeSet('btn-trivia-font-size', theme.btn_trivia_font_size || '');
        safeSet('btn-trivia-padding', theme.btn_trivia_padding || '');
        safeSet('btn-trivia-font-family', theme.btn_trivia_font_family || '');
        safeSet('btn-trivia-text-stroke-width', theme.btn_trivia_text_stroke_width || '');
        safeSet('btn-trivia-text-stroke-color', theme.btn_trivia_text_stroke_color || '#000000');

        // Rellenar Personalización de Memoria
        const memoryContainerBg = rgbaToHexAndOpacity(theme.memory_container_bg);
        safeSet('memory-container-bg', memoryContainerBg.hex);
        safeSet('memory-container-bg-opacity', memoryContainerBg.opacity);
        safeSet('memory-container-border-radius', theme.memory_container_border_radius || '');
        safeSet('text-memory-title', texts.memory_title || 'Juego de Memoria 🧠');
        safeSet('text-memory-title-font-family', texts.memory_title_font_family || '');
        safeSet('text-memory-title-letter-spacing', texts.memory_title_letter_spacing || '');
        safeSet('text-memory-title-stroke-width', texts.memory_title_stroke_width || '');
        safeSet('text-memory-title-stroke-color', texts.memory_title_stroke_color || '#000000');
        safeSet('text-memory-start-button', texts.memory_start_button || '¡Comenzar!');

        // Rellenar Personalización de Memoria (Cartas)
        safeSet('mem-card-back-bg', theme.mem_card_back_bg || '#F59E0B');
        safeSet('mem-card-back-border-color', theme.mem_card_back_border_color || '#1F2937');
        safeSet('mem-card-height', theme.mem_card_height || '');
        safeSet('mem-card-border-radius', theme.mem_card_border_radius || '');

        // ⭐️ NUEVO: Rellenar Personalización de Ahorcado
        const hangmanContainerBg = rgbaToHexAndOpacity(theme.hangman_container_bg);
        safeSet('hangman-container-bg', hangmanContainerBg.hex);
        safeSet('hangman-container-bg-opacity', hangmanContainerBg.opacity);
        safeSet('hangman-container-border-radius', theme.hangman_container_border_radius || '');
        safeSet('text-hangman-title', texts.hangman_title || 'El Ahorcado 💀');
        safeSet('text-hangman-subtitle', texts.hangman_subtitle || 'Adivina la palabra secreta...');
        safeSet('text-hangman-title-font-family', texts.hangman_title_font_family || '');
        safeSet('text-hangman-title-letter-spacing', texts.hangman_title_letter_spacing || '');
        safeSet('text-hangman-title-stroke-width', texts.hangman_title_stroke_width || '');
        safeSet('text-hangman-title-stroke-color', texts.hangman_title_stroke_color || '#000000');
        safeSet('text-hangman-subtitle-font-family', texts.hangman_subtitle_font_family || '');
        safeSet('text-hangman-subtitle-letter-spacing', texts.hangman_subtitle_letter_spacing || '');
        safeSet('text-hangman-start-button', texts.hangman_start_button || '¡Comenzar!');

        safeSet('btn-hangman-bg', theme.btn_hangman_bg || '#FACC15');
        safeSet('btn-hangman-text-color', theme.btn_hangman_text_color || '#1F2937');
        safeSet('btn-hangman-border-color', theme.btn_hangman_border_color || '#F59E0B');
        safeSet('btn-hangman-shadow-color', theme.btn_hangman_shadow_color || '#F59E0B');
        safeSet('btn-hangman-font-family', theme.btn_hangman_font_family || '');
        safeSet('btn-hangman-text-stroke-width', theme.btn_hangman_text_stroke_width || '');
        safeSet('btn-hangman-text-stroke-color', theme.btn_hangman_text_stroke_color || '#000000');

        // Rellenar Personalización de Rankings
        const rankingContainerBg = rgbaToHexAndOpacity(theme.ranking_container_bg);
        safeSet('ranking-container-bg', rankingContainerBg.hex);
        safeSet('ranking-container-bg-opacity', rankingContainerBg.opacity);
        safeSet('ranking-container-border-radius', theme.ranking_container_border_radius || '');
        safeSet('text-ranking-title', texts.ranking_title || 'Rankings de la Colmena 🏆');
        safeSet('text-ranking-title-font-family', texts.ranking_title_font_family || '');
        safeSet('text-ranking-title-letter-spacing', texts.ranking_title_letter_spacing || '');
        safeSet('text-ranking-title-stroke-width', texts.ranking_title_stroke_width || '');
        safeSet('text-ranking-title-stroke-color', texts.ranking_title_stroke_color || '#000000');

        // Rellenar Personalización de Rankings (Ganadores)
        safeSet('ranking-trivia-winner-bg', theme.ranking_trivia_winner_bg || '#FFCC00');
        safeSet('ranking-trivia-winner-text', theme.ranking_trivia_winner_text || '#1F2937');
        safeSet('ranking-trivia-winner-border', theme.ranking_trivia_winner_border || '#F59E0B');
        safeSet('ranking-memory-winner-bg', theme.ranking_memory_winner_bg || '#cceeff');
        safeSet('ranking-memory-winner-text', theme.ranking_memory_winner_text || '#0056b3');
        safeSet('ranking-memory-winner-border', theme.ranking_memory_winner_border || '#007bff');

        // ⭐️ NUEVO: Rellenar Personalización de Anfitrión
        safeSet('host-container-bg', theme.host_container_bg || '#FFFFFF');
        safeSet('host-container-border-radius', theme.host_container_border_radius || '');
        safeSet('text-host-login-title', texts.host_login_title || 'Acceso de Anfitrión');
        safeSet('text-host-login-subtitle', texts.host_login_subtitle || 'Ingresa para administrar tu evento.');
        safeSet('text-host-panel-title', texts.host_panel_title || 'Panel de Control');
        safeSet('text-host-document-title', texts.host_document_title || 'Panel de Anfitrión');
        safeSet('btn-host-bg', theme.btn_host_bg || '#1F2937');
        safeSet('btn-host-text-color', theme.btn_host_text_color || '#FACC15');
        safeSet('btn-host-border-color', theme.btn_host_border_color || '#FACC15');
        safeSet('btn-host-font-family', theme.btn_host_font_family || '');
        safeSet('btn-host-text-stroke-width', theme.btn_host_text_stroke_width || '');
        safeSet('btn-host-text-stroke-color', theme.btn_host_text_stroke_color || '#000000');

        // Rellenar previsualización de imagen
        const preview = document.getElementById('bg-image-preview');
        if (theme.background_image_url) {
            preview.innerHTML = `
                <p class="text-xs text-gray-600">Fondo actual:</p>
                <img src="${theme.background_image_url}" class="w-full h-24 object-cover rounded-lg border border-gray-300">
            `;
        } else {
            preview.innerHTML = '';
        }

        // ⭐️ NUEVO: Rellenar ajuste y posición de fondo
        safeSet('background-image-size', theme.background_image_size || 'cover');
        safeSet('background-image-position', theme.background_image_position || 'center');

        // ⭐️ NUEVO: Rellenar campos de stickers (lógica mejorada)
        const populateStickerFields = (type, index, stickerData) => {
            const s = stickerData || {};
            safeSet(`sticker_${type}_${index}_file`, '');
            safeSet(`sticker_${type}_${index}_width`, s.width || '');
            safeSet(`sticker_${type}_${index}_transform`, s.transform || '');
            safeSet(`sticker_${type}_${index}_top`, s.top || '');
            safeSet(`sticker_${type}_${index}_bottom`, s.bottom || '');
            safeSet(`sticker_${type}_${index}_left`, s.left || '');
            safeSet(`sticker_${type}_${index}_right`, s.right || '');

            const preview = document.getElementById(`sticker_${type}_${index}_preview`);
            if (s.url) {
                preview.innerHTML = `<p class="text-xs text-gray-600">Sticker Actual:</p><img src="${s.url}" class="h-20 object-contain rounded-lg border border-gray-300 p-1">`;
            } else {
                preview.innerHTML = '';
            }
        };

        populateStickerFields('portal', 1, theme.portal_stickers?.[0]);
        populateStickerFields('portal', 2, theme.portal_stickers?.[1]);
        populateStickerFields('juegos', 1, theme.juegos_stickers?.[0]);
        populateStickerFields('juegos', 2, theme.juegos_stickers?.[1]);

        safeSet('bg-image', '');
    }

    /**
     * Limpia el formulario a sus valores por defecto
     */
    function resetFormToDefaults() {
        form.reset(); 
        document.getElementById('games-enabled').checked = true;
        document.getElementById('event-active').checked = true;
        const preview = document.getElementById('bg-image-preview');
        if (preview) preview.innerHTML = '';
        // ⭐️ NUEVO: Limpiar todas las previsualizaciones de stickers
        ['portal_1', 'portal_2', 'juegos_1', 'juegos_2'].forEach(id => {
            const stickerPreview = document.getElementById(`sticker_${id}_preview`);
            if (stickerPreview) stickerPreview.innerHTML = '';
        });
        // ⭐️ Resetear el slider de opacidad
        document.getElementById('portal-bg-opacity').value = '1.0';
    }


    /**
     * Maneja el envío del formulario para crear/actualizar un evento
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        saveBtn.disabled = true;
        statusMsg.textContent = 'Guardando...';

        const eventId = document.getElementById('event-id').value.trim().toLowerCase();
        if (!eventId) {
            alert('El ID del Evento es obligatorio.');
            statusMsg.textContent = 'Error: Falta ID del Evento.';
            saveBtn.disabled = false;
            return;
        }
        
        // ⭐️ MODIFICADO: Combinar 'portal_bg' y 'portal_bg_opacity'
        const portalBgColor = getValue('portal-bg');
        const portalBgOpacity = getValue('portal-bg-opacity');
        const portalBgRgba = hexToRgba(portalBgColor, portalBgOpacity);

        const themeConfig = {
            // Tema Global
            color_primary: getValue('color-primary'),
            color_secondary: getValue('color-secondary'),
            color_text: getValue('color-text'),
            color_success: getValue('color-success'),
            color_danger: getValue('color-danger'),
            color_text_light: getValue('color-text-light'),
            font_family: getValue('font-family'),
            btn_shadow: (getValue('btn-shadow') || '').trim() || null,
            
            // ⭐️ NUEVO: Guardar contorno de texto
            text_stroke_width: (getValue('text-stroke-width') || '').trim() || null,
            text_stroke_color: getValue('text-stroke-color'),

            // ⭐️ NUEVO: Guardar ajuste y posición de fondo
            background_image_size: getValue('background-image-size'),
            background_image_position: getValue('background-image-position'),

            icons: {
                icon_main: getValue('icon-main') || '🐝',
                icon_portal: getValue('icon-portal') || '🎁',
                icon_trivia: getValue('icon-trivia') || '✍️',
                icon_memory: getValue('icon-memory') || '🧠',
                icon_hangman: getValue('icon-hangman') || '💀',
                icon_ranking: getValue('icon-ranking') || '🏆',
                icon_win: getValue('icon-win') || '🎉',
                icon_games: getValue('icon-games') || '🕹️',
                icon_memories: getValue('icon-memories') || '💖',
                icon_like: getValue('icon-like') || '❤️'
            },
            
            // Personalización del Portal
            portal_bg: portalBgRgba, // ⭐️ Guardar el valor combinado
            portal_border_radius: (getValue('portal-border-radius') || '').trim() || null,
            portal_title_color: getValue('portal-title-color'),
            portal_title_font_size: (getValue('portal-title-font-size') || '').trim() || null,
            btn_portal_bg: getValue('btn-portal-bg'),
            btn_portal_text_color: getValue('btn-portal-text-color'),
            btn_portal_border_radius: (getValue('btn-portal-border-radius') || '').trim() || null,
            btn_portal_shadow_color: getValue('btn-portal-shadow-color'),
            btn_portal_shadow_color_hover: getValue('btn-portal-shadow-color-hover'),
            btn_portal_font_family: (getValue('btn-portal-font-family') || '').trim() || null,
            btn_portal_text_stroke_width: (getValue('btn-portal-text-stroke-width') || '').trim() || null,
            btn_portal_text_stroke_color: (getValue('btn-portal-text-stroke-color') || '').trim() || null,

            // ⭐️ NUEVO: Personalización de Botones del Menú de Juegos
            btn_juegos_menu_bg: (getValue('btn-juegos-menu-bg') || '').trim() || null,
            btn_juegos_menu_text_color: (getValue('btn-juegos-menu-text-color') || '').trim() || null,
            btn_juegos_menu_border_color: (getValue('btn-juegos-menu-border-color') || '').trim() || null,
            btn_juegos_menu_shadow_color: (getValue('btn-juegos-menu-shadow-color') || '').trim() || null,
            btn_juegos_menu_border_radius: (getValue('btn-juegos-menu-border-radius') || '').trim() || null,
            btn_juegos_menu_font_family: (getValue('btn-juegos-menu-font-family') || '').trim() || null,
            btn_juegos_menu_text_stroke_width: (getValue('btn-juegos-menu-text-stroke-width') || '').trim() || null,
            btn_juegos_menu_text_stroke_color: (getValue('btn-juegos-menu-text-stroke-color') || '').trim() || null,

            // ⭐️ NUEVO: Personalización de Trivia (Contenedor)
            trivia_container_bg: hexToRgba(getValue('trivia-container-bg'), getValue('trivia-container-bg-opacity')),
            trivia_container_border_radius: (getValue('trivia-container-border-radius') || '').trim() || null,


            // Personalización de Trivia
            btn_trivia_bg: (getValue('btn-trivia-bg') || '').trim() || null,
            btn_trivia_bg_hover: (getValue('btn-trivia-bg-hover') || '').trim() || null,
            btn_trivia_text_color: (getValue('btn-trivia-text-color') || '').trim() || null,
            btn_trivia_border_color: (getValue('btn-trivia-border-color') || '').trim() || null,
            btn_trivia_shadow_color: (getValue('btn-trivia-shadow-color') || '').trim() || null,
            btn_trivia_border_radius: (getValue('btn-trivia-border-radius') || '').trim() || null,
            btn_trivia_font_size: (getValue('btn-trivia-font-size') || '').trim() || null,
            btn_trivia_padding: (getValue('btn-trivia-padding') || '').trim() || null,
            btn_trivia_font_family: (getValue('btn-trivia-font-family') || '').trim() || null,
            btn_trivia_text_stroke_width: (getValue('btn-trivia-text-stroke-width') || '').trim() || null,
            btn_trivia_text_stroke_color: (getValue('btn-trivia-text-stroke-color') || '').trim() || null,

            // Personalización de Memoria
            memory_container_bg: hexToRgba(getValue('memory-container-bg'), getValue('memory-container-bg-opacity')),
            memory_container_border_radius: (getValue('memory-container-border-radius') || '').trim() || null,


            // Personalización de Memoria (Cartas)
            mem_card_back_bg: (getValue('mem-card-back-bg') || '').trim() || null,
            mem_card_back_border_color: (getValue('mem-card-back-border-color') || '').trim() || null,
            mem_card_height: (getValue('mem-card-height') || '').trim() || null,
            mem_card_border_radius: (getValue('mem-card-border-radius') || '').trim() || null,

            // ⭐️ NUEVO: Personalización de Ahorcado
            hangman_container_bg: hexToRgba(getValue('hangman-container-bg'), getValue('hangman-container-bg-opacity')),
            hangman_container_border_radius: (getValue('hangman-container-border-radius') || '').trim() || null,
            btn_hangman_bg: (getValue('btn-hangman-bg') || '').trim() || null,
            btn_hangman_text_color: (getValue('btn-hangman-text-color') || '').trim() || null,
            btn_hangman_border_color: (getValue('btn-hangman-border-color') || '').trim() || null,
            btn_hangman_shadow_color: (getValue('btn-hangman-shadow-color') || '').trim() || null,
            btn_hangman_font_family: (getValue('btn-hangman-font-family') || '').trim() || null,
            btn_hangman_text_stroke_width: (getValue('btn-hangman-text-stroke-width') || '').trim() || null,
            btn_hangman_text_stroke_color: (getValue('btn-hangman-text-stroke-color') || '').trim() || null,


            // Personalización de Rankings
            ranking_container_bg: hexToRgba(getValue('ranking-container-bg'), getValue('ranking-container-bg-opacity')),
            ranking_container_border_radius: (getValue('ranking-container-border-radius') || '').trim() || null,


            // Personalización de Rankings (Ganadores)
            ranking_trivia_winner_bg: (getValue('ranking-trivia-winner-bg') || '').trim() || null,
            ranking_trivia_winner_text: (getValue('ranking-trivia-winner-text') || '').trim() || null,
            ranking_trivia_winner_border: (getValue('ranking-trivia-winner-border') || '').trim() || null,
            ranking_memory_winner_bg: (getValue('ranking-memory-winner-bg') || '').trim() || null,
            ranking_memory_winner_text: (getValue('ranking-memory-winner-text') || '').trim() || null,
            ranking_memory_winner_border: (getValue('ranking-memory-winner-border') || '').trim() || null,

            // ⭐️ NUEVO: Personalización de Anfitrión
            host_container_bg: (getValue('host-container-bg') || '').trim() || null,
            host_container_border_radius: (getValue('host-container-border-radius') || '').trim() || null,
            btn_host_bg: (getValue('btn-host-bg') || '').trim() || null,
            btn_host_text_color: (getValue('btn-host-text-color') || '').trim() || null,
            btn_host_border_color: (getValue('btn-host-border-color') || '').trim() || null,
            btn_host_font_family: (getValue('btn-host-font-family') || '').trim() || null,
            btn_host_text_stroke_width: (getValue('btn-host-text-stroke-width') || '').trim() || null,
            btn_host_text_stroke_color: (getValue('btn-host-text-stroke-color') || '').trim() || null,

        };

        const textsConfig = {
            portal_greeting: (getValue('text-portal-greeting') || '').trim() || null,
            portal_greeting_color: (getValue('text-portal-greeting-color') || '').trim() || null,
            portal_greeting_font_size: (getValue('text-portal-greeting-font-size') || '').trim() || null,
            portal_greeting_font_family: (getValue('text-portal-greeting-font-family') || '').trim() || null,
            portal_greeting_letter_spacing: (getValue('text-portal-greeting-letter-spacing') || '').trim() || null,
            portal_greeting_stroke_width: (getValue('text-portal-greeting-stroke-width') || '').trim() || null,
            portal_greeting_stroke_color: (getValue('text-portal-greeting-stroke-color') || '').trim() || null,

            portal_title: (getValue('text-portal-title') || '').trim() || null,
            portal_title_font_family: (getValue('text-portal-title-font-family') || '').trim() || null,
            portal_title_letter_spacing: (getValue('text-portal-title-letter-spacing') || '').trim() || null,
            portal_title_stroke_width: (getValue('text-portal-title-stroke-width') || '').trim() || null,
            portal_title_stroke_color: (getValue('text-portal-title-stroke-color') || '').trim() || null,


            portal_subtitle: (getValue('text-portal-subtitle') || '').trim() || null,
            portal_subtitle_color: (getValue('text-portal-subtitle-color') || '').trim() || null,
            portal_subtitle_font_size: (getValue('text-portal-subtitle-font-size') || '').trim() || null,
            portal_subtitle_font_family: (getValue('text-portal-subtitle-font-family') || '').trim() || null,
            portal_subtitle_letter_spacing: (getValue('text-portal-subtitle-letter-spacing') || '').trim() || null,

            portal_subtitle_stroke_width: (getValue('text-portal-subtitle-stroke-width') || '').trim() || null,
            portal_subtitle_stroke_color: (getValue('text-portal-subtitle-stroke-color') || '').trim() || null,

            memories_section_title: (getValue('text-memories-section-title') || '').trim() || null,
            memories_section_title_color: (getValue('text-memories-section-title-color') || '').trim() || null,
            memories_section_title_font_family: (getValue('text-memories-section-title-font-family') || '').trim() || null,
            memories_section_title_letter_spacing: (getValue('text-memories-section-title-letter-spacing') || '').trim() || null,

            memories_section_title_stroke_width: (getValue('text-memories-section-title-stroke-width') || '').trim() || null,
            memories_section_title_stroke_color: (getValue('text-memories-section-title-stroke-color') || '').trim() || null,
            memories_list_title: (getValue('text-memories-list-title') || '').trim() || null,
            memories_list_title_color: (getValue('text-memories-list-title-color') || '').trim() || null,
            memories_list_title_font_size: (getValue('text-memories-list-title-font-size') || '').trim() || null,
            memories_list_title_font_family: (getValue('text-memories-list-title-font-family') || '').trim() || null,
            memories_list_title_letter_spacing: (getValue('text-memories-list-title-letter-spacing') || '').trim() || null,
            memories_list_title_stroke_width: (getValue('text-memories-list-title-stroke-width') || '').trim() || null,
            memories_list_title_stroke_color: (getValue('text-memories-list-title-stroke-color') || '').trim() || null,
            
            // ⭐️ NUEVO: Textos de botones de juegos
            juegos_menu_trivia: (getValue('text-juegos-menu-trivia') || '').trim() || null,
            juegos_menu_memory: (getValue('text-juegos-menu-memory') || '').trim() || null,
            juegos_menu_hangman: (getValue('text-juegos-menu-hangman') || '').trim() || null,

            // ⭐️ NUEVO: Textos de Trivia
            trivia_title: (getValue('text-trivia-title') || '').trim() || null,
            trivia_title_font_family: (getValue('text-trivia-title-font-family') || '').trim() || null,
            trivia_title_letter_spacing: (getValue('text-trivia-title-letter-spacing') || '').trim() || null,
            trivia_title_stroke_width: (getValue('text-trivia-title-stroke-width') || '').trim() || null,
            trivia_title_stroke_color: (getValue('text-trivia-title-stroke-color') || '').trim() || null,
            trivia_welcome: (getValue('text-trivia-welcome') || '').trim() || null,
            trivia_welcome_font_family: (getValue('text-trivia-welcome-font-family') || '').trim() || null,
            trivia_welcome_letter_spacing: (getValue('text-trivia-welcome-letter-spacing') || '').trim() || null,
            trivia_subtitle: (getValue('text-trivia-subtitle') || '').trim() || null,
            trivia_start_button: (getValue('text-trivia-start-button') || '').trim() || 'INICIAR JUEGO',
            trivia_next_button: (getValue('text-trivia-next-button') || '').trim() || 'Siguiente Pregunta',

            // ⭐️ NUEVO: Textos de Memoria
            memory_title: (getValue('text-memory-title') || '').trim() || null,
            memory_title_font_family: (getValue('text-memory-title-font-family') || '').trim() || null,
            memory_title_letter_spacing: (getValue('text-memory-title-letter-spacing') || '').trim() || null,
            memory_title_stroke_width: (getValue('text-memory-title-stroke-width') || '').trim() || null,
            memory_title_stroke_color: (getValue('text-memory-title-stroke-color') || '').trim() || null,
            memory_start_button: (getValue('text-memory-start-button') || '').trim() || '¡Comenzar!',

            // ⭐️ NUEVO: Textos de Ahorcado
            hangman_title: (getValue('text-hangman-title') || '').trim() || null,
            hangman_title_font_family: (getValue('text-hangman-title-font-family') || '').trim() || null,
            hangman_title_letter_spacing: (getValue('text-hangman-title-letter-spacing') || '').trim() || null,
            hangman_title_stroke_width: (getValue('text-hangman-title-stroke-width') || '').trim() || null,
            hangman_title_stroke_color: (getValue('text-hangman-title-stroke-color') || '').trim() || null,
            hangman_subtitle: (getValue('text-hangman-subtitle') || '').trim() || null,
            hangman_subtitle_font_family: (getValue('text-hangman-subtitle-font-family') || '').trim() || null,
            hangman_subtitle_letter_spacing: (getValue('text-hangman-subtitle-letter-spacing') || '').trim() || null,
            hangman_start_button: (getValue('text-hangman-start-button') || '').trim() || '¡Comenzar!',

            // ⭐️ NUEVO: Textos de Ranking
            ranking_title: (getValue('text-ranking-title') || '').trim() || null,
            ranking_title_font_family: (getValue('text-ranking-title-font-family') || '').trim() || null,
            ranking_title_letter_spacing: (getValue('text-ranking-title-letter-spacing') || '').trim() || null,
            ranking_title_stroke_width: (getValue('text-ranking-title-stroke-width') || '').trim() || null,
            ranking_title_stroke_color: (getValue('text-ranking-title-stroke-color') || '').trim() || null,

            // ⭐️ NUEVO: Textos de Anfitrión
            host_login_title: (getValue('text-host-login-title') || '').trim() || null,
            host_login_subtitle: (getValue('text-host-login-subtitle') || '').trim() || null,
            host_panel_title: (getValue('text-host-panel-title') || '').trim() || null,
            host_document_title: (getValue('text-host-document-title') || '').trim() || null,
        };
        
        const fullConfig = {
            theme: themeConfig,
            texts: textsConfig,
            features: { games_enabled: document.getElementById('games-enabled').checked, },
            status: { is_active: document.getElementById('event-active').checked, },
            // ⭐️ NUEVO: Guardar la configuración de autenticación
            auth: {
                username: (getValue('auth-event-username') || '').trim() || null,
                password: (getValue('auth-event-password') || '').trim() || null,
            }
        };

        // ⭐️ INICIO: NUEVA LÓGICA PARA CREAR/ACTUALIZAR USUARIO ANFITRIÓN ⭐️
        const hostUsername = document.getElementById('auth-event-username').value.trim();
        const hostPassword = document.getElementById('auth-event-password').value.trim();

        if (hostUsername && hostPassword) {
            try {
                statusMsg.textContent = 'Creando/actualizando usuario anfitrión...';
                const createOrUpdateHostUser = httpsCallable(functions, 'createOrUpdateHostUser');
                const result = await createOrUpdateHostUser({
                    username: hostUsername,
                    password: hostPassword
                });
                console.log(result.data.message); // Log del éxito desde la función
            } catch (error) {
                console.error("Error al crear/actualizar el usuario anfitrión:", error);
                statusMsg.textContent = `Error con el usuario anfitrión: ${error.message}`;
                // No detenemos el guardado, pero mostramos el error.
            }
        }
        // ⭐️ FIN: NUEVA LÓGICA ⭐️

        try {
            const imageFile = document.getElementById('bg-image').files[0];
            if (imageFile) {
                // Si hay un archivo nuevo, lo subimos y actualizamos la URL en la configuración.
                statusMsg.textContent = 'Subiendo nueva imagen de fondo...';
                const imagePath = `events/${eventId}/theme/background.${imageFile.name.split('.').pop()}`;
                const sRef = storageRef(storage, imagePath);
                
                const uploadTask = await uploadBytesResumable(sRef, imageFile); 
                const downloadURL = await getDownloadURL(uploadTask.ref);
                
                fullConfig.theme.background_image_url = downloadURL; 
                statusMsg.textContent = 'Imagen subida. Guardando config...';
            } else {
                // Si NO hay archivo nuevo, nos aseguramos de mantener la URL existente.
                const previewImg = document.getElementById('bg-image-preview').querySelector('img');
                if (previewImg && previewImg.src) {
                    fullConfig.theme.background_image_url = previewImg.src;
                } else {
                    fullConfig.theme.background_image_url = null; // Si no hay ni preview, la eliminamos.
                }
                statusMsg.textContent = 'Guardando configuración...';
            }
            
            // ⭐️ NUEVO: Función auxiliar para procesar y subir cada sticker
            const processStickerData = async (type, index) => {
                const file = document.getElementById(`sticker_${type}_${index}_file`).files[0];
                const stickerData = {
                    width: document.getElementById(`sticker_${type}_${index}_width`).value.trim() || null,
                    transform: document.getElementById(`sticker_${type}_${index}_transform`).value.trim() || null,
                    top: document.getElementById(`sticker_${type}_${index}_top`).value.trim() || null,
                    bottom: document.getElementById(`sticker_${type}_${index}_bottom`).value.trim() || null,
                    left: document.getElementById(`sticker_${type}_${index}_left`).value.trim() || null,
                    right: document.getElementById(`sticker_${type}_${index}_right`).value.trim() || null,
                    url: null
                };

                if (file) {
                    statusMsg.textContent = `Subiendo sticker ${type} ${index}...`;
                    const stickerPath = `events/${eventId}/theme/sticker_${type}_${index}.${file.name.split('.').pop()}`;
                    const sRef = storageRef(storage, stickerPath);
                    const uploadTask = await uploadBytesResumable(sRef, file);
                    stickerData.url = await getDownloadURL(uploadTask.ref);
                } else {
                    const previewImg = document.getElementById(`sticker_${type}_${index}_preview`).querySelector('img');
                    stickerData.url = previewImg ? previewImg.src : null;
                }

                // Solo devolvemos el objeto si tiene una URL
                return stickerData.url ? stickerData : null;
            };

            // Procesar todos los stickers y filtrar los que no tienen URL
            const portalStickers = (await Promise.all([
                processStickerData('portal', 1),
                processStickerData('portal', 2)
            ])).filter(Boolean); // filter(Boolean) elimina los nulos

            const juegosStickers = (await Promise.all([
                processStickerData('juegos', 1),
                processStickerData('juegos', 2)
            ])).filter(Boolean);

            fullConfig.theme.portal_stickers = portalStickers.length > 0 ? portalStickers : null;
            fullConfig.theme.juegos_stickers = juegosStickers.length > 0 ? juegosStickers : null;

            const dbConfigRef = ref(database, `events/${eventId}/config`);
            await set(dbConfigRef, fullConfig);

            statusMsg.textContent = `¡Éxito! Evento "${eventId}" guardado/actualizado.`;
            
        } catch (error) {
            console.error("Error al guardar:", error);
            statusMsg.textContent = `Error: ${error.message}`;
        } finally {
            saveBtn.disabled = false;
        }
    }

    /**
     * Renderiza la lista de eventos existentes
     */
    function renderEventsList(snapshot) {
        eventsListElement.innerHTML = ''; 
        if (!snapshot.exists()) {
            eventsListElement.innerHTML = '<li class="p-2 text-gray-500 italic text-center">No hay eventos creados.</li>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const eventId = childSnapshot.key;
            const li = document.createElement('li');
            li.className = 'question-item'; 
            
            li.innerHTML = `
                <div class="q-display">
                    <strong class="text-gray-700">${eventId}</strong>
                </div>
                <div> 
                    <button type="button" class="load-btn" data-id="${eventId}">Cargar</button>
                    <button type="button" class="delete-btn" data-id="${eventId}">Eliminar</button>
                </div>
            `;
            eventsListElement.appendChild(li);
        });
    }

    /**
     * Maneja los clics en la lista de eventos (Cargar o Eliminar)
     */
    async function handleListClick(e) {
        const target = e.target; 

        // --- Clic en 'Cargar' ---
        if (target.classList.contains('load-btn')) {
            const eventIdToLoad = target.dataset.id;
            eventIdInput.value = eventIdToLoad;
            await loadEventSettings(eventIdToLoad); // ⭐️ CORREGIDO: Pasar el ID a la función
        }

        // --- Clic en 'Eliminar' ---
        if (target.classList.contains('delete-btn')) {
            const eventIdToDelete = target.dataset.id;
            
            const confirmation = prompt(`🚨 ACCIÓN DESTRUCTIVA 🚨\nEsto eliminará el evento "${eventIdToDelete}" y TODOS sus datos.\n\nPara confirmar, escribe el ID del evento ("${eventIdToDelete}"):`);
            
            if (confirmation !== eventIdToDelete) {
                alert('Confirmación cancelada o incorrecta. No se eliminó nada.');
                return;
            }

            try {
                const eventRefToDelete = ref(database, `events/${eventIdToDelete}`);
                await remove(eventRefToDelete);
                alert(`¡Evento "${eventIdToDelete}" eliminado con éxito!`);
                if (eventIdInput.value === eventIdToDelete) {
                    eventIdInput.value = '';
                    resetFormToDefaults();
                    statusMsg.textContent = `Evento "${eventIdToDelete}" eliminado.`;
                }
            } catch (error) {
                console.error("Error al eliminar el evento:", error);
                alert(`Error al eliminar: ${error.message}`);
            }
        }
    }

} // ⭐️⭐️⭐️ FIN: CÓDIGO ORIGINAL ENVUELTO ⭐️⭐️⭐️