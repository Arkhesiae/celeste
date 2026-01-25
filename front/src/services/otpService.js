import { apiFetch } from '../config/api';

export const useOtpService = () => {
  const sendOtp = async (email) => {
    try {
      const response = await apiFetch(`/otp/send`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const response = await apiFetch(`/otp/verify`, {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  };

  return {
    sendOtp,
    verifyOtp,
  };
}; 