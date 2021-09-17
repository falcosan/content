Empezaré presentando Aprograma haciendo un pequeño identikit del mismo:

- Es un sitio dinámico creado con **Nuxt.js**.
- está conectado al CMS sin cabeza de **Storyblok** para la gestión de contenidos
- tiene como objetivo final ser "infinito", es decir, aumentar su longevidad y poder gestionarlo sin tener que tocar más el código

Con este objetivo final, no digo que quiera crear un CMS dentro del CMS, sino poder abstraer todos los componentes, páginas y diseño de Aprograma haciéndolo completamente dinámico y modular.

Una vez aceptado este reto, explicaré a continuación cómo se desarrollaron estos "módulos".

#### Páginas

Aprograma contiene cinco páginas:

- Home
- About
- Portfolio
- Contact
- Blog

Organicé la carpeta **pages** de la siguiente manera:

![img](https://a.storyblok.com/f/106240/476x612/89987f7c20/pages_three.png)

Cada página tiene su propio index y en cada página dinámica hay una carpeta que contiene un archivo cuyo nombre empieza por "_", para las rutas dinámicas.

##### El template

```js
<template>
  <component
    :is="story.content.component"
    :key="story.content._uid"
    :blok="story.content"
  />
</template>
```

Todas las páginas tienen la misma plantilla, excepto las páginas dinámicas de los puestos y de los proyectos. La plantilla es la siguiente:

```js
<template>
// Obviamente, el componente <Project/> para los proyectos y el componente <Post/> para los artículos 
<Project :blok="story.content" />
</template>
```

##### La lógica

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

Los objetivos de este enfoque son:

 - hacer que el sitio sea muy rápido y receptivo,
 - utilizar el cambio de idioma sin recargar la página,
 - no "ensuciar" la URL.