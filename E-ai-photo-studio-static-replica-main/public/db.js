// db.js
// Tiny helper around localStorage for user session

const SESSION_KEY = "ai_photo_studio_user";

function saveUserSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn("Unable to save session", err);
  }
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Unable to read session", err);
    return null;
  }
}

function clearUserSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn("Unable to clear session", err);
  }
}

// Guard function you can call on profile/gallery pages
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "/signin.html";
  }
  return user;
}

// Example usage in profile.html:
// const user = requireAuth();
// document.getElementById("userName").textContent = user.name;
