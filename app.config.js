// Reprend app.json tel quel. Seul ajout : l'adresse de base de la version web, donnée par la fabrication
// (CE_WEB_BASE_URL=/cerveau-externe-telechargement pour GitHub Pages). Sans cette variable, rien ne change
// (fabrication Android, tests, développement).
module.exports = ({ config }) => {
  const baseUrl = process.env.CE_WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...(config.experiments ?? {}), baseUrl } };
};
