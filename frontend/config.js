// URL publique de l'API (backend hébergé sur Scalingo).
// Ce n'est pas un secret : le navigateur l'utilise pour chaque appel, elle est donc visible de tous.
// Les vrais secrets (mot de passe de la base) restent uniquement côté backend, dans Scalingo.
window.API_BASE_URL = "https://ticket-support.osc-fr1.scalingo.io";
