// Manus AI Task Automation Webhook Handler
import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Manus webhook endpoint
router.post('/api/webhooks/manus', async (req, res) => {
  try {
    const { event_id, event_type, task_detail } = req.body;

    console.log(`Manus webhook received: ${event_type}`, task_detail);

    if (event_type === 'task_created') {
      // Store new task in database
      await db.query(
        `INSERT INTO manus_tasks (task_id, title, url, status, created_at)
         VALUES ($1, $2, $3, 'running', NOW())`,
        [task_detail.task_id, task_detail.task_title, task_detail.task_url]
      );

      console.log(`✅ Task created: ${task_detail.task_id}`);
    }

    else if (event_type === 'task_stopped') {
      const { task_id, message, attachments, stop_reason } = task_detail;

      // Update task status
      await db.query(
        `UPDATE manus_tasks
         SET status = $1, message = $2, stop_reason = $3, completed_at = NOW()
         WHERE task_id = $4`,
        [stop_reason === 'finish' ? 'completed' : 'waiting_input', message, stop_reason, task_id]
      );

      // Store attachments
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          await db.query(
            `INSERT INTO manus_attachments (task_id, file_name, url, size_bytes)
             VALUES ($1, $2, $3, $4)`,
            [task_id, file.file_name, file.url, file.size_bytes]
          );
        }
      }

      // If task needs input, notify admin
      if (stop_reason === 'ask') {
        console.log(`⚠️ Task ${task_id} requires user input: ${message}`);
        // TODO: Send notification to admin dashboard
      } else {
        console.log(`✅ Task ${task_id} completed: ${message}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Manus webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get all Manus tasks
router.get('/api/manus/tasks', async (req, res) => {
  try {
    const tasks = await db.query(
      `SELECT t.*,
              (SELECT json_agg(json_build_object('file_name', a.file_name, 'url', a.url, 'size_bytes', a.size_bytes))
               FROM manus_attachments a WHERE a.task_id = t.task_id) as attachments
       FROM manus_tasks t
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
    res.json(tasks.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Get specific task
router.get('/api/manus/tasks/:taskId', async (req, res) => {
  try {
    const task = await db.query(
      `SELECT t.*,
              (SELECT json_agg(json_build_object('file_name', a.file_name, 'url', a.url, 'size_bytes', a.size_bytes))
               FROM manus_attachments a WHERE a.task_id = t.task_id) as attachments
       FROM manus_tasks t
       WHERE t.task_id = $1`,
      [req.params.taskId]
    );

    if (task.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load task' });
  }
});

export default router;
