I'll start introducing Aprograma by doing a little sketch of it:

- it is a dynamic site created with **Nuxt.js**
- it is connected to the headless CMS of **Storyblok** for content management
- it has a final goal to be "infinite", that is to increase its longevity and to be able to manage it without touching the code anymore

With this final goal, I'm not saying I want to create a CMS within the CMS, but to be able to abstract all the components, pages and layout of Aprograma making it completely dynamic and modular.

Having accepted this challenge, I will explain below how these "modules" were developed.

#### Pages

Aprograma contains five pages:

- Home
- About
- Portfolio
- Contact
- Blog

The **pages** folder is organized like this:

![img](https://a.storyblok.com/f/106240/476x612/89987f7c20/pages_three.png)

Each page has its index and in each dynamic page there is a folder containing a file which name starts with "_", for dynamic routes.

##### The template

~~~js
<template>
  <component
    :is="story.content.component"
    :key="story.content._uid"
    :blok="story.content"
  />
</template>
~~~

##### The logic

~~~js
export default {
  data () {
    return {
      story: {
        content: {}
      }
    }
  },
  fetch () {
    const slug = (this.$route.path === '/' || this.$route.path === '') ? '/home' : this.$route.path
    return this.$storyapi
      .get(`cdn/stories${slug}`, {
        language: this.$store.state.language.language
      }).then((res) => {
        this.story = res.data.story
      }).catch((res) => {
        if (!res) {
          this.error({
            statusCode: 404,
            message: 'Sorry but this content doesn\'t exist'
          })
        } else {
          this.error({
            statusCode: 500,
            message: `Sorry, but the content called: "${this.$route.name}" has a problem or doesn't exist`
          })
        }
      })
  },
  fetchDelay: 0,
  watch: {
    '$store.state.language.language': '$fetch'
  }
}
~~~

The goal of this approach is:

- to make the site highly fast and responsive,
- to use language switching without reloading the page,
- to not get the URL "dirty".