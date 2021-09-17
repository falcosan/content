Inizio a presentare Aprograma facendo un suo piccolo identikit:

- è un sito dinamico  creato con **Nuxt.js**
- è connesso al CMS headless di **Storyblok** per la gestione dei contenuti
- ha come obbiettivo finale di essere “infinito”, ovvero di aumentare la sua longevità e poterlo gestire senza dove toccare più il codice

Con questo scopo finale, non sto dicendo di voler creare un CMS dentro il CMS, ma di riuscire ad astrarre tutti i componenti, le pagine e il layout di Aprograma rendendolo completamente dinamico e modulare.

Accettata questa sfida, di seguito spiegherò come sono stati sviluppati questi “moduli”.

#### Pagine

Aprograma contiene cinque pagine:

- Home
- About
- Portfolio
- Contact
- Blog

Organizzate nella cartella **pages** in questo modo:

![img](https://a.storyblok.com/f/106240/476x612/89987f7c20/pages_three.png)

Ogni pagina ha la sua index e in ogni pagina dinamica è presente una cartella contenente un file il cui nome inizia con “_”, per le route dinamiche.

##### Il template

```js
<template>
  <component
    :is="story.content.component"
    :key="story.content._uid"
    :blok="story.content"
  />
</template>
```

Tutte le pagine hanno lo stesso template eccezione fatta per le pagine dinamiche dei post e dei progetti. Il template è il seguente:

```js
<template>
// Ovviamente, il componente <Project/> per i progetti ed il componente <Post/> per i post
<Project :blok="story.content" />
</template>
```

##### La logica

```js
export default {
  asyncData (context) {
    const slug = (context.route.path === ‘/‘ || context.route.path === ‘’) ? ‘/home’ : context.route.path
    return context.app.$storyapi
      .get(`cdn/stories${slug}`, {
        language: context.store.state.language.language
      }).then((res) => {
        return res.data
      }).catch((res) => {
        context.$errorMessage(res.response,
          ‘Sorry but this content doesn\’t exist’, `Sorry, but the content called: “${context.route.name}” has a problem or doesn’t exist`
        )
      })
  },
  watch: {
    ‘$store.state.language.language’ () { this.$nuxt.refresh() }
  }
}
```

Gli obiettivi di questo approccio:

 - rendere il sito altamente veloce e reattivo,
 - utilizzare il cambio della lingua senza ricaricare la pagina,
 - non “sporcare” l’ URL.