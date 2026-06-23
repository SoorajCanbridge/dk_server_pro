import { config } from '../config/index.js';

export async function getPublicConfig(_req, res) {
  res.json({
    success: true,
    data: {
      googleClientId: config.google.clientId || '',
    },
  });
}
