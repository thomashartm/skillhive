import type { App } from 'vue'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primeuix/styled'
import Aura from '@primevue/themes/aura'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import 'primeicons/primeicons.css'

const SkillHivePreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
    },
  },
})

export function setupPrimeVue(app: App) {
  app.use(PrimeVue, {
    theme: {
      preset: SkillHivePreset,
      options: {
        darkModeSelector: '.p-dark',
      },
    },
  })
  app.use(ConfirmationService)
  app.use(ToastService)
}
