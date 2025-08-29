<template>
    <v-dialog v-model="dialogVisible" :fullscreen="smAndDown" :max-width="maxWidth" :persistent="persistent"
        :retain-focus="false" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave" @keydown.esc="handleEscapeKey">
        <v-card height="100vh" :rounded="!smAndDown ? 'xl' : false" class="pt-0 pb-6 px-0 overflow-y-hidden">
            <!-- Header avec titre et boutons -->
            <div ref="headerRef" style="padding-top: calc(var(--safe-area-top,0px) + 24px) !important" :class="[
                'px-6 pb-4 d-flex align-center justify-space-between pa-0 ma-0 transition-all duration-300',
                isScrolled ? 'bg-surfaceContainerHigh' : ''
            ]">
                <div class="d-flex align-center justify-space-between flex-grow-1">
                    <div class="d-flex align-center ga-2">
                        <v-btn v-if="smAndDown" icon="mdi-arrow-left" variant="text" @click="handleClose"></v-btn>

                        <span :class="{
                            'text-h6': !smAndDown,
                            'text-h7': smAndDown
                        }" class=" font-weight-medium">
                            {{ title }}
                        </span>
                    </div>



                    <v-btn v-if="!smAndDown" icon="mdi-close" variant="text" @click="handleClose"></v-btn>
                </div>

                <div class="d-flex align-center gap-2" v-if="smAndDown">
                    <!-- Bouton de fermeture/retour adaptatif -->



                    <!-- Boutons d'action supplémentaires -->
                    <slot name="actions" />
                </div>
            </div>



            <!-- Contenu principal -->
            <v-card-text ref="contentRef"
                class="px-6 pb-0 ma-0 overflow-y-auto flex-column d-flex justify-space-between">
                <div ref="sentinel" class="flex-grow-0 flex-shrink-0"></div>
                <div ref="content" class="flex-grow-1 flex-shrink-0">

                    <slot name="content" />
                </div>

                <div class="pa-0 ma-0 mt-6 flex-shrink-0">
                    <slot name="footer" />
                </div>
            </v-card-text>

            <!-- Footer optionnel -->

        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useDisplay } from 'vuetify';

// Props
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        required: true
    },
    maxWidth: {
        type: [String, Number],
        default: '600px'
    },
    persistent: {
        type: Boolean,
        default: false
    },
    showCloseButton: {
        type: Boolean,
        default: true
    }
})

// Emits
const emit = defineEmits(['update:modelValue', 'close'])
const { smAndDown } = useDisplay();

// Refs pour les éléments DOM
const headerRef = ref(null)
const contentRef = ref(null)
const isScrolled = ref(false)
const sentinel = ref(null)

// Computed
const dialogVisible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

// Methods
const handleClose = () => {
    emit('close')
    emit('update:modelValue', false)
}

const handleAfterEnter = () => {
    console.log('after enter')
    if (sentinel.value) {
        observer.observe(sentinel.value)
    }
}

const handleAfterLeave = () => {
    console.log('after leave')
    if (sentinel.value) {
        observer.unobserve(sentinel.value)
    }
}

// // Gestion du défilement
// const handleScroll = (event) => {
//     const scrollTop = event.target.scrollTop
//     isScrolled.value = scrollTop > 10
// }

// Watch pour gérer les changements de taille d'écran
watch(() => props.modelValue, (newValue) => {
    if (newValue && props.persistent) {
        // Empêcher la fermeture par ESC ou clic extérieur si persistant
        document.addEventListener('keydown', handleEscapeKey)
    } else {
        document.removeEventListener('keydown', handleEscapeKey)
    }
})

const handleEscapeKey = (event) => {
    if (event.key === 'Escape' && props.persistent) {
        event.preventDefault()
    }
}

const content = ref(null)
let observer = null

// Lifecycle hooks
onMounted(() => {
    // Attendre que le DOM soit complètement rendu
        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    isScrolled.value = !entry.isIntersecting
                })
            },
            { root: null, threshold: [0.0, 1.0] }
        )
})

onUnmounted(() => {
    // Nettoyer les event listeners si nécessaire
    document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
.bg-surfaceContainerHigh-elevated {
    background-color: rgb(var(--v-theme-surfaceContainerHigh));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.transition-all {
    transition: all 0.3s ease;
}
</style>
