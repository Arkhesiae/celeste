<template>
  <div class="otp-verification">
    <div class="text-center">
      <v-card-title class="pl-0 text-h5">{{ title }}</v-card-title>
      <p v-if="email" class="text-body-2 text-medium-emphasis mb-6">
        Un code de vérification a été envoyé à {{ email }}
      </p>

      <v-otp-input
        v-model="otpValue"
        :length="length"
        class="mb-4"
        :disabled="loading"
        @update:modelValue="onOtpChange"
      ></v-otp-input>

      <div class="d-flex justify-center align-center mb-4">
        <v-btn
          variant="text"
          :disabled="timer > 0 || loading"
          @click="resendOtp"
          class="text-caption"
        >
          {{ timer > 0 ? `Renvoyer le code (${timer}s)` : 'Renvoyer le code' }}
        </v-btn>
      </div>

      <p v-if="timer > 0" class="text-caption text-medium-emphasis">
        Le code expirera dans 5 minutes
      </p>

      <v-alert
        v-if="error"
        type="error"
        icon="mdi-shield"
        
        rounded="lg"
        color="secondary"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useOtpStore } from '@/stores/otpStore';

const props = defineProps({
  email: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Vérification de votre email'
  },
  description: {
    type: String,
    default: 'Un code de vérification a été envoyé à votre adresse email'
  },
  email: {
    type: String,
    required: true
  },
  length: {
    type: Number,
    default: 6
  },
  duration: {
    type: Number,
    default: 60
  }
});

const emit = defineEmits(['verified', 'error', 'resend']);

const otpStore = useOtpStore();
const otpValue = ref('');
const timer = ref(0);
const loading = ref(false);
const error = ref('');
let timerInterval = null;

const startTimer = () => {
  timer.value = props.duration;
  timerInterval = setInterval(() => {
    timer.value--;
    if (timer.value <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const sendOtp = async () => {
  loading.value = true;
  error.value = '';
  try {
    await otpStore.sendOtp(props.email);
    startTimer();
    emit('resend');
  } catch (err) {
    error.value = err.message || 'Erreur lors de l\'envoi du code';
    emit('error', err);
  } finally {
    loading.value = false;
  }
};

const resendOtp = () => {
  if (timer.value <= 0 && !loading.value) {
    sendOtp();
  }
};

const verifyOtp = async () => {
  if (otpValue.value.length !== props.length) return;

  loading.value = true;
  error.value = '';
  try {
    const isValid = await otpStore.verifyOtp(props.email, otpValue.value);
    if (isValid) {
      emit('verified', otpValue.value);
    } else {
      error.value = 'Code OTP invalide';
      emit('error', new Error('Code OTP invalide'));
    }
  } catch (err) {
    error.value = err.message || 'Erreur lors de la vérification du code';
    emit('error', err);
  } finally {
    loading.value = false;
  }
};

const onOtpChange = (value) => {
  otpValue.value = value;
  if (value.length === props.length) {
    verifyOtp();
  }
};

watch(() => props.email, () => {
  otpValue.value = '';
  error.value = '';
  if (timer.value <= 0) {
    sendOtp();
  }
});

onMounted(() => {
  
  sendOtp();
});

onUnmounted(() => {
  console.log("unmounted")
  stopTimer();
});
</script>

<style scoped>
.otp-verification {
  max-width: 400px;
  margin: 0 auto;
}
</style> 