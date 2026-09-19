// A blocking, same-origin script restores appearance before the app paints, including under CSP.
;(() => {
  let theme = 'dark'
  try {
    if (localStorage.getItem('booster-break-theme') === 'light') theme = 'light'
  } catch {
    // Storage can be unavailable; the selector will report any failed save.
  }
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
})()
