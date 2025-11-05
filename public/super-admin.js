import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
// ⭐️ IMPORTACIONES ACTUALIZADAS (se agregó 'get')
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

// =======================================================================
// ⭐️ NUEVAS FUNCIONES DE AYUDA PARA RGBA ⭐️
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


// =======================================================================
// LÓGICA PRINCIPAL DEL SUPER-ADMIN
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. DEFINIR VARIABLES DEL FORMULARIO
    const form = document.getElementById('event-form');
    const saveBtn = document.getElementById('save-event-btn');
    const statusMsg = document.getElementById('status-message');
    const eventIdInput = document.getElementById('event-id');

    // 2. VARIABLES PARA LA LISTA DE EVENTOS
    const eventsListElement = document.getElementById('existing-events-list');
    const eventsListRef = ref(database, 'events'); 

    // 3. ASIGNAR EVENTOS
    form.addEventListener('submit', handleFormSubmit);
    onValue(eventsListRef, renderEventsList); 
    eventsListElement.addEventListener('click', handleListClick); 
    
    
    /**
     * Carga los settings de un Evento
     */
    async function loadEventSettings() {
        const eventId = eventIdInput.value.trim().toLowerCase();
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

    /**
     * Rellena el formulario con datos de Firebase
     */
    function populateForm(config) {
        // Extraer secciones con valores por defecto
        const theme = config.theme || {};
        const features = config.features || {};
        const status = config.status || {};
        const icons = theme.icons || {};

        // Rellenar Funcionalidades y Estado
        document.getElementById('games-enabled').checked = features.games_enabled !== false;
        document.getElementById('event-active').checked = status.is_active !== false;

        // Rellenar Tema Global
        document.getElementById('color-primary').value = theme.color_primary || '#FACC15';
        document.getElementById('color-secondary').value = theme.color_secondary || '#F59E0B';
        document.getElementById('color-text').value = theme.color_text || '#1F2937';
        document.getElementById('color-success').value = theme.color_success || '#4CAF50';
        document.getElementById('color-danger').value = theme.color_danger || '#E53935';
        document.getElementById('color-text-light').value = theme.color_text_light || '#FFFFFF';
        document.getElementById('font-family').value = theme.font_family || "'Inter', sans-serif";

        // Rellenar Iconos
        document.getElementById('icon-main').value = icons.icon_main || '🐝';
        document.getElementById('icon-portal').value = icons.icon_portal || '💬';
        document.getElementById('icon-trivia').value = icons.icon_trivia || '✍️';
        document.getElementById('icon-memory').value = icons.icon_memory || '🧠';
        document.getElementById('icon-hangman').value = icons.icon_hangman || '💀';
        document.getElementById('icon-ranking').value = icons.icon_ranking || '🏆';
        document.getElementById('icon-win').value = icons.icon_win || '🎉';

        // Rellenar Personalización del Portal
        // ⭐️ MODIFICADO: Usar la función de conversión para 'portal_bg'
        const portalBg = rgbaToHexAndOpacity(theme.portal_bg);
        document.getElementById('portal-bg').value = portalBg.hex;
        document.getElementById('portal-bg-opacity').value = portalBg.opacity;
        
        document.getElementById('portal-border-radius').value = theme.portal_border_radius || '';
        document.getElementById('portal-title-color').value = theme.portal_title_color || '#1F2937';
        document.getElementById('portal-title-font-size').value = theme.portal_title_font_size || '';
        document.getElementById('btn-portal-bg').value = theme.btn_portal_bg || '#FACC15';
        document.getElementById('btn-portal-text-color').value = theme.btn_portal_text_color || '#1F2937';
        document.getElementById('btn-portal-border-radius').value = theme.btn_portal_border_radius || '';
        document.getElementById('btn-portal-shadow-color').value = theme.btn_portal_shadow_color || '#F59E0B';

        // Rellenar Personalización de Trivia
        document.getElementById('btn-trivia-bg').value = theme.btn_trivia_bg || '#ffb300';
        document.getElementById('btn-trivia-bg-hover').value = theme.btn_trivia_bg_hover || '#ff9900';
        document.getElementById('btn-trivia-text-color').value = theme.btn_trivia_text_color || '#FFFFFF';
        document.getElementById('btn-trivia-border-color').value = theme.btn_trivia_border_color || '#e69900';
        document.getElementById('btn-trivia-shadow-color').value = theme.btn_trivia_shadow_color || '#e69900';
        document.getElementById('btn-trivia-border-radius').value = theme.btn_trivia_border_radius || '';
        document.getElementById('btn-trivia-font-size').value = theme.btn_trivia_font_size || '';
        document.getElementById('btn-trivia-padding').value = theme.btn_trivia_padding || '';
        document.getElementById('btn-trivia-shadow').value = theme.btn_trivia_shadow || '';

        // Rellenar Personalización de Memoria
        document.getElementById('mem-card-back-bg').value = theme.mem_card_back_bg || '#F59E0B';
        document.getElementById('mem-card-back-border-color').value = theme.mem_card_back_border_color || '#1F2937';
        document.getElementById('mem-card-height').value = theme.mem_card_height || '';
        document.getElementById('mem-card-border-radius').value = theme.mem_card_border_radius || '';

        // Rellenar Personalización de Rankings
        document.getElementById('ranking-trivia-winner-bg').value = theme.ranking_trivia_winner_bg || '#FFCC00';
        document.getElementById('ranking-trivia-winner-text').value = theme.ranking_trivia_winner_text || '#1F2937';
        document.getElementById('ranking-trivia-winner-border').value = theme.ranking_trivia_winner_border || '#F59E0B';
        document.getElementById('ranking-memory-winner-bg').value = theme.ranking_memory_winner_bg || '#cceeff';
        document.getElementById('ranking-memory-winner-text').value = theme.ranking_memory_winner_text || '#0056b3';
        document.getElementById('ranking-memory-winner-border').value = theme.ranking_memory_winner_border || '#007bff';

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
        
        document.getElementById('bg-image').value = '';
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
        
        const previewImg = document.getElementById('bg-image-preview').querySelector('img');
        let currentBgUrl = previewImg ? previewImg.src : null;

        // ⭐️ MODIFICADO: Combinar 'portal_bg' y 'portal_bg_opacity'
        const portalBgColor = document.getElementById('portal-bg').value;
        const portalBgOpacity = document.getElementById('portal-bg-opacity').value;
        const portalBgRgba = hexToRgba(portalBgColor, portalBgOpacity);

        const themeConfig = {
            // Tema Global
            color_primary: document.getElementById('color-primary').value,
            color_secondary: document.getElementById('color-secondary').value,
            color_text: document.getElementById('color-text').value,
            color_success: document.getElementById('color-success').value,
            color_danger: document.getElementById('color-danger').value,
            color_text_light: document.getElementById('color-text-light').value,
            font_family: document.getElementById('font-family').value,
            
            icons: {
                icon_main: document.getElementById('icon-main').value || '🐝',
                icon_portal: document.getElementById('icon-portal').value || '💬',
                icon_trivia: document.getElementById('icon-trivia').value || '✍️',
                icon_memory: document.getElementById('icon-memory').value || '🧠',
                icon_hangman: document.getElementById('icon-hangman').value || '💀',
                icon_ranking: document.getElementById('icon-ranking').value || '🏆',
                icon_win: document.getElementById('icon-win').value || '🎉',
            },
            
            // Personalización del Portal
            portal_bg: portalBgRgba, // ⭐️ Guardar el valor combinado
            portal_border_radius: document.getElementById('portal-border-radius').value.trim() || null,
            portal_title_color: document.getElementById('portal-title-color').value,
            portal_title_font_size: document.getElementById('portal-title-font-size').value.trim() || null,
            btn_portal_bg: document.getElementById('btn-portal-bg').value,
            btn_portal_text_color: document.getElementById('btn-portal-text-color').value,
            btn_portal_border_radius: document.getElementById('btn-portal-border-radius').value.trim() || null,
            btn_portal_shadow_color: document.getElementById('btn-portal-shadow-color').value,

            // Personalización de Trivia
            btn_trivia_bg: document.getElementById('btn-trivia-bg').value.trim() || null,
            btn_trivia_bg_hover: document.getElementById('btn-trivia-bg-hover').value.trim() || null,
            btn_trivia_text_color: document.getElementById('btn-trivia-text-color').value.trim() || null,
            btn_trivia_border_color: document.getElementById('btn-trivia-border-color').value.trim() || null,
            btn_trivia_shadow_color: document.getElementById('btn-trivia-shadow-color').value.trim() || null,
            btn_trivia_border_radius: document.getElementById('btn-trivia-border-radius').value.trim() || null,
            btn_trivia_font_size: document.getElementById('btn-trivia-font-size').value.trim() || null,
            btn_trivia_padding: document.getElementById('btn-trivia-padding').value.trim() || null,
            btn_trivia_shadow: document.getElementById('btn-trivia-shadow').value.trim() || null,

            // Personalización de Memoria
            mem_card_back_bg: document.getElementById('mem-card-back-bg').value.trim() || null,
            mem_card_back_border_color: document.getElementById('mem-card-back-border-color').value.trim() || null,
            mem_card_height: document.getElementById('mem-card-height').value.trim() || null,
            mem_card_border_radius: document.getElementById('mem-card-border-radius').value.trim() || null,

            // Personalización de Rankings
            ranking_trivia_winner_bg: document.getElementById('ranking-trivia-winner-bg').value.trim() || null,
            ranking_trivia_winner_text: document.getElementById('ranking-trivia-winner-text').value.trim() || null,
            ranking_trivia_winner_border: document.getElementById('ranking-trivia-winner-border').value.trim() || null,
            ranking_memory_winner_bg: document.getElementById('ranking-memory-winner-bg').value.trim() || null,
            ranking_memory_winner_text: document.getElementById('ranking-memory-winner-text').value.trim() || null,
            ranking_memory_winner_border: document.getElementById('ranking-memory-winner-border').value.trim() || null,

            background_image_url: currentBgUrl 
        };
        
        const fullConfig = {
            theme: themeConfig,
            features: { games_enabled: document.getElementById('games-enabled').checked },
            status: { is_active: document.getElementById('event-active').checked }
        };

        try {
            const imageFile = document.getElementById('bg-image').files[0];
            if (imageFile) {
                statusMsg.textContent = 'Subiendo nueva imagen de fondo...';
                const imagePath = `events/${eventId}/theme/background.${imageFile.name.split('.').pop()}`;
                const sRef = storageRef(storage, imagePath);
                
                const uploadTask = await uploadBytesResumable(sRef, imageFile); 
                const downloadURL = await getDownloadURL(uploadTask.ref);
                
                fullConfig.theme.background_image_url = downloadURL; 
                statusMsg.textContent = 'Imagen subida. Guardando config...';
            } else {
                statusMsg.textContent = 'Guardando configuración...';
            }
            
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
            await loadEventSettings();
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
});