import express from 'express';
import pool from '../db/index';
import fetch from 'node-fetch';

const router = express.Router();

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1g96051ycdaqYuPB9N8BwfNcKIYoKPaUO61w49TTF3C8/export?format=csv&gid=0';

async function getPMMapping() {
  try {
    console.log('Fetching PM mapping from Google Sheet...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(SHEET_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/);
    const mapping: Record<string, string> = {};
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const courseName = parts[0];
        const pmName = parts[1];
        mapping[courseName] = pmName;
      }
    }
    console.log(`Loaded ${Object.keys(mapping).length} PM mappings`);
    return mapping;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('PM mapping fetch timed out');
    } else {
      console.error('Error fetching PM mapping:', error);
    }
    return {};
  }
}

// Get all invitations (with optional filters)
router.get('/invitations', async (req, res) => {
  const { status, search, campaign_name, pm, startDate, endDate } = req.query;
  let query = 'SELECT * FROM invitations';
  const params: any[] = [];
  const conditions: string[] = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (campaign_name) {
    params.push(campaign_name);
    conditions.push(`campaign_name = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    // The campaign must not have ended before the filter start date
    conditions.push(`campaign_end >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    // The campaign must not have started after the filter end date
    conditions.push(`campaign_start <= $${params.length}`);
  }

  if (search) {
    const searchTerm = `%${search}%`;
    params.push(searchTerm);
    const pIdx = params.length;
    conditions.push(`(course_name LIKE $${pIdx} OR campaign_name LIKE $${pIdx} OR course_id LIKE $${pIdx})`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY updated_at DESC';

  try {
    console.log('Executing query:', query, 'with params:', params);
    const result = await pool.query(query, params);
    let invitations = result.rows;
    console.log(`Found ${invitations.length} invitations in DB`);
    
    // Attach PM info
    const pmMapping = await getPMMapping();
    console.log('Sample PM Mapping keys:', Object.keys(pmMapping).slice(0, 5));
    invitations = invitations.map(inv => ({
      ...inv,
      pm: pmMapping[inv.course_name] || '未分配'
    }));

    // Filter by PM if requested
    if (pm) {
      invitations = invitations.filter(inv => inv.pm === pm);
      console.log(`Filtered to ${invitations.length} invitations for PM: ${pm}`);
    }
    
    res.json(invitations);
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    if (error.message?.includes('relation "invitations" does not exist')) {
      res.status(500).json({ error: '資料庫正在初始化中，請稍後再試。' });
    } else if (error.message?.includes('not accepting connections')) {
      res.status(500).json({ error: '資料庫正在喚醒中，請稍後再試。' });
    } else {
      res.status(500).json({ error: 'Failed to fetch invitations: ' + error.message });
    }
  }
});

// Create new invitations (Bulk)
router.post('/invitations', async (req, res) => {
  console.log('Received POST /invitations request:', req.body);
  const { curator, campaign_name, campaign_start, campaign_end, courses } = req.body;

  if (!curator || !campaign_name || !courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or invalid courses list' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query = `
      INSERT INTO invitations (curator, course_id, course_name, campaign_name, campaign_start, campaign_end)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    for (const course of courses) {
      await client.query(query, [curator, course.id, course.name, campaign_name, campaign_start || null, campaign_end || null]);
    }
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, count: courses.length });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating invitations:', error);
    if (error.message?.includes('relation "invitations" does not exist')) {
      res.status(500).json({ error: '資料庫正在初始化中，請稍後再試。' });
    } else if (error.message?.includes('not accepting connections')) {
      res.status(500).json({ error: '資料庫正在喚醒中，請稍後再試。' });
    } else {
      res.status(500).json({ error: 'Failed to create invitations: ' + error.message });
    }
  } finally {
    client.release();
  }
});

// Update invitation status
router.put('/invitations/:id', async (req, res) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await pool.query(`
      UPDATE invitations 
      SET status = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [status, rejection_reason || null, id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating invitation:', error);
    if (error.message?.includes('relation "invitations" does not exist')) {
      res.status(500).json({ error: '資料庫正在初始化中，請稍後再試。' });
    } else if (error.message?.includes('not accepting connections')) {
      res.status(500).json({ error: '資料庫正在喚醒中，請稍後再試。' });
    } else {
      res.status(500).json({ error: 'Failed to update invitation: ' + error.message });
    }
  }
});

// Clear all invitations
router.delete('/invitations', async (req, res) => {
  try {
    await pool.query('DELETE FROM invitations');
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing invitations:', error);
    res.status(500).json({ error: 'Failed to clear invitations' });
  }
});

// Delete a single invitation
router.delete('/invitations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM invitations WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

// Diagnostic route
router.get('/debug/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM invitations');
    const sample = await pool.query('SELECT * FROM invitations LIMIT 5');
    res.json({ 
      count: result.rows[0].count,
      sample: sample.rows,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlStart: process.env.DATABASE_URL?.substring(0, 15),
        nodeEnv: process.env.NODE_ENV
      },
      dbType: (pool as any).isSqlite ? 'SQLite' : 'PostgreSQL'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
