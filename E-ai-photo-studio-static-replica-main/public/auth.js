// auth.js
// Handles Google Identity Services login + basic session management

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // TODO: replace

function handleCredentialResponse(response) {
  try {
    const payload = decodeJwt(response.credential);

    const user = {
      id: payload.sub,
      name: payload.name || payload.given_name || "Creator",
      email: payload.email,
      picture: payload.picture,
      provider: "google",
      lastLogin: new Date().toISOString(),
    };

    // Save to localStorage via db helper
    saveUserSession(user);

    // Redirect to profile
    window.location.href = "/profile.html";
  } catch (err) {
    console.error("Error decoding Google credential", err);
    alert("Something went wrong signing you in. Please try again.");
  }
}

// Basic JWT decode (no verification – GIS already handled that part)
function decodeJwt(token) {
  const payload = token.split(".")[1];
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent(escape(decoded)));
}

// Initialise Google button when GIS script is ready
window.addEventListener("DOMContentLoaded", () => {
  const target = document.getElementById("googleSignInButton");
  if (!target || !window.google || !window.google.accounts) return;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    cancel_on_tap_outside: true,
    auto_select: false,
    context: "signin",
  });

  window.google.accounts.id.renderButton(target, {
    type: "standard",
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
    width: 300,
  });
});
