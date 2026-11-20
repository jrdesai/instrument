(function () {
  try {
    var prefs = localStorage.getItem("instrument-preferences");
    var theme = prefs ? JSON.parse(prefs).theme : "dark";
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch (_) {
    document.documentElement.classList.add("dark");
  }
})();
