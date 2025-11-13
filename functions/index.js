const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Función Callable para crear o actualizar un usuario anfitrión.
 * Recibe un 'username' y 'password' desde el cliente.
 */
exports.createOrUpdateHostUser = functions.https.onCall(async (data, context) => {
  // 1. Verificar que la llamada viene de un usuario autenticado (el super-admin)
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "La función solo puede ser llamada por un usuario autenticado.",
    );
  }

  const username = data.username;
  const password = data.password;

  if (!username || !password || password.length < 6) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "El nombre de usuario y una contraseña de al menos 6 caracteres son requeridos.",
    );
  }

  const email = `${username}@tufiestadigital.com.ar`;

  try {
    // Intentar obtener el usuario por email
    const userRecord = await admin.auth().getUserByEmail(email);
    // Si el usuario ya existe, actualizamos su contraseña
    await admin.auth().updateUser(userRecord.uid, {
      password: password,
    });
    return {message: `Usuario anfitrión '${email}' actualizado con éxito.`};
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      // Si el usuario no existe, lo creamos
      await admin.auth().createUser({email, password});
      return {message: `Usuario anfitrión '${email}' creado con éxito.`};
    }
    // Si es otro tipo de error, lo lanzamos
    throw new functions.https.HttpsError("internal", error.message);
  }
});