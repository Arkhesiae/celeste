import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useOtpService } from '@/services/otpService';

export const useOtpStore = defineStore('otp', () => {
  const otpRequests = ref(new Map());
  const otpService = useOtpService();

  const sendOtp = async (email) => {
    try {
      const response = await otpService.sendOtp(email);
      otpRequests.value.set(email, {
        timestamp: Date.now(),
        attempts: 0,
        maxAttempts: 3,
      });
      return response;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'OTP:', error);
      throw error;
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const request = otpRequests.value.get(email);
      if (!request) {
        throw new Error('Aucune demande OTP en cours pour cet email');
      }

      if (request.attempts >= request.maxAttempts) {
        throw new Error('Nombre maximum de tentatives atteint');
      }

      request.attempts++;
      const response = await otpService.verifyOtp(email, otp);
      
      if (response.verified) {
        otpRequests.value.delete(email);
      }
      
      return response.verified;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'OTP:', error);
      throw error;
    }
  };

  const clearOtpRequest = (email) => {
    otpRequests.value.delete(email);
  };

  const verifyOTP = async (otp) => {
    try {
      const response = await otpService.verifyOTP(otp);
      return response.verified;
    } catch (err) {
      console.error('Erreur lors de la vérification de l\'OTP:', err);
      throw err;
    }
  };

  return {
    otpRequests,
    sendOtp,
    verifyOtp,
    clearOtpRequest,
    verifyOTP,
  };
}); 