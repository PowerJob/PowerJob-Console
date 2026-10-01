<script setup lang="ts">
withDefaults(defineProps<{name?:string}>(), {name:'grid'})
const paths:Record<string,string> = {
grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
home:'M3 10l9-7 9 7v11h-6v-7H9v7H3z',job:'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
instance:'M12 3a9 9 0 1 1-9 9M3 3v6h6M12 7v5l3 2',workflow:'M3 4h6v6H3zM15 14h6v6h-6zM15 4h6v6h-6zM9 7h6M6 10v7h9',
container:'M12 2l10 6v9l-10 6-10-6V8zM2 8l10 6 10-6M12 14v9',template:'M6 2h8l5 5v15H6zM14 2v6h5M9 12h7M9 16h7',
users:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 8M19 15c2 0 3 2 3 4v2',
settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 2h6l1 4 4 1 2 5-3 3 1 4-5 3-3-3-4 1-3-5 3-3-1-4z',
refresh:'M20 8a8 8 0 1 0 0 9M20 3v6h-6',plus:'M12 4v16M4 12h16',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l6 6',
arrow:'M5 12h14M14 7l5 5-5 5',menu:'M4 6h16M4 12h16M4 18h16',chevron:'M8 5l7 7-7 7',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
server:'M3 3h18v7H3zM3 14h18v7H3zM7 6h1M7 17h1',play:'M7 3l14 9-14 9z',check:'M4 12l5 5L20 6',
logout:'M9 4H3v16h6M9 12h12M17 8l4 4-4 4',app:'M3 5h18v14H3zM3 9h18M8 5v14',
}
</script>
<template><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path :d="paths[name] || paths.grid"/></svg></template>
