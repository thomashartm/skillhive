<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import LegalFooter from '../components/layout/LegalFooter.vue'

const router = useRouter()

const legalName = import.meta.env.VITE_LEGAL_NAME || '[Name nicht konfiguriert]'
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

      <h1>Datenschutzerklärung</h1>

      <h2>1. Allgemeines</h2>
      <p>
        Diese Datenschutzerklärung klärt über die Art, den Umfang und Zweck der Verarbeitung
        personenbezogener Daten innerhalb dieser Webanwendung auf. Dies ist ein privates,
        nicht-kommerzielles Projekt zur Organisation von Trainingsmaterialien. Es findet
        kein geschäftsmäßiger Betrieb statt.
      </p>
      <p>
        Verantwortlicher im Sinne der DSGVO:
      </p>
      <p>
        {{ legalName }}<br>
        E-Mail: {{ legalEmail }}
      </p>

      <h2>2. Erhobene Daten</h2>

      <h3>2.1 Registrierung und Authentifizierung</h3>
      <p>
        Für die Nutzung der Anwendung ist eine Registrierung erforderlich. Dabei werden
        folgende Daten erhoben:
      </p>
      <ul>
        <li>E-Mail-Adresse</li>
        <li>Passwort (verschlüsselt gespeichert)</li>
        <li>Anzeigename (optional)</li>
      </ul>
      <p>
        Alternativ ist die Anmeldung über Google (OAuth) möglich. Dabei werden Name,
        E-Mail-Adresse und Profilbild von Google übermittelt.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung — Bereitstellung des Dienstes).
      </p>

      <h3>2.2 Nutzungsdaten</h3>
      <p>
        Bei der Nutzung der Anwendung werden die von Ihnen erstellten Inhalte gespeichert
        (Curricula, Verknüpfungen zu Techniken, Kategorien, Tags und Verweise auf externe
        Video-URLs). Diese Daten sind für die Funktionalität der Anwendung erforderlich.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
      </p>

      <h3>2.3 Serverseitige Protokollierung</h3>
      <p>
        Bei jedem Zugriff auf die Anwendung werden durch den Hosting-Anbieter
        (Google Cloud Platform) automatisch Zugriffsdaten erhoben (Server-Logfiles):
      </p>
      <ul>
        <li>IP-Adresse (anonymisiert)</li>
        <li>Zeitpunkt des Zugriffs</li>
        <li>Angeforderte URL</li>
        <li>HTTP-Statuscode</li>
        <li>Browser-Typ und -Version</li>
      </ul>
      <p>
        Diese Daten werden ausschließlich zur Sicherstellung eines störungsfreien Betriebs
        und zur Fehlerbehebung verwendet. Eine Zusammenführung mit anderen Datenquellen
        findet nicht statt.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
        Sicherheit und Stabilität des Dienstes).
      </p>

      <h2>3. Externe Dienste</h2>

      <h3>3.1 Firebase Authentication (Google)</h3>
      <p>
        Für die Benutzerverwaltung und Authentifizierung wird Firebase Authentication
        von Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irland) eingesetzt.
        Firebase verarbeitet die bei der Registrierung angegebenen Daten (E-Mail, Passwort-Hash).
      </p>
      <p>
        Datenschutzerklärung von Google:
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
          https://policies.google.com/privacy
        </a>
      </p>

      <h3>3.2 Google Cloud Firestore</h3>
      <p>
        Die Anwendungsdaten werden in Google Cloud Firestore gespeichert. Die Datenverarbeitung
        erfolgt in der EU (Rechenzentrumsstandort: europe-west1 bzw. europe-west3).
      </p>

      <h3>3.3 YouTube</h3>
      <p>
        Diese Anwendung verlinkt auf Videoinhalte auf YouTube (Google Ireland Limited).
        Es werden keine YouTube-Videos eingebettet. Beim Aufruf eines Links verlassen Sie
        diese Anwendung und es gelten die Datenschutzbestimmungen von YouTube/Google.
      </p>
      <p>
        Für die Metadaten-Anreicherung werden die YouTube Data API und öffentlich zugängliche
        Videoinformationen (Titel, Beschreibung, Thumbnail) genutzt. Es werden keine
        personenbezogenen Daten der Nutzer an YouTube übermittelt.
      </p>

      <h2>4. Cookies und lokale Speicherung</h2>
      <p>
        Diese Anwendung verwendet keine Tracking-Cookies und keine Analyse-Tools (kein
        Google Analytics, kein Facebook Pixel o.Ä.).
      </p>
      <p>
        Es wird ausschließlich der lokale Speicher (Local Storage) des Browsers genutzt,
        um technisch notwendige Daten zu speichern:
      </p>
      <ul>
        <li>Authentifizierungs-Token (Firebase)</li>
        <li>Ausgewählte Disziplin (Benutzereinstellung)</li>
      </ul>
      <p>
        Diese Daten verlassen den Browser nicht und dienen ausschließlich der Funktionalität.
      </p>

      <h2>5. Datenweitergabe</h2>
      <p>
        Eine Weitergabe personenbezogener Daten an Dritte findet nicht statt, es sei denn,
        dies ist zur Bereitstellung des Dienstes erforderlich (siehe Abschnitt 3: Externe Dienste)
        oder es besteht eine gesetzliche Verpflichtung.
      </p>

      <h2>6. Speicherdauer</h2>
      <p>
        Personenbezogene Daten werden nur so lange gespeichert, wie es für die Bereitstellung
        des Dienstes erforderlich ist. Bei Löschung des Benutzerkontos werden alle zugehörigen
        Daten entfernt.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p>Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
      <ul>
        <li><strong>Auskunft</strong> (Art. 15 DSGVO) — Welche Daten über Sie gespeichert sind</li>
        <li><strong>Berichtigung</strong> (Art. 16 DSGVO) — Korrektur unrichtiger Daten</li>
        <li><strong>Löschung</strong> (Art. 17 DSGVO) — Löschung Ihrer Daten</li>
        <li><strong>Einschränkung</strong> (Art. 18 DSGVO) — Einschränkung der Verarbeitung</li>
        <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Export Ihrer Daten</li>
        <li><strong>Widerspruch</strong> (Art. 21 DSGVO) — Widerspruch gegen die Verarbeitung</li>
      </ul>
      <p>
        Zur Ausübung Ihrer Rechte wenden Sie sich bitte per E-Mail an die oben genannte Adresse.
      </p>
      <p>
        Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
      </p>

      <h2>8. Änderungen</h2>
      <p>
        Diese Datenschutzerklärung kann bei Bedarf angepasst werden. Die aktuelle Version
        ist stets über diese Seite abrufbar.
      </p>

      <p class="last-updated">Stand: Februar 2026</p>
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

ul {
  margin: 0 0 0.75rem;
  padding-left: 1.5rem;
}

li {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

a {
  color: var(--primary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.last-updated {
  margin-top: 2rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.25);
}
</style>
