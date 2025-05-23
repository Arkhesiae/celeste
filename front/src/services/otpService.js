import { API_URL, handleResponse } from '@/config/api';

export const useOtpService = () => {
  const sendOtp = async (email) => {
    try {
      const response = await fetch(`${API_URL}/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return handleResponse(response);
    } catch (error) {
      throw error;
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const response = await fetch(`${API_URL}/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      return handleResponse(response);
    } catch (error) {
      throw error;
    }
  };

  return {
    sendOtp,
    verifyOtp,
  };
}; 