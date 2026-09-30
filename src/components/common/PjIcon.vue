<template><svg class="pj-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.grid"/></svg></template>
<script setup>
defineProps({ name: { type: String, default: 'grid' } })
const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  home: 'M3 10l9-7 9 7v11h-6v-7H9v7H3z',
  job: 'M5 4h14v17H5z M9 4V2h6v2 M9 9h6 M9 13h6 M9 17h4',
  instance: 'M12 3a9 9 0 1 0 9 9 M12 3v9l5 3 M16 3h5v5',
  workflow: 'M9 2h6v6H9z M2 16h6v6H2z M16 16h6v6h-6z M12 8v4 M5 16v-4h14v4',
  container: 'M3 7l9-5 9 5v10l-9 5-9-5z M3 7l9 5 9-5 M12 12v10',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 22v-2a8 8 0 0 1 16 0v2',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  namespace: 'M3 5h7l2 3h9v12H3z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  arrow: 'M8 10l4 4 4-4',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  refresh: 'M21 8a9 9 0 1 0 0 8 M21 3v5h-5',
  cpu: 'M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4',
  bell: 'M6 17V9a6 6 0 0 1 12 0v8l2 2H4z M10 22h4',
  check: 'M4 12l5 5L20 6',
  plus: 'M12 4v16 M4 12h16',
}
</script>
<style scoped>.pj-icon{width:20px;height:20px;display:inline-block;vertical-align:middle;flex-shrink:0}</style>
