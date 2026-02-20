<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import LegalFooter from '../components/layout/LegalFooter.vue'

const router = useRouter()

const legalName = import.meta.env.VITE_LEGAL_NAME || '[Name nicht konfiguriert]'
const legalAddress = import.meta.env.VITE_LEGAL_ADDRESS || '[Adresse nicht konfiguriert]'
const legalEmail = import.meta.env.VITE_LEGAL_EMAIL || '[E-Mail nicht konfiguriert]'
</script>

<template>
  <div class="legal-page">
    <div class="legal-content">
      <Button
        icon="pi pi-arrow-left"
        label="Zurück"
        severity="secondary"
        text
        size="small"
        class="mb-4"
        @click="router.back()"
      />

      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 TMG / § 18 Abs. 2 MStV</h2>
      <p>
        Dies ist ein privates, nicht-kommerzielles Projekt zur Organisation von Trainingsmaterialien.
        Es werden keine Waren oder Dienstleistungen angeboten. Es findet kein geschäftsmäßiger Betrieb statt.
      </p>

      <h3>Verantwortlich für den Inhalt</h3>
      <p>
        {{ legalName }}<br>
        {{ legalAddress }}
      </p>

      <h3>Kontakt</h3>
      <p>
        E-Mail: {{ legalEmail }}
      </p>

      <h2>Haftungsausschluss</h2>

      <h3>Haftung für Inhalte</h3>
      <p>
        Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
        Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
        Als privater Betreiber dieser Seite bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte
        auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG
        bin ich als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte
        fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen.
      </p>

      <h3>Haftung für Links</h3>
      <p>
        Diese Anwendung enthält Links zu externen Webseiten Dritter (insbesondere Videoplattformen),
        auf deren Inhalte ich keinen Einfluss habe. Deshalb kann ich für diese fremden Inhalte auch
        keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
        Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum
        Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte
        waren zum Zeitpunkt der Verlinkung nicht erkennbar.
      </p>
      <p>
        Es werden keine Videos gehostet oder hochgeladen. Diese Anwendung verlinkt ausschließlich
        auf frei zugängliche Inhalte auf Videoplattformen (z.B. YouTube) und respektiert dabei
        die jeweiligen Nutzungsbedingungen und Urheberrechte.
      </p>

      <h3>Urheberrecht</h3>
      <p>
        Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
        dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
        der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
        Zustimmung des jeweiligen Autors bzw. Erstellers.
      </p>

      <h2>Streitschlichtung</h2>
      <p>
        Es handelt sich um ein privates, nicht-kommerzielles Projekt. Eine Teilnahme an einem
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle ist daher nicht
        erforderlich und wird nicht angeboten.
      </p>
    </div>

    <LegalFooter />
  </div>
</template>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
}

.legal-content {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  flex: 1;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f9fafb;
  margin: 0 0 1.5rem;
}

h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e5e7eb;
  margin: 2rem 0 0.75rem;
}

h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #d1d5db;
  margin: 1.25rem 0 0.5rem;
}

p {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: #9ca3af;
  margin: 0 0 0.75rem;
}
</style>
