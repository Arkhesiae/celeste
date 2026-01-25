export default {
    mounted (el, binding) {
        const duration = binding.arg ? Number(binding.arg) : 600
        let timer
        let pressExecuted = false

        el._start = (e) => {
            pressExecuted = false
            // Check if left click (button 0) or touch
            if (e.button !== 0 && e.button !== undefined) return

            timer = setTimeout(() => {
                pressExecuted = true
                binding.value(e)
            }, duration)
        }

        el._cancel = () => {
            clearTimeout(timer)
        }

        el._preventClick = (e) => {
            if (pressExecuted) {
                e.preventDefault()
                e.stopImmediatePropagation()
            }
        }

        el.addEventListener('pointerdown', el._start)
        el.addEventListener('pointerup', el._cancel)
        el.addEventListener('pointerleave', el._cancel)
        el.addEventListener('pointercancel', el._cancel)

        // Capture phase to intercept before other listeners
        el.addEventListener('click', el._preventClick, { capture: true })
    },

    unmounted (el) {
        el.removeEventListener('pointerdown', el._start)
        el.removeEventListener('pointerup', el._cancel)
        el.removeEventListener('pointerleave', el._cancel)
        el.removeEventListener('pointercancel', el._cancel)
        el.removeEventListener('click', el._preventClick, { capture: true })

        delete el._start
        delete el._cancel
        delete el._preventClick
    }
}
