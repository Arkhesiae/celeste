import AccountRecoveryRequest from '../models/AccountRecoveryRequest.js';

export const createRequest = async (req, res) => {
  try {
    const request = new AccountRecoveryRequest(req.body);
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const requests = await AccountRecoveryRequest.find()
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const request = await AccountRecoveryRequest.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default accountRecoveryController; 