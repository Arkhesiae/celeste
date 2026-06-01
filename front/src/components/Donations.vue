<template>
    <v-row justify="center">
        <v-col cols="12" sm="10" md="8" lg="8">

            <div class="campaign-header mb-8">
                <v-sheet class="icon-badge mx-auto mb-5" rounded="xl" color="primary-lighten-5" width="72" height="72">
                    <v-icon icon="mdi-fire" size="36" color="primary" />
                </v-sheet>

                <h1 class="campaign-title text-center mb-3">
                    Un an déjà
                </h1>

                <p class="campaign-desc text-center text-medium-emphasis text-body-1">
                    Votre don, quel que soit son montant, permet de financer des actions
                    concrètes pour les familles dans le besoin de notre région.
                    Chaque geste compte et transforme des vies.
                </p>
            </div>

            <v-card class="mb-4 main-card" rounded="xl" variant="outlined">
                <v-card-text class="pa-5">

                    <div class="d-flex align-end justify-space-between mb-3">
                        <div>
                            <span class="text-h5 font-weight-medium">
                                {{ formatCurrency(raised) }}
                            </span>
                            <v-chip v-if="isOverGoal" rounded="lg" size="x-small" color="secondary" variant="tonal"
                                class="ml-2 mb-1">
                                objectif atteint !
                            </v-chip>
                        </div>
                        <span class="text-caption font-weight-medium"
                            :class="isOverGoal ? 'text-secondary' : 'text-primary'">
                            {{ progressPercent }}%
                        </span>
                    </div>

                    <!-- Custom overflow progress bar -->
                    <div ref="barWrap" class="progress-wrap mb-1">
                        <div class="progress-track">
                            <div class="progress-fill" :class="{ 'progress-fill--over': isOverGoal }"
                                :style="{ width: barFillWidth }" />
                            <div v-if="isOverGoal" class="progress-fill progress-fill--overflow"
                                :style="{ width: overflowFillWidth }" />
                        </div>

                        <div class="goal-marker" :style="{ left: goalMarkerLeft }">
                            <div class="goal-marker__line" />
                            <span class="goal-marker__label">{{ formatCurrency(goal) }}</span>
                        </div>
                    </div>

                    <div class="d-flex align-center ga-4 flex-wrap mt-3">
                        <div class="d-flex align-center ga-1">
                            <v-icon icon="mdi-clock-outline" size="14" color="primary" />
                            <span class="text-caption text-medium-emphasis">23 jours restants</span>
                        </div>
                        <div class="d-flex align-center ga-1">
                            <v-icon icon="mdi-account-group-outline" size="14" color="primary" />
                            <span class="text-caption text-medium-emphasis">{{ donors }} donateurs</span>
                        </div>
                    </div>

                </v-card-text>
            </v-card>

            <p class="section-label text-overline text-medium-emphasis mb-2 px-1">
                Coordonnées
            </p>

            <div class="d-flex flex-column ga-2 mb-4">

                <v-card v-for="item in paymentItems" :key="item.id" rounded="xl" variant="outlined" class="copy-card"
                    ripple @click="copyValue(item)">
                    <v-card-text class="pa-4">
                        <div class="d-flex align-center ga-3">

                            <v-sheet :color="item.iconBg" rounded="lg" width="40" height="40"
                                class="d-flex align-center justify-center flex-shrink-0">
                                <v-icon :icon="item.icon" :color="item.iconColor" size="20" />
                            </v-sheet>

                            <div class="flex-grow-1 min-width-0">
                                <p class="text-caption text-medium-emphasis mb-0">
                                    {{ item.label }}
                                </p>
                                <p class="copy-value text-body-2 font-weight-medium mb-0">
                                    {{ item.value }}
                                </p>
                            </div>

                            <v-btn icon variant="tonal" size="small" rounded="lg"
                                :color="copiedId === item.id ? 'secondary' : 'default'" @click.stop="copyValue(item)">
                                <v-icon :icon="copiedId === item.id ? 'mdi-check' : 'mdi-content-copy'" size="16" />
                            </v-btn>

                        </div>
                    </v-card-text>
                </v-card>

            </div>

        </v-col>
    </v-row>

</template>

<script setup
        lang="ts">
        const raised = ref(0)
        const goal = 400
        const donors = ref(0)
        const snack = ref(false)
        const snackText = ref('')
        const copiedId = ref<string | null>(null)
        const barWrap = ref<HTMLElement | null>(null)

        const OVERFLOW_MAX = 1.5

        const progressPercent = computed(() => Math.round((raised.value / goal) * 100))
        const isOverGoal = computed(() => raised.value > goal)

        const barFillWidth = computed(() =>
            isOverGoal.value ? '100%' : `${Math.min((raised.value / goal) * 100, 100)}%`
        )

        const overflowFillWidth = computed(() => {
            if (!isOverGoal.value) return '0%'
            const overRatio = (raised.value - goal) / (goal * (OVERFLOW_MAX - 1))
            return `${Math.min(overRatio * 100, 100)}%`
        })

        const goalMarkerLeft = computed(() => {
            if (!isOverGoal.value) return '100%'
            const overRatio = Math.min((raised.value - goal) / (goal * (OVERFLOW_MAX - 1)), 1)
            const markerPct = 100 - overRatio * (100 - 100 / OVERFLOW_MAX)
            return `${markerPct}%`
        })

        interface PaymentItem {
            id: string
            label: string
            value: string
            icon: string
            iconBg: string
            iconColor: string
            secondaryMsg: string
        }

        const paymentItems: PaymentItem[] = [
            {
                id: 'iban',
                label: 'Virement · IBAN',
                value: 'FR76 3000 6000 0112 3456 7890 189',
                icon: 'mdi-credit-card-outline',
                iconBg: 'blue-lighten-5',
                iconColor: 'blue-darken-2',
                secondaryMsg: 'IBAN copié !',
            },
            {
                id: 'phone',
                label: 'Don par Lydia / WERO',
                value: '+33 6 69 16 13 74',
                icon: 'mdi-phone-outline',
                iconBg: 'green-lighten-5',
                iconColor: 'green-darken-2',
                secondaryMsg: 'Numéro copié !',
            },
        ]

        function formatCurrency(amount: number): string {
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
            }).format(amount)
        }

        async function copyValue(item: PaymentItem) {
            try {
                await navigator.clipboard.writeText(item.value)
            } catch {
                const el = document.createElement('textarea')
                el.value = item.value
                document.body.appendChild(el)
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
            }

            copiedId.value = item.id
            snackText.value = item.secondaryMsg
            snack.value = true

            setTimeout(() => { copiedId.value = null }, 2000)
        }


        onMounted(() => {
            const target = 1000
            const duration = 1800
            const steps = 80
            const increment = target / steps
            let current = 0
            let donorsCurrent = 0
            const donorTarget = 198

            const timer = setInterval(() => {
                current = Math.min(current + increment, target)
                donorsCurrent = Math.min(Math.round((current / target) * donorTarget), donorTarget)
                raised.value = Math.round(current)
                donors.value = donorsCurrent
                if (current >= target) clearInterval(timer)
            }, duration / steps)
        })
</script>

<style scoped>
.campaign-root {
    max-width: 680px;
    margin: 0 auto;
}

.campaign-title {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: clamp(22px, 4vw, 30px);
    font-weight: 400;
    font-style: italic;
    line-height: 1.2;
    color: rgb(var(--v-theme-on-surface));
}

.campaign-desc {
    max-width: 600px;
    margin: 0 auto;
}

.icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
}

.section-label {
    letter-spacing: 0.08em;
    font-size: 11px;
}

.main-card {
    border: 1px solid rgba(var(--v-theme-primary), 0.3) !important;
}

.copy-card {
    border: 1px solid rgba(var(--v-theme-primary), 0.1) !important;
    cursor: pointer;
    transition: opacity 0.15s;
}

.copy-card:hover {
    opacity: 0.85;
}

.copy-value {
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.min-width-0 {
    min-width: 0;
}

.progress-wrap {
    position: relative;
    padding-bottom: 20px;
}

.progress-track {
    position: relative;
    height: 10px;
    border-radius: 99px;
    background: rgba(var(--v-theme-on-surface), 0.08);
    overflow: hidden;
}

.progress-fill {
    position: absolute;
    inset: 0;
    width: 0;
    border-radius: 99px;
    background: rgb(var(--v-theme-primary));
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-fill--over {
    opacity: 0.45;
}

.progress-fill--overflow {
    background: rgb(var(--v-theme-secondary));
    opacity: 1;
}

.goal-marker {
    position: absolute;
    bottom: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.goal-marker__line {
    width: 1.5px;
    height: 14px;
    background: rgba(var(--v-theme-on-surface), 0.35);
    border-radius: 1px;
    margin-bottom: 2px;
}

.goal-marker__label {
    font-size: 10px;
    font-weight: 500;
    color: rgba(var(--v-theme-on-surface), 0.5);
    white-space: nowrap;
    letter-spacing: 0.02em;
}

@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
</style>