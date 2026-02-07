import type { App } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import 'primeicons/primeicons.css'

export function setupPrimeVue(app: App) {
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.dark-mode',
      },
    },
  })
  app.use(ConfirmationService)
  app.use(ToastService)
}
