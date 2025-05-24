const Center = require('../models/Center');
const User = require('../models/User');
const Team = require('../models/Team');
const Rotation = require('../models/Rotation');
const { findLatestRotation } = require('../utils/findLatestRotation');

// GET ALL CENTERS
const getAllCenters = async (req, res) => {
    try {
        const centers = await Center.find({deleted: false});
        res.json(centers);
    } catch (error) {
        console.error('Erreur lors de la récupération des centres :', error);
        res.status(500).json({message: 'Échec de la récupération des centres'});
    }
};




// ADD A NEW CENTER
const addCenter = async (req, res) => {
    const {name, adminId, OACI, type} = req.body;

    if (!name) {
        return res.status(400).json({message: 'Le nom du centre est requis'});
    }

    if (!OACI) {
        return res.status(400).json({message: 'L\'indicateur OACI du centre est requis'});
    }

    if (!type) {
        return res.status(400).json({message: 'Le type du centre est requis'});
    }

    try {
        const newCenter = new Center({name, OACI, type});
        await newCenter.save();
        res.status(201).json(newCenter);
    } catch (error) {
        console.error('Erreur lors de la création du centre :', error);
        res.status(500).json({message: 'Échec de la création du centre'});
    }
};

// UPDATE A CENTER
const updateCenter = async (req, res) => {
    const {id} = req.params;
    const {name, adminId} = req.body;

    try {
        const updatedCenter = await Center.findByIdAndUpdate(
            id,
            {name, adminId: adminId || null},
            {new: true}
        );

        if (!updatedCenter) {
            return res.status(404).json({message: 'Centre non trouvé'});
        }

        res.json(updatedCenter);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du centre :', error);
        res.status(500).json({message: 'Échec de la mise à jour du centre'});
    }
};

// DELETE A CENTER
const deleteCenter = async (req, res) => {
    const {id} = req.params;

    try {
        const deletedCenter = await Center.findById(id);

        if (!deletedCenter) {
            return res.status(404).json({message: 'Centre non trouvé'});
        }

        deletedCenter.deleted = true;
        await deletedCenter.save();

        await User.updateMany(
            {centerId: id},
            {$unset: {centerId: ""}}
        );
 
        // Suppression des rotations
        await Rotation.deleteMany({centerId: id});

        // Suppression des équipes
        await Team.deleteMany({center: id});

        res.json({message: 'Centre supprimé avec succès'});
    } catch (error) {
        console.error('Erreur lors de la suppression du centre :', error);
        res.status(500).json({message: 'Échec de la suppression du centre'});
    }
};

// GET USER COUNT BY CENTER
const getUsersCountByCenter = async (req, res) => {
    try {
        const centers = await Center.find();
        const usersCountByCenter = {};

        for (const center of centers) {
            const count = await User.countDocuments({ centerId: center._id });
            usersCountByCenter[center._id] = count;
        }

        res.json(usersCountByCenter);
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre d\'utilisateurs par centre :', error);
        res.status(500).json({ message: 'Échec de la récupération du nombre d\'utilisateurs par centre' });
    }
};

// GET ADMINS BY CENTER
const getAdminsByCenter = async (req, res) => {
    try {
        const centers = await Center.find();
        const adminsByCenter = {};

        for (const center of centers) {
            const admins = await User.find({ 
                centerId: center._id,
                isAdmin: true 
            }).select('name lastName _id');
            
            adminsByCenter[center._id] = admins;
        }

        res.json(adminsByCenter);
    } catch (error) {
        console.error('Erreur lors de la récupération des administrateurs par centre :', error);
        res.status(500).json({ message: 'Échec de la récupération des administrateurs par centre' });
    }
};

// GET ACTIVE ROTATION OF CENTER
const getActiveRotationOfCenter = async (req, res) => {
    const {id} = req.params;
    try {
        const center = await Center.findById(id);
        if (!center) {
            return res.status(404).json({ message: 'Centre non trouvé' });
        }

        const activeRotation = await findLatestRotation(center._id, new Date());
        res.json(activeRotation);
    } catch (error) {
        console.error('Erreur lors de la récupération des rotations actives par centre :', error);
        res.status(500).json({ message: 'Échec de la récupération des rotations actives par centre' });
    }
}

// GET ACTIVE ROTATIONS BY CENTER
const getActiveRotationsByCenter = async (req, res) => {
    try {
        const centers = await Center.find();
        const activeRotationsByCenter = {};

        for (const center of centers) {
            const lastActiveRotation = await findLatestRotation(center._id, new Date());

            activeRotationsByCenter[center._id] = lastActiveRotation;
        }

        res.json(activeRotationsByCenter);
    } catch (error) {
        console.error('Erreur lors de la récupération des rotations actives par centre :', error);
        res.status(500).json({ message: 'Échec de la récupération des rotations actives par centre' });
    }
};

module.exports = {
    getAllCenters,
    addCenter,
    updateCenter,
    deleteCenter,
    getUsersCountByCenter,
    getAdminsByCenter,
    getActiveRotationsByCenter,
    getActiveRotationOfCenter
}; 