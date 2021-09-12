Sito nato e pensato come blog alternativo, ossia che non si riferisca direttamente ad un possesso (dandogli il nome "Il blog di …" o simili), ma di renderlo una sorta di brand. Il concept finale di Aprograma si definisce in uno strumento codeless, progettato con il framework *Nuxt.js* e pronto ad essere connesso alle API di gestione dei contenuti di *Storyblok*.


##### Le pagine


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

Eccezione fatta per le pagine dinamiche dei post e dei progetti. Il loro template è il seguente:
#### 
