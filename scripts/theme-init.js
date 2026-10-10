// Runs before React and CSS. External script respects the production CSP.
(() => {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const read = () => {
    try {
      return localStorage.getItem("engjatra.theme") || "system";
    } catch {
      return "system";
    }
  };
  let selected = read();
  const apply = () => {
    document.documentElement.dataset.themePreference = selected;
    const dark = selected === "dark" || (selected !== "light" && media.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#101827" : "#f5f7fc");
  };
  media.addEventListener("change", apply);
  window.addEventListener("storage", () => {
    selected = read();
    apply();
  });
  window.addEventListener("engjatra-theme", (event) => {
    const value = event.detail;
    if (["light", "dark", "system"].includes(value)) {
      selected = value;
      apply();
    }
  });
  apply();
})();
