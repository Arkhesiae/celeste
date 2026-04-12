import Message from '../models/Message.js';
import User from '../models/User.js';
import { AppError } from '../error/AppError.js';

// Récupérer tous les messages
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// Créer un nouveau message
const createMessage = async (req, res) => {
  try {
    const { adminId, type, subject, email, message } = req.body;

    // Trouver l'administrateur destinataire
    const receiver = await User.findOne({ 
      isAdmin: true,
      adminType: adminId === 'master' ? 'master' : 'local'
    });

    if (!receiver) {
      throw new AppError('Administrateur non trouvé', 404);
    }

    const newMessage = new Message({
      title: subject,
      content: message,
      type,
      senderEmail: email,
      senderId: req.user?._id || null, // Peut être null si l'utilisateur n'est pas connecté
      receiverId: receiver._id,
      isRead: false
    });

    await newMessage.save();
    
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    res.status(201).json(populatedMessage);
  } catch (error) {
    next(error);
  }
};

// Marquer un message comme lu
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      throw new AppError('Message non trouvé', 404);
    }

    message.isRead = true;
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    res.json(updatedMessage);
  } catch (error) {
    next(error);
  }
};

// Supprimer un message
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      throw new AppError('Message non trouvé', 404);
    }

    await message.deleteOne();
    res.json({ message: 'Message supprimé avec succès' });
  } catch (error) {
    next(error);
  }
};

export default {
  getMessages,
  createMessage,
  markAsRead,
  deleteMessage
}; 