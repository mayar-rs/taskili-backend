const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// @desc    Get Wilayas
// @route   GET /locations/wilayas
// @access  Public
router.get('/wilayas', (req, res) => {
    try {
        const dataPath = path.join(__dirname, '../data/algeria_cities.json');
        const rawData = fs.readFileSync(dataPath);
        const data = JSON.parse(rawData);
        
        // Return only id and name
        const wilayas = data.map(item => ({ id: item.id, name: item.name }));
        res.status(200).json({ success: true, data: wilayas });
    } catch (error) {
        res.status(500).json({ message: "Could not load location data" });
    }
});

// @desc    Get Communes for a Wilaya
// @route   GET /locations/wilayas/:id/communes
// @access  Public
router.get('/wilayas/:id/communes', (req, res) => {
    try {
        const dataPath = path.join(__dirname, '../data/algeria_cities.json');
        const rawData = fs.readFileSync(dataPath);
        const data = JSON.parse(rawData);
        
        const wilaya = data.find(item => item.id === req.params.id);
        if (!wilaya) {
            return res.status(404).json({ message: "Wilaya not found" });
        }

        res.status(200).json({ success: true, data: wilaya.communes });
    } catch (error) {
        res.status(500).json({ message: "Could not load location data" });
    }
});

module.exports = router;
