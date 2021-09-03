# Nuxt blog

Sito nato e pensato come blog alternativo, ossia che non si riferisca direttamente ad un possesso (dandogli il nome "Il blog di ..." o simili), ma di renderlo una sorta di brand. Il concept finale di Aprograma si definisce in uno strumento codeless, progettato con il framework **Nuxt.js** e pronto ad essere connesso alle API di gestione dei contenuti di **Storyblok**.

## Le pagine

Di default Aprograma contiene cinque pagine:

* Home
* About
* Portfolio
* Contact
* Blog

Tramite la creazione di una cartella con il nome della pagina desiderato, posta nella cartella **pages** giá presente nella root, Nuxt creerà per te le route della pagina.
Le pagine di **Portfolio** e **Blog** contengono

```vue
<template>
  <component
    :is="story.content.component"
    v-if="story.content.component && !$fetchState.pending"
    :key="story.content._uid"
    :blok="story.content"
  />
  <div v-else class="loading h-screen w-screen" />
</template>
```