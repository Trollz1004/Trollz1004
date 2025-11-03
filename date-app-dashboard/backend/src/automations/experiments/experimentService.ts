import pool from '../../database';
import logger from '../../logger';

export interface Experiment {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  start_date?: Date;
  end_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface ExperimentVariant {
  id?: string;
  experiment_id: string;
  name: string;
  weight?: number;
  config?: Record<string, any>;
  created_at?: Date;
}

export interface ExperimentAssignment {
  id?: string;
  user_id: string;
  experiment_id: string;
  variant_id: string;
  assigned_at?: Date;
}

export interface ExperimentEvent {
  id?: string;
  user_id: string;
  experiment_id: string;
  variant_id: string;
  event_type: string;
  value?: number;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export interface ExperimentResults {
  experiment: Experiment;
  variants: Array<{
    variant: ExperimentVariant;
    stats: {
      assignments: number;
      events: { [eventType: string]: number };
      conversion_rate: number;
      avg_value: number;
    };
  }>;
}

/**
 * Create a new A/B test experiment
 */
export async function createExperiment(
  name: string,
  description: string,
  variants: Array<{ name: string; weight: number; config?: Record<string, any> }>
): Promise<{ success: boolean; experiment?: Experiment; error?: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Validate weights sum to 100
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      throw new Error('Variant weights must sum to 100');
    }

    // Create experiment
    const experimentResult = await client.query(
      `INSERT INTO experiments (name, description, status)
       VALUES ($1, $2, 'draft')
       RETURNING *`,
      [name, description]
    );

    const experiment = experimentResult.rows[0];

    // Create variants
    for (const variant of variants) {
      await client.query(
        `INSERT INTO experiment_variants (experiment_id, name, weight, config)
         VALUES ($1, $2, $3, $4)`,
        [experiment.id, variant.name, variant.weight, JSON.stringify(variant.config || {})]
      );
    }

    await client.query('COMMIT');
    logger.info('Experiment created successfully', { experimentId: experiment.id, name });

    return { success: true, experiment };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to create experiment', { error: error.message });
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Start an experiment (set status to 'active')
 */
export async function startExperiment(
  experimentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `UPDATE experiments
       SET status = 'active', start_date = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [experimentId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Experiment not found or already started' };
    }

    logger.info('Experiment started', { experimentId });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to start experiment', { experimentId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * End an experiment (set status to 'completed')
 */
export async function endExperiment(
  experimentId: string,
  winningVariantId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `UPDATE experiments
       SET status = 'completed', end_date = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [experimentId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Experiment not found or not active' };
    }

    logger.info('Experiment ended', { experimentId, winningVariantId });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to end experiment', { experimentId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Assign user to experiment variant (weighted random assignment)
 */
export async function assignVariant(
  userId: string,
  experimentId: string
): Promise<{ success: boolean; variant?: ExperimentVariant; error?: string }> {
  try {
    // Check if already assigned
    const existingAssignment = await pool.query(
      `SELECT ea.*, ev.* FROM experiment_assignments ea
       JOIN experiment_variants ev ON ea.variant_id = ev.id
       WHERE ea.user_id = $1 AND ea.experiment_id = $2`,
      [userId, experimentId]
    );

    if (existingAssignment.rows.length > 0) {
      return { success: true, variant: existingAssignment.rows[0] };
    }

    // Check if experiment is active
    const experimentCheck = await pool.query(
      `SELECT * FROM experiments WHERE id = $1 AND status = 'active'`,
      [experimentId]
    );

    if (experimentCheck.rows.length === 0) {
      return { success: false, error: 'Experiment not active' };
    }

    // Get all variants with weights
    const variantsResult = await pool.query(
      `SELECT * FROM experiment_variants WHERE experiment_id = $1 ORDER BY weight DESC`,
      [experimentId]
    );

    const variants = variantsResult.rows;
    if (variants.length === 0) {
      return { success: false, error: 'No variants found for experiment' };
    }

    // Weighted random selection
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    let selectedVariant = variants[0];

    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        selectedVariant = variant;
        break;
      }
    }

    // Create assignment
    await pool.query(
      `INSERT INTO experiment_assignments (user_id, experiment_id, variant_id)
       VALUES ($1, $2, $3)`,
      [userId, experimentId, selectedVariant.id]
    );

    logger.info('User assigned to variant', {
      userId,
      experimentId,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
    });

    return { success: true, variant: selectedVariant };
  } catch (error: any) {
    logger.error('Failed to assign variant', { userId, experimentId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Track experiment event (conversion, click, etc.)
 */
export async function trackEvent(
  userId: string,
  experimentId: string,
  eventType: string,
  value?: number,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's variant assignment
    const assignment = await pool.query(
      `SELECT variant_id FROM experiment_assignments
       WHERE user_id = $1 AND experiment_id = $2`,
      [userId, experimentId]
    );

    if (assignment.rows.length === 0) {
      // Auto-assign if not already assigned
      const assignResult = await assignVariant(userId, experimentId);
      if (!assignResult.success || !assignResult.variant) {
        return { success: false, error: 'Failed to assign variant' };
      }

      const variantId = assignResult.variant.id;

      // Track event
      await pool.query(
        `INSERT INTO experiment_events (user_id, experiment_id, variant_id, event_type, value, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, experimentId, variantId, eventType, value || null, JSON.stringify(metadata || {})]
      );
    } else {
      const variantId = assignment.rows[0].variant_id;

      // Track event
      await pool.query(
        `INSERT INTO experiment_events (user_id, experiment_id, variant_id, event_type, value, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, experimentId, variantId, eventType, value || null, JSON.stringify(metadata || {})]
      );
    }

    logger.info('Experiment event tracked', { userId, experimentId, eventType });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to track event', { userId, experimentId, eventType, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get experiment results and statistics
 */
export async function getExperimentResults(
  experimentId: string
): Promise<{ success: boolean; results?: ExperimentResults; error?: string }> {
  try {
    // Get experiment
    const experimentResult = await pool.query(
      `SELECT * FROM experiments WHERE id = $1`,
      [experimentId]
    );

    if (experimentResult.rows.length === 0) {
      return { success: false, error: 'Experiment not found' };
    }

    const experiment = experimentResult.rows[0];

    // Get variants
    const variantsResult = await pool.query(
      `SELECT * FROM experiment_variants WHERE experiment_id = $1`,
      [experimentId]
    );

    const variants = variantsResult.rows;
    const variantStats = [];

    for (const variant of variants) {
      // Get assignment count
      const assignmentCount = await pool.query(
        `SELECT COUNT(*) as count FROM experiment_assignments
         WHERE variant_id = $1`,
        [variant.id]
      );

      const assignments = parseInt(assignmentCount.rows[0].count);

      // Get events by type
      const eventsResult = await pool.query(
        `SELECT event_type, COUNT(*) as count, AVG(value) as avg_value
         FROM experiment_events
         WHERE variant_id = $1
         GROUP BY event_type`,
        [variant.id]
      );

      const events: { [key: string]: number } = {};
      let totalConversions = 0;
      let totalValue = 0;

      for (const event of eventsResult.rows) {
        events[event.event_type] = parseInt(event.count);
        if (event.event_type === 'conversion') {
          totalConversions = parseInt(event.count);
        }
        if (event.avg_value) {
          totalValue = parseFloat(event.avg_value);
        }
      }

      const conversionRate = assignments > 0 ? (totalConversions / assignments) * 100 : 0;

      variantStats.push({
        variant,
        stats: {
          assignments,
          events,
          conversion_rate: Math.round(conversionRate * 100) / 100,
          avg_value: Math.round(totalValue * 100) / 100,
        },
      });
    }

    const results: ExperimentResults = {
      experiment,
      variants: variantStats,
    };

    return { success: true, results };
  } catch (error: any) {
    logger.error('Failed to get experiment results', { experimentId, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get all experiments
 */
export async function getAllExperiments(
  status?: string
): Promise<{ success: boolean; experiments?: Experiment[]; error?: string }> {
  try {
    let query = 'SELECT * FROM experiments';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return { success: true, experiments: result.rows };
  } catch (error: any) {
    logger.error('Failed to get experiments', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user's variant for experiment
 */
export async function getUserVariant(
  userId: string,
  experimentId: string
): Promise<{ success: boolean; variant?: ExperimentVariant; error?: string }> {
  try {
    const result = await pool.query(
      `SELECT ev.* FROM experiment_assignments ea
       JOIN experiment_variants ev ON ea.variant_id = ev.id
       WHERE ea.user_id = $1 AND ea.experiment_id = $2`,
      [userId, experimentId]
    );

    if (result.rows.length === 0) {
      // Auto-assign
      return await assignVariant(userId, experimentId);
    }

    return { success: true, variant: result.rows[0] };
  } catch (error: any) {
    logger.error('Failed to get user variant', { userId, experimentId, error: error.message });
    return { success: false, error: error.message };
  }
}

export default {
  createExperiment,
  startExperiment,
  endExperiment,
  assignVariant,
  trackEvent,
  getExperimentResults,
  getAllExperiments,
  getUserVariant,
};
