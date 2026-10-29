# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## API portal

C?c m?n nghi?p v? d?ng /portal/* tr?n VITE_API_URL, c? JWT, kh?ng d?ng mock fallback.
C?n backend module portal, migration 1793318400000-AddPortalRecord v? th? m?c PORTAL_UPLOAD_DIR b?n v?ng.
Teacher ??ng nh?p b?ng t?i kho?n TEACHER v? c?n class_staff ?? th?y l?p.
Contract chi ti?t: PORTAL_API.md ? repo di-ichi-crm-services.
Test: npm test -- --configLoader runner. C?c component demo c? kh?ng n?m trong c?y import c?a app.
