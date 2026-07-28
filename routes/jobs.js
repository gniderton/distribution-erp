const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/jobs/:id - Poll job status
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, job_type, status, progress, result, error, created_at, updated_at FROM background_jobs WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ error: 'Failed to fetch job status' });
    }
});

module.exports = router;
