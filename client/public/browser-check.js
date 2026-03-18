/**
 * Browser Compatibility Checker
 * Detecta navegadores antigos e redireciona para página de fallback
 */

(function() {
  'use strict';

  // Features modernas necessárias
  const requiredFeatures = {
    es6: typeof Promise === 'function' && typeof Map === 'function' && typeof Set === 'function',
    fetch: typeof fetch === 'function',
    formData: typeof FormData === 'function',
    symbol: typeof Symbol === 'function',
    arrowFunctions: (() => { try { eval('(() => 1)'); return true; } catch (e) { return false; } })(),
    modules: typeof import === 'function' || (function() { try { new Function('import("url")'); return false; } catch (e) { return true; } })(),
    sse: typeof EventSource === 'function',
    cssVariables: (function() {
      try {
        document.documentElement.style.setProperty('--test', '1');
        return true;
      } catch (e) {
        return false;
      }
    })(),
  };

  // Navegadores conhecidos como incompatíveis
  const unsupportedBrowsers = [
    'IE',
    'MSIE',
    'Opera Mini',
    'Android Browser' // Antigos Android Browser < 4.4
  ];

  // Detectar user agent antigo
  const ua = navigator.userAgent;
  const isUnsupportedUA = unsupportedBrowsers.some(browser => ua.includes(browser));

  // Decidir se é browser antigo
  const isOldBrowser = isUnsupportedUA || !requiredFeatures.es6 || !requiredFeatures.fetch || !requiredFeatures.sse;

  // Log para debug
  if (isOldBrowser) {
    console.warn('[BrowserCheck] Navegador antigo detectado:', {
      ua: ua.substring(0, 100),
      features: requiredFeatures,
    });
  }

  // Se for antigo e não estiver já na página de fallback, redirecionar
  if (isOldBrowser && !window.location.pathname.includes('browser-not-supported.html')) {
    // Manter query params se houver
    const redirectUrl = '/browser-not-supported.html';
    window.location.replace(redirectUrl);
  }

  // Expor para debug
  window.__BROWSER_COMPATIBILITY__ = {
    isOldBrowser,
    features: requiredFeatures,
    ua: ua,
  };
})();
