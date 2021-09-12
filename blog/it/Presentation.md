Inizio a presentare Aprograma facendo un suo piccolo identikit:

- è un sito dinamico  creato con **Nuxt.js**;
- è connesso al CMS headless di **Storyblok** per la gestione dei contenuti;
- ha come obbiettivo finale di essere “infinito”, ovvero di aumentare la sua longevità e poterlo gestire senza dove toccare più il codice.

Con questo scopo finale, non sto dicendo di voler creare un CMS dentro il CMS, ma di riuscire ad astrarre tutti i componenti, le pagine e il layout di Aprograma rendendolo completamente dinamico e modulare.

Accettata questa sfida, di seguito spiegherò come sono stati sviluppati questi “moduli”.

### Le pagine
Di default Aprograma contiene cinque pagine:

- Home
- About
- Portfolio
- Contact
- Blog

Il template delle pagine:

```js
<template>
  <component
    :is="story.content.component"
    :v-if="!$nuxt.isFetching"
    :key="story.content._uid"
    :blok="story.content"
  />
</template>
```

Tutte le pagine hanno lo stesso template eccezione fatta per le pagine dinamiche dei post e dei progetti. Il loro template è il seguente:

