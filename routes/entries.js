const express = require('express');
const router = express.Router();
const db = require('../db/database');
const cryptoUtil = require('../utils/crypto');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// Auto-purge cron job logic
async function autoPurge(userId) {
    try {
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        await db('entries')
            .where('user_id', userId)
            .whereNotNull('deleted_at')
            .where('deleted_at', '<', tenDaysAgo)
            .del();
    } catch (err) {
        console.error('Auto purge error:', err);
    }
}

// Get all active entries
router.get('/entries', async (req, res) => {
    await autoPurge(req.user.id);
    
    try {
        const entries = await db('entries')
            .where({ user_id: req.user.id })
            .whereNull('deleted_at')
            .orderBy('created_at', 'desc');
            
        const key = Buffer.from(req.user.key, 'hex');
        
        const decryptedEntries = entries.map(entry => {
            let secret = '';
            try {
                const parts = entry.secret_encrypted.split(':');
                if (parts.length === 2) {
                    secret = cryptoUtil.decrypt({
                        encrypted: parts[1],
                        iv: entry.iv,
                        authTag: parts[0]
                    }, key);
                }
            } catch (err) {
                console.error('Decryption error for entry', entry.id, err);
                secret = 'ERROR_DECRYPTING';
            }
            
            return {
                id: entry.id,
                service_name: entry.service_name,
                username: entry.username,
                secret: secret,
                icon: entry.icon
            };
        });
        
        res.json(decryptedEntries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// Add new entry
router.post('/entries', async (req, res) => {
    const { service_name, username, secret, icon } = req.body;
    
    if (!service_name || !secret) {
        return res.status(400).json({ error: 'Service name and secret are required' });
    }
    
    try {
        const key = Buffer.from(req.user.key, 'hex');
        const encryptedObj = cryptoUtil.encrypt(secret.replace(/[\s\-=]/g, '').toUpperCase(), key);
        
        const combinedEncrypted = `${encryptedObj.authTag}:${encryptedObj.encrypted}`;
        
        const insertResult = await db('entries').insert({
            user_id: req.user.id,
            service_name,
            username: username || '',
            secret_encrypted: combinedEncrypted,
            iv: encryptedObj.iv,
            icon: icon || ''
        }).returning('id');
        
        const insertId = typeof insertResult[0] === 'object' ? insertResult[0].id : insertResult[0];
        
        res.status(201).json({ id: insertId, message: 'Entry added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add entry' });
    }
});

// Edit entry
router.put('/entries/:id', async (req, res) => {
    const { service_name, username, secret, icon } = req.body;
    
    if (!service_name || !secret) {
        return res.status(400).json({ error: 'Service name and secret are required' });
    }
    
    try {
        const key = Buffer.from(req.user.key, 'hex');
        const encryptedObj = cryptoUtil.encrypt(secret.replace(/[\s\-=]/g, '').toUpperCase(), key);
        const combinedEncrypted = `${encryptedObj.authTag}:${encryptedObj.encrypted}`;
        
        const changes = await db('entries')
            .where({ id: req.params.id, user_id: req.user.id })
            .update({
                service_name,
                username: username || '',
                secret_encrypted: combinedEncrypted,
                iv: encryptedObj.iv,
                icon: icon || '',
                updated_at: db.fn.now()
            });
        
        if (changes === 0) return res.status(404).json({ error: 'Entry not found' });
        
        res.json({ message: 'Entry updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update entry' });
    }
});

// Soft Delete (move to recycle bin)
router.delete('/entries/:id', async (req, res) => {
    try {
        const changes = await db('entries')
            .where({ id: req.params.id, user_id: req.user.id })
            .update({
                deleted_at: db.fn.now()
            });
        
        if (changes === 0) return res.status(404).json({ error: 'Entry not found' });
        
        res.json({ message: 'Entry moved to recycle bin' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

// GET Recycle Bin entries
router.get('/recycle', async (req, res) => {
    await autoPurge(req.user.id);
    
    try {
        const entries = await db('entries')
            .select('id', 'service_name', 'username', 'deleted_at')
            .where({ user_id: req.user.id })
            .whereNotNull('deleted_at')
            .orderBy('deleted_at', 'desc');
        
        res.json(entries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch recycle bin' });
    }
});

// Restore from recycle bin
router.post('/recycle/:id/restore', async (req, res) => {
    try {
        const changes = await db('entries')
            .where({ id: req.params.id, user_id: req.user.id })
            .update({
                deleted_at: null
            });
        
        if (changes === 0) return res.status(404).json({ error: 'Entry not found in recycle bin' });
        
        res.json({ message: 'Entry restored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to restore entry' });
    }
});

// Permanent Delete
router.delete('/recycle/:id', async (req, res) => {
    try {
        const changes = await db('entries')
            .where({ id: req.params.id, user_id: req.user.id })
            .whereNotNull('deleted_at')
            .del();
        
        if (changes === 0) return res.status(404).json({ error: 'Entry not found in recycle bin' });
        
        res.json({ message: 'Entry permanently deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

// Empty recycle bin
router.delete('/recycle/empty/all', async (req, res) => {
    try {
        await db('entries')
            .where({ user_id: req.user.id })
            .whereNotNull('deleted_at')
            .del();
            
        res.json({ message: 'Recycle bin emptied' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to empty recycle bin' });
    }
});

// Export entries
router.get('/export', async (req, res) => {
    try {
        const entries = await db('entries')
            .where({ user_id: req.user.id })
            .whereNull('deleted_at');
            
        const key = Buffer.from(req.user.key, 'hex');
        
        const exportData = entries.map(entry => {
            let secret = '';
            const parts = entry.secret_encrypted.split(':');
            if (parts.length === 2) {
                secret = cryptoUtil.decrypt({
                    encrypted: parts[1],
                    iv: entry.iv,
                    authTag: parts[0]
                }, key);
            }
            
            return {
                service_name: entry.service_name,
                username: entry.username,
                secret: secret,
                icon: entry.icon
            };
        });
        
        res.json(exportData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to export entries' });
    }
});

// Import entries
router.post('/import', async (req, res) => {
    const { entries } = req.body;
    
    if (!Array.isArray(entries)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    
    try {
        const key = Buffer.from(req.user.key, 'hex');
        
        let importedCount = 0;
        
        await db.transaction(async (trx) => {
            for (const entry of entries) {
                if (!entry.service_name || !entry.secret) continue;
                
                const encryptedObj = cryptoUtil.encrypt(entry.secret.replace(/[\s\-=]/g, '').toUpperCase(), key);
                const combinedEncrypted = `${encryptedObj.authTag}:${encryptedObj.encrypted}`;
                
                await trx('entries').insert({
                    user_id: req.user.id,
                    service_name: entry.service_name,
                    username: entry.username || '',
                    secret_encrypted: combinedEncrypted,
                    iv: encryptedObj.iv,
                    icon: entry.icon || ''
                });
                
                importedCount++;
            }
        });
        
        res.json({ message: `Successfully imported ${importedCount} entries`, count: importedCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to import entries' });
    }
});

module.exports = router;
