<template>
  <footer class="legal-footer">
    <div class="legal-links">
      <router-link to="/imprint" class="legal-link">Impressum</router-link>
      <span class="legal-sep">|</span>
      <router-link to="/privacy" class="legal-link">Datenschutz</router-link>
    </div>
  </footer>
</template>

<style scoped>
.legal-footer {
  flex-shrink: 0;
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.legal-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legal-link {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  text-decoration: none;
  transition: color 0.15s ease;
}

.legal-link:hover {
  color: rgba(255, 255, 255, 0.6);
}

.legal-sep {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.15);
}
</style>
