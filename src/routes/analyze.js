const { Router } = require('express');
const { isValidUrl } = require('../utils/validators');
const { analyzeEndpoint } = require('../services/analyzer');

const router = Router();

router.post('/analyze', async (req, res) => {
  const { url } = req.body;

  const validation = isValidUrl(url);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: validation.error,
      },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const report = await analyzeEndpoint(validation.url);
    const statusCode = report.success ? 200 : 200;
    return res.status(statusCode).json(report);
  } catch (err) {
    return res.status(500).json({
      success: false,
      url: validation.url,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during analysis',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
