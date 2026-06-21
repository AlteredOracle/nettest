// NetPilot — live network diagnostic endpoint.
// GET /api/diagnose?target=example.com
const { runDiagnostics } = require('./_diagnostics.js');

module.exports = async (req, res) => {
  const raw = (req.query && req.query.target) ||
    (req.url && new URL(req.url, 'http://x').searchParams.get('target'));
  const result = await runDiagnostics(raw);
  res.status(result.error ? 400 : 200).json(result);
};
