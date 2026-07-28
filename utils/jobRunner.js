const { pool } = require('../config/db');

/**
 * Creates a job in the database and returns its ID.
 */
async function createJob(jobType) {
    const result = await pool.query(
        `INSERT INTO background_jobs (job_type, status) VALUES ($1, 'processing') RETURNING id`,
        [jobType]
    );
    return result.rows[0].id;
}

/**
 * Updates job progress (0-100)
 */
async function updateJobProgress(jobId, progress) {
    await pool.query(
        `UPDATE background_jobs SET progress = $1, updated_at = NOW() WHERE id = $2`,
        [progress, jobId]
    );
}

/**
 * Marks job as completed with a JSON result
 */
async function completeJob(jobId, result) {
    await pool.query(
        `UPDATE background_jobs SET status = 'completed', progress = 100, result = $1, updated_at = NOW() WHERE id = $2`,
        [result, jobId]
    );
}

/**
 * Marks job as failed with an error message
 */
async function failJob(jobId, errorMsg) {
    await pool.query(
        `UPDATE background_jobs SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2`,
        [errorMsg, jobId]
    );
}

/**
 * Wraps an async function to run in the background.
 * Returns the jobId immediately.
 */
async function runBackgroundJob(jobType, taskFn) {
    const jobId = await createJob(jobType);

    // Run asynchronously without waiting
    setImmediate(async () => {
        try {
            const result = await taskFn(async (progress) => {
                await updateJobProgress(jobId, progress);
            });
            await completeJob(jobId, result);
        } catch (error) {
            console.error(`Job ${jobId} (${jobType}) failed:`, error);
            await failJob(jobId, error.message || String(error));
        }
    });

    return jobId;
}

module.exports = {
    createJob,
    updateJobProgress,
    completeJob,
    failJob,
    runBackgroundJob
};
