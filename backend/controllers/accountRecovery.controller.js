import AccountRecoveryRequest from '../models/AccountRecoveryRequest.js';
import { AppError } from '../error/AppError.js';


export const createRequest = async (req, res) => {
  try {
    const request = new AccountRecoveryRequest(req.body);
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const requests = await AccountRecoveryRequest.find()
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    next(error);
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
      throw new AppError('Demande non trouvée', 404);
    }
    res.json(request);
  } catch (error) {
    next(error);
  }
};

