<template>


    <div ref="header" :class="['header-placeholder']" class="mb-16 position-relative"  :style="{ height: `${headerHeight}px`, width: `${headerWidth}px` }">
        <div :class="[
            'list-header justify-space-between  flex-wrap align-center',
            { 'is-sticky': isSticky }
        ]" class="" :style="isSticky ? { width: `${headerWidth}px` } : {}">
            <div class="background1"></div>
            <div class="background2"></div>
            <div v-if="!isSticky">

                <v-chip-group v-model="selectedFilter" column variant="flat" color="onBackground">
                    <v-chip v-for="filter in filters" :key="filter.value" variant="text" rounded="lg"
                        :value="filter.value" :color="filter.color">
                        {{ filter.label }}
                    </v-chip>
                </v-chip-group>

            </div>

            <div class="d-flex align-center flex-grow-1" ref="actions" 
            :class="smAndDown ? 'justify-space-between' : 'justify-end'">

                <v-text-field v-model="searchQuery" :label="searchLabel" variant="solo" flat rounded="xl" min-width="150" single-line
                    hide-details density="compact" class="search-field flex-grow-1" clearable
                    @update:model-value="onSearch" />



                <v-menu color="onBackground" rounded="lg">
                    <template v-slot:activator="{ props }">
                        <v-btn color="primary" variant="text" rounded="lg" v-bind="props">
                            <span class="text-overline">{{ selectedSort ? selectedSort.text : sortLabel }}</span>
                            <v-icon>mdi-chevron-down</v-icon>
                        </v-btn>
                    </template>
                    <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4 ">
                        <v-list-item v-for="option in sortOptions" :key="option.value" rounded="lg"
                            @click="onSortChange(option)">
                            <v-list-item-title>{{ option.text }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>


            </div>
        </div>
    </div>

</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useDisplay } from 'vuetify';
const props = defineProps({
    filters: {
        type: Array,
        default: () => []
    },
    sortOptions: {
        type: Array,
        default: () => []
    },
    searchLabel: {
        type: String,
        default: 'Rechercher'
    },
    sortLabel: {
        type: String,
        default: 'Trier par'
    },
    initialFilter: {
        type: String,
        default: 'all'
    },
    initialSort: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:filter', 'update:search', 'update:sort']);

const selectedFilter = ref(props.initialFilter);
const searchQuery = ref('');
const { smAndDown } = useDisplay();
const selectedSort = ref(props.initialSort);
const header = ref(null);
const headerHeight = ref(0);
const headerWidth = ref(0);
const isSticky = ref(false);
let observer = null;
const actions = ref(null);

const updateHeaderDimensions = async () => {
    await nextTick();
    if (header.value) {
        const parentElement = header.value.parentElement;
        if (parentElement) {
            const parentWidth = parentElement.offsetWidth;
            headerWidth.value = parentWidth;
            
            const row = header.value.querySelector('.list-header');
            if (row) {
                headerHeight.value = row.offsetHeight;
            }
        }
    }
};

onMounted(async () => {
    await updateHeaderDimensions();
    const options = {
        rootMargin: "-64px",
        threshold: [0, 0.25, 0.5, 0.75, 0.80, 1],
    };

    const callback = (entries) => {
        entries.forEach(entry => {
            if (entry.intersectionRatio < .5) {
                isSticky.value = true;
            } else {
                isSticky.value = false; 
            }
        });
    };

    observer = new IntersectionObserver(callback, options);
    observer.observe(header.value);
    
    // Mettre à jour les dimensions si la fenêtre est redimensionnée
    window.addEventListener('resize', updateHeaderDimensions);
    
    // Observer les changements de taille du parent
    const resizeObserver = new ResizeObserver(updateHeaderDimensions);
    if (header.value.parentElement) {
        resizeObserver.observe(header.value.parentElement);
    }
});

onUnmounted(() => {
    if (observer) {
        observer.disconnect();
    }
    window.removeEventListener('resize', updateHeaderDimensions);
});

watch(selectedFilter, (newValue) => {
    emit('update:filter', newValue);
});

const onSearch = (value) => {
    emit('update:search', value);
};

const onSortChange = (option) => {
    selectedSort.value = option;
    emit('update:sort', option);
};
</script>

<style scoped>
.header-placeholder {
    position: relative;
}

.list-header {
    background-color: transparent;
    transition: all 0.3s ease;
    position: relative;
    border-radius: 0px !important;
    display: flex;
}

.list-header.is-sticky {
    position: fixed;
    padding: 16px;
    top: 0;
    border-radius: 16px !important;
    margin-top: 64px !important;

    z-index: 1000;
   
 
}


.list-header.is-sticky .background1 {
    content: '';
    position: absolute;
    top: 0;

    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(var(--v-theme-background), 1);
    z-index: -1000;
    border-radius: 0px 0px 16px 16px;
    pointer-events: none;
   
 
}

.list-header.is-sticky .background2 {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(var(--v-theme-surface), 1);
    z-index: -1000;
    border-radius: 16px 16px 16px 16px;
    pointer-events: none;
   
 
}




</style>