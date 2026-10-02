/** Tailwind config - generates tailwind.css from the markup in this repo.
 *
 *  IMPORTANT: the ./*.js glob is required, not optional. Several pages build
 *  their markup in JavaScript (renderer.js, crm.js, crm-edit-*.js), so classes
 *  that appear only inside a JS string literal - accent colours, status
 *  backgrounds, metric card sizes - would be purged if we scanned HTML alone.
 *  Adding a new JS-rendered page means adding it here.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './*.js'],
  theme: {
    extend: {},
  },
  plugins: [],
};