import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

// Récupérer tous les tickets
const getTickets = async (req, res) => {
  try {
    let query = { deleted: false };
    console.log(req.user)
    // Si l'utilisateur est master, récupérer les tickets master et local
    // Sinon, récupérer seulement les tickets local
    if (req.user.isAdmin && req.user.adminType === 'master') {
      query.adminType = { $in: ['master', 'local'] };
    } else {
      query.adminType = 'local';
    }
    
    const tickets = await Ticket.find(query)
      .populate('senderId', 'firstName lastName email')
      .populate('centerId', 'name OACI')
      .sort({ createdAt: -1 });


    res.json(tickets);
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un nouveau ticket
const createTicket = async (req, res) => {
  try {
    const { adminType, type, subject, email, message, centerId } = req.body;

    // Trouver l'administrateur approprié
    let admin;
    if (adminType === 'master') {
      admin = await User.findOne({ isAdmin: true, adminType: 'master' });
    } else {
      admin = await User.findOne({ isAdmin: true, adminType: 'local', centerId: centerId });
    }

    if (!admin) {
      return res.status(404).json({ message: 'Administrateur non trouvé' });
    }

    let sender;
    sender = await User.findOne({ email: email });
   

    const newTicket = new Ticket({
      title: subject,
      content: message,
      type: type,
      senderEmail: email,
      centerId: centerId,
      adminType: adminType,
      senderId: sender?.id || null
    });

    await newTicket.save();

    const populatedTicket = await Ticket.findById(newTicket._id)
      .populate('senderId', 'firstName lastName email')
      .populate('centerId', 'name OACI');

    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error('Erreur lors de la création du ticket:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Marquer un ticket comme lu
const markAsRead = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    ticket.isRead = true;
    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('senderId', 'firstName lastName email')
      .populate('centerId', 'name OACI');

    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors du marquage du ticket comme lu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un ticket
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    await ticket.deleteOne();
    res.json({ message: 'Ticket supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du ticket:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export {
  getTickets,
  createTicket,
  markAsRead,
  deleteTicket
}; 