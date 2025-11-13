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
    // 1. Intentamos actualizar el usuario directamente.
    // Esto es más eficiente si el usuario ya existe.
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, {
      password: password,
    });
    return {message: `Usuario anfitrión '${email}' actualizado con éxito.`};
  } catch (error) {
    // 2. Si el error es 'user-not-found', significa que debemos crearlo.
    if (error.code === "auth/user-not-found") {
      try {
        await admin.auth().createUser({
          email: email,
          password: password,
          displayName: `Anfitrión: ${username}` // ⭐️ MEJORA: Añadimos un nombre para mostrar.
        });
      } catch (createError) {
        throw new functions.https.HttpsError("internal", `Error al crear usuario: ${createError.message}`);
      }
      return {message: `Usuario anfitrión '${email}' creado con éxito.`};
    }
    // 3. Si es cualquier otro error durante la actualización, lo lanzamos.
    throw new functions.https.HttpsError("internal", `Error al actualizar usuario: ${error.message}`);
  }
});