// Este es tu nuevo "index": vidriera/app/page.js
// Usamos "use client" para poder usar animaciones
"use client";

import { motion } from "framer-motion";
import { useState } from 'react';

// Pequeños componentes para los íconos (mejora la legibilidad)
const IconTrivia = () => <span className="text-3xl">✍️</span>;
const IconMemoria = () => <span className="text-3xl">🧠</span>;
const IconRecuerdos = () => <span className="text-3xl">🖼️</span>;

export default function LandingPage() {
  
  // Estado para un futuro formulario de contacto
  const [email, setEmail] = useState('');

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-gray-200">
      
      {/* --- NAVEGACIÓN --- */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400"
          >
            🐝 TuFiestaDigital
          </motion.div>
          <a
            href="https://app.tufiestadigital.com.ar" // Tu subdominio
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 text-sm font-semibold text-black bg-yellow-400 rounded-lg shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-yellow-300"
          >
            Ingresar a mi Evento
          </a>
        </div>
      </nav>

      {/* --- SECCIÓN HERO --- */}
      <main className="flex-grow">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-24 md:py-32 px-6"
        >
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            La <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">App</span> Definitiva
            <br />
            para tu Evento
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Involucra a tus invitados con trivias personalizadas, juegos de memoria
            y un álbum de recuerdos digital en tiempo real.
          </p>
          <motion.a
            href="#precios" // Enlace a una futura sección de precios
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 font-bold text-lg text-black bg-yellow-400 rounded-lg shadow-xl"
          >
            Ver Planes y Precios
          </motion.a>
        </motion.section>

        {/* --- SECCIÓN DE CARACTERÍSTICAS --- */}
        <section id="caracteristicas" className="py-24 bg-black bg-opacity-20">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-black text-center mb-16">
              Una Experiencia Interactiva
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              
              {/* Tarjeta 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="p-8 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl"
              >
                <IconTrivia />
                <h3 className="text-2xl font-bold my-4">Trivia Personalizada</h3>
                <p className="text-gray-400">
                  Carga tus propias preguntas y respuestas desde un panel de anfitrión 
                  fácil de usar.
                </p>
              </motion.div>

              {/* Tarjeta 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="p-8 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl"
              >
                <IconMemoria />
                <h3 className="text-2xl font-bold my-4">Juego de Memoria</h3>
                <p className="text-gray-400">
                  Sube tus propias fotos para crear un "memotest" único y 
                  revivir momentos especiales.
                </p>
              </motion.div>

              {/* Tarjeta 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="p-8 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl"
              >
                <IconRecuerdos />
                <h3 className="text-2xl font-bold my-4">Galería de Recuerdos</h3>
                <p className="text-gray-400">
                  Tus invitados suben fotos y videos del evento en tiempo real. 
                  Todos los recuerdos en un solo lugar.
                </p>
              </motion.div>

            </div>
          </div>
        </section>

        {/* --- SECCIÓN CTA (Llamada a la Acción) --- */}
        <section id="precios" className="py-24 text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-black mb-6">
              Comienza a planificar tu fiesta digital
            </h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
              Planes simples y accesibles para eventos de cualquier tamaño.
              Contáctanos para una cotización personalizada.
            </p>
            <form className="flex justify-center max-w-lg mx-auto">
              <input 
                type="email"
                placeholder="Tu email de contacto"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-6 py-4 w-full rounded-l-lg border-0 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-400"
              />
              <button 
                type="submit"
                className="px-6 py-4 font-bold text-black bg-yellow-400 rounded-r-lg"
              >
                Cotizar
              </button>
            </form>
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-500">
            &copy; 2025 Tu Fiesta Digital. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}