import express from 'express';
import db from '../db/index.js';
import fetch from 'node-fetch';

const router = express.Router();

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1g96051ycdaqYuPB9N8BwfNcKIYoKPaUO61w49TTF3C8/export?format=csv&gid=0';

async function getPMMapping() {
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const mapping: Record<string, string> = {};
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle simple CSV parsing (assuming no commas in values for this specific sheet)
      // If there are commas in course names, this might need a more robust parser
      const parts = line.split(',');
      if (parts.length >= 2) {
        const courseName = parts[0].trim();
        const pmName = parts[1].trim();
        mapping[courseName] = pmName;
      }
    }
    return mapping;
  } catch (error) {
    console.error('Error fetching PM mapping:', error);
    return {};
  }
}

// Get all invitations (with optional filters)
router.get('/invitations', async (req, res) => {
  const { status, search, campaign_name } = req.query;
  let query = 'SELECT * FROM invitations';
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (campaign_name) {
    conditions.push('campaign_name = ?');
    params.push(campaign_name);
  }

  if (search) {
    conditions.push('(course_name LIKE ? OR campaign_name LIKE ? OR course_id LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY updated_at DESC';

  try {
    const stmt = db.prepare(query);
    const invitations = stmt.all(...params) as any[];
    
    // Attach PM info
    const pmMapping = await getPMMapping();
    const invitationsWithPM = invitations.map(inv => ({
      ...inv,
      pm: pmMapping[inv.course_name] || '未分配'
    }));
    
    res.json(invitationsWithPM);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Create new invitations (Bulk)
router.post('/invitations', (req, res) => {
  const { curator, campaign_name, campaign_start, campaign_end, courses } = req.body;

  if (!curator || !campaign_name || !courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or invalid courses list' });
  }

  // We no longer block duplicates, but we allow multiple invitations for the same course to different campaigns.
  
  const insertStmt = db.prepare(`
    INSERT INTO invitations (curator, course_id, course_name, campaign_name, campaign_start, campaign_end)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const createMany = db.transaction((invitations) => {
    for (const course of invitations) {
      insertStmt.run(curator, course.id, course.name, campaign_name, campaign_start || null, campaign_end || null);
    }
  });

  try {
    createMany(courses);
    res.status(201).json({ success: true, count: courses.length });
  } catch (error) {
    console.error('Error creating invitations:', error);
    res.status(500).json({ error: 'Failed to create invitations' });
  }
});

// Update invitation status
router.put('/invitations/:id', (req, res) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updateStmt = db.prepare(`
      UPDATE invitations 
      SET status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(status, rejection_reason || null, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating invitation:', error);
    res.status(500).json({ error: 'Failed to update invitation' });
  }
});

// Clear all invitations
router.delete('/invitations', (req, res) => {
  try {
    const deleteStmt = db.prepare('DELETE FROM invitations');
    deleteStmt.run();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing invitations:', error);
    res.status(500).json({ error: 'Failed to clear invitations' });
  }
});

// Delete a single invitation
router.delete('/invitations/:id', (req, res) => {
  const { id } = req.params;
  try {
    const deleteStmt = db.prepare('DELETE FROM invitations WHERE id = ?');
    deleteStmt.run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

export default router;
