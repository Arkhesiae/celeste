const Message = require('../models/Message');
const { isMasterAdmin } = require('../middleware/authMiddleware');

// Récupérer tous les messages
exports.getMessages = async (req, res) => {
  try {
    if (!isMasterAdmin(req.user)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    res.json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un nouveau message
exports.createMessage = async (req, res) => {
  try {
    if (!isMasterAdmin(req.user)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { title, content, receiverId } = req.body;
    const message = new Message({
      title,
      content,
      senderId: req.user._id,
      receiverId
    });

    await message.save();
    
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Marquer un message comme lu
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    if (!isMasterAdmin(req.user) && message.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    message.isRead = true;
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    res.json(updatedMessage);
  } catch (error) {
    console.error('Erreur lors du marquage du message comme lu:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un message
exports.deleteMessage = async (req, res) => {
  try {
    if (!isMasterAdmin(req.user)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message non trouvé' });
    }

    await message.deleteOne();
    res.json({ message: 'Message supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}; 