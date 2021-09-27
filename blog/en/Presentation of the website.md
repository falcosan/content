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
  watch: {
    '$store.state.language.language': '$fetch'
  }
}
~~~

The goal of this approach is:

- to make the site highly fast and responsive,
- to use language switching without reloading the page,
- to not get the URL "dirty".

#### The core components

##### Page

```js
<template>
  <section v-if="!blok.hide" :class="`${blok.name.toLowerCase()}-page p-5`">
    <h1 v-if="blok.title" class="page-title mb-5 text-xl sm:text-2xl break-words">
      {{ blok.title }}
    </h1>
    <div class="page-components relative flex flex-wrap -m-2.5">
      <component
        :is="component.component"
        v-for="component in components"
        :key="component._uid"
        :blok="component"
        :style="`flex: ${component.row_container ? `1 ${(100 - (maxComponents > 1 ? spaceFix : 0 )) / $rangeItems(maxComponents, 3)}%` : '100%'};`"
        :class="`${component.component.toLowerCase()}-content ${component.component.toLowerCase() === 'blank' ? '' : `${setAlignContent} m-2.5` } ${component.component.toLowerCase() === 'container' && component.slider_mode === 'slider' ? 'overflow-hidden' : ''}`"
      />
    </div>
  </section>
  <section v-else class="page-maintenance fixed max-w-sm xs:max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-5xl 2xl:max-w-7xl flex items-center justify-center inset-0 px-5">
    <h1 class="maintenance-text p-20 text-xs xs:text-base sm:text-lg text-center pointer-events-none rounded uppercase italic bg-opacity-80 bg-white">
      {{ $languageCase("This page is in maintenance, sorry for the inconvenience", "Esta página está en mantenimiento, disculpe las molestias", "Questa pagina è in manutenzione, scusa per l'inconveniente") }}
    </h1>
  </section>
</template>

<script>
export default {
  props: {
    blok: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      spaceFix: 20
    }
  },
  computed: {
    rowComponent () {
      return this.blok.body.filter(function (item) { return item.row_container })
    },
    components () {
      return this.blok.body.filter(component => component.resolution_show ? this.$store.state.data.windowWidth >= component.resolution_show.split('; ')[1] : component)
    },
    maxComponents () {
      if (Number(this.blok.column_container)) {
        if (this.$store.state.data.windowWidth >= 1440) {
          return this.$rangeItems(Number(this.blok.column_container), 3)
        } return this.$store.state.data.windowWidth >= 768 ? this.$rangeItems(Number(this.blok.column_container), 2) : 1
      } else {
        if (this.$store.state.data.windowWidth >= 1440) {
          return this.$rangeItems(this.rowComponent.length, 3)
        } return this.$store.state.data.windowWidth >= 768 ? this.$rangeItems(this.rowComponent.length, 2) : 1
      }
    },
    setAlignContent () {
      switch (this.blok.align_content) {
        case 'start':
          return 'self-start'
        case 'center':
          return 'self-center'
        case 'end':
          return 'self-end'
      } return 'self-baseline'
    }
  },
  beforeMount () {
    this.setMaintenance()
  },
  methods: {
    setMaintenance () {
      if (this.blok.hide) {
        this.$noscroll(true)
      } else {
        this.$noscroll(false)
      }
    }
  }
}
</script>
````

##### Container

```js
<template>
  <div
    v-if="blok.body.length > 0"
    :class="`container-cover w-full ${carouselMode || sliderMode || containerMode ? 'grid' : 'parent-cover'}`"
  >
    <component
      :is="sliderMode || carouselMode || containerMode ? 'h2' : 'h1'"
      v-if="blok.title"
      :class="`container-title break-words text-xl ${sliderMode || carouselMode || containerMode ? 'mx-5 mt-5' : 'sm:text-2xl'}`"
      :style="`color: ${blok.title_color.color};`"
    >
      {{ blok.title }}
    </component>
    <div
      :class="`container-content h-full rounded ${blok.slider_mode === 'slider' ? 'overflow-hidden' : ''}`"
      :style="`background-color: ${blok.background_color_container.color};`"
    >
      <div
        v-if="blok.body.length > 1 && (blok.slider_mode === 'slider' || blok.slider_mode === 'carousel')"
        :class="`slider-wrapper relative ${sliderMode || containerMode ? 'flex justify-center' : ''} ${!blok.remove_space ? !blok.background_color_container.color && blok.title ? 'px-5 p-5' : 'p-5': ''}`"
      >
        <Icon
          v-if="(blok.slider_mode === 'slider' || $store.state.data.windowWidth < 640 || !$device.isDesktop || sliderMode || carouselMode || blok.row_container) && !blok.hide_controllers"
          previous
          :class="`previous-control control absolute z-20 transform rounded-full bg-opacity-70 shadow-sm text-white bg-gray-500 ${blok.slider_mode === 'slider' ? 'top-1/2 -translate-y-1/2' : sliderMode || carouselMode ? !blok.hide_dots ? 'bottom-3.5' : '-bottom-3.5' : !blok.hide_dots ? 'bottom-7' : '-bottom-7'} ${sliderMode ? fullWidth > 295 ? 'left-10' : 'left-5' : 'left-2'}`"
          :size="`${sliderMode || carouselMode ? 'w-5 h-5 p-1.5' : 'w-6 h-6 p-2'}`"
          tag="button"
          @click.native="previous"
        />
        <div v-else-if="blok.slider_mode === 'carousel' && (!sliderMode || !carouselMode) && !blok.row_container && !blok.hide_controllers" class="previous-control control h-full w-full absolute top-0 z-10 -left-1/2 cursor-previous" @click="previous" />
        <Icon
          v-if="(blok.slider_mode === 'slider' || $store.state.data.windowWidth < 640 || !$device.isDesktop || sliderMode || carouselMode || blok.row_container) && !blok.hide_controllers"
          next
          :class="`next-control control absolute z-20 transform rounded-full bg-opacity-70 shadow-sm text-white bg-gray-500 ${blok.slider_mode === 'slider' ? 'top-1/2 -translate-y-1/2' : sliderMode || carouselMode ? !blok.hide_dots ? 'bottom-3.5' : '-bottom-3.5' : !blok.hide_dots ? 'bottom-7' : '-bottom-7'} ${sliderMode ? fullWidth > 295 ? 'right-10' : 'right-5' : 'right-2'}`"
          :size="`${sliderMode || carouselMode ? 'w-5 h-5 p-1.5' : 'w-6 h-6 p-2'}`"
          tag="button"
          @click.native="next"
        />
        <div v-else-if="blok.slider_mode === 'carousel' && (!sliderMode || !carouselMode) && !blok.row_container && !blok.hide_controllers" class="next-control control h-full w-full absolute top-0 z-10 -right-1/2 cursor-next" @click="next" />
        <div ref="sliderBox" :class="`slider-box w-full rounded ${blok.slider_mode ? 'overflow-hidden' : ''}`">
          <div v-if="blok.slider_mode === 'slider'" class="slider-container">
            <ul
              :key="sliderKey"
              :style="`min-height: ${blok.height}; transform: translateX(${-((containerWidth + spaceFix) * sliderIndex)}px); gap: ${spaceFix}px;`"
              class="slider relative grid grid-flow-col-dense transition-transform"
            >
              <template v-for="component in elements">
                <li
                  :key="component._uid"
                  ref="sliderSlide"
                  v-touch:swipe.stop.left="!blok.hide_controllers ? next : null"
                  v-touch:swipe.stop.right="!blok.hide_controllers ? previous : null"
                  :tabindex="!blok.hide_controllers ? '0' : false"
                  :style="`width: ${containerWidth}px; background-color: ${blok.background_color_component.color};`"
                  :class="`slider-slide slide flex my-0 mx-auto rounded ${setAlignContent} ${!blok.hide_controllers ? 'outline-none' : ''} ${sliderMode || carouselMode || containerMode ? '' : 'parent-slide'}`"
                  @keydown.right.prevent="!blok.hide_controllers ? next() : null"
                  @keydown.left.prevent="!blok.hide_controllers ? previous() : null"
                  @mouseenter="focusContainer($refs.sliderSlide[0])"
                >
                  <component
                    :is="component.component"
                    :class="`${component.name.toLowerCase()}-component my-0 mx-auto`"
                    :blok="component"
                    slider-mode
                    :container-width="containerWidth"
                  />
                </li>
              </template>
            </ul>
          </div>
          <div v-else class="carousel-container">
            <transition-group
              tag="ul"
              class="carousel relative grid rounded"
              enter-active-class="in-out duration-500"
              leave-active-class="out-in duration-500"
              :style="`min-height: ${blok.height};`"
            >
              <template v-for="(component, index) in elements">
                <li
                  v-show="index === currentSlide"
                  :key="component._uid"
                  ref="carouselSlide"
                  v-touch:swipe.stop.left="!blok.hide_controllers ? next : null"
                  v-touch:swipe.stop.right="!blok.hide_controllers ? previous : null"
                  :class="`carousel-slide slide w-full flex row-start-1 row-end-1 col-start-1 col-end-1 rounded ${setAlignContent} ${!blok.hide_controllers ? 'outline-none' : ''} ${index === currentSlide ? `show ${transitionEnter}` : `hidden ${transitionLeave}`} ${sliderMode || carouselMode || containerMode ? '' : 'parent-slide'}`"
                  :style="`background-color: ${blok.background_color_component.color};`"
                  :tabindex="!blok.hide_controllers ? '0' : false"
                  @mouseenter="focusContainer($refs.carouselSlide[0])"
                  @keydown.right.prevent="!blok.hide_controllers ? next() : null"
                  @keydown.left.prevent="!blok.hide_controllers ? previous() : null"
                >
                  <component
                    :is="component.component"
                    :class="`${component.name.toLowerCase()}-component my-0 mx-auto`"
                    :blok="component"
                    carousel-mode
                    :container-width="fullWidth"
                  />
                </li>
              </template>
            </transition-group>
            <div v-if="!blok.hide_dots" class="dot-contaienr relative w-max max-w-1/2 flex flex-wrap justify-center z-20 mt-10 mx-auto">
              <span v-for="dot in elements.length" :key="dot" :class="`dot-number_${dot} w-2.5 h-2.5 inline-block m-1.5 rounded-full shadow-inner select-none cursor-pointer transform scale-90 transition-all duration-200 ${!$device.isDesktop ? '' : 'dot-desktop'} ${dot === currentSlide + 1 ? 'ring-2 ring-gray-400 bg-gray-500 bg-opacity-70' : 'bg-gray-400 bg-opacity-70'}`" @click="changeDot(dot)">
                <span v-if="$device.isDesktop" class="dot-text absolute w-5 h-5 flex justify-center items-center left-1/2 top-0 rounded-full text-xs text-white bg-opacity-70 bg-gray-500">{{ dot }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="container-box h-full overflow-hidden">
        <div
          :class="`container-components h-full flex flex-wrap rounded -m-2.5 ${!blok.remove_space ? !blok.background_color_container.color && blok.title ? 'px-5 p-5' : 'p-5': ''}`"
          :style="`min-height: ${blok.height};`"
        >
          <template v-for="component in elements">
            <div
              :key="component._uid"
              :style="`flex: ${component.row_container ? `1 ${(100 - (maxElements > 1 ? spaceFix : 0)) / maxElements}%` : '100%'}; background-color: ${component.component.toLowerCase() === 'blank' ? false : blok.background_color_component.color};`"
              :class="`${component.name.toLowerCase()}-container ${sliderMode || carouselMode || containerMode ? '' : 'parent-container'} ${component.component.toLowerCase() === 'blank' ? '' : `${setAlignContent} m-2.5 rounded`}`"
            >
              <component
                :is="component.component"
                :class="`${component.name.toLowerCase()}-component`"
                :blok="component"
                container-mode
                :container-width="fullWidth"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  props: {
    blok: {
      type: Object,
      required: true
    },
    sliderMode: {
      type: Boolean,
      default: false
    },
    carouselMode: {
      type: Boolean,
      default: false
    },
    containerMode: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      max: Number(this.blok.max_slides),
      columnSet: Number(this.blok.column_container),
      sliderKey: 0,
      sliderIndex: 0,
      currentSlide: 0,
      setAutoPlay: 0,
      fullWidth: 0,
      containerWidth: 0,
      transitionEnter: '',
      transitionLeave: '',
      spaceFix: 20,
      focusDisable: false
    }
  },
  computed: {
    elements () {
      if (this.blok.slider_mode === 'slider' || this.blok.slider_mode === 'carousel') {
        return this.blok.body
      } else {
        return this.blok.body.filter(component => component.resolution_show ? this.fullWidth >= Number(component.resolution_show.split('; ')[0]) : component)
      }
    },
    rowComponent () {
      return this.elements.filter(function (item) { return item.row_container })
    },
    defaultMax () {
      if (this.fullWidth >= 1239) {
        return this.$rangeItems((this.elements.length - 1), 5)
      } else if (this.fullWidth >= 983) {
        return this.$rangeItems((this.elements.length - 1), 4)
      } else if (this.fullWidth >= 727) {
        return this.$rangeItems((this.elements.length - 1), 3)
      } return this.fullWidth >= 535 ? this.$rangeItems((this.elements.length - 1), 2) : 1
    },
    maxElements () {
      if ((this.blok.slider_mode === 'slider' || this.blok.slider_mode === 'carousel') && this.elements.length > 1) {
        if (this.max && this.max <= this.defaultMax) {
          if (this.fullWidth >= 1239) {
            return this.$rangeItems(this.max, 5)
          } else if (this.fullWidth >= 983) {
            return this.$rangeItems(this.max, 4)
          } else if (this.fullWidth >= 727) {
            return this.$rangeItems(this.max, 3)
          } return this.fullWidth >= 535 ? this.$rangeItems(this.max, 2) : 1
        } else {
          if (this.fullWidth >= 1239) {
            return this.$rangeItems(this.defaultMax, 5)
          } else if (this.fullWidth >= 983) {
            return this.$rangeItems(this.defaultMax, 4)
          } else if (this.fullWidth >= 727) {
            return this.$rangeItems(this.defaultMax, 3)
          } return this.fullWidth >= 535 ? this.$rangeItems(this.defaultMax, 2) : 1
        }
      } else if (this.columnSet && this.elements.length > 1) {
        if (this.fullWidth + (this.spaceFix * this.$rangeItems(this.defaultMax, 3)) >= 1239) {
          return this.$rangeItems(this.columnSet, 3)
        } return this.fullWidth + (this.spaceFix * this.$rangeItems(this.defaultMax, 3)) >= 535 ? this.$rangeItems(this.columnSet, 2) : 1
      } else {
        if (this.fullWidth >= 983) {
          return this.$rangeItems(this.rowComponent.length, 3)
        } return this.fullWidth >= 535 ? this.$rangeItems(this.rowComponent.length, 2) : 1
      }
    },
    setAlignContent () {
      switch (this.blok.align_content) {
        case 'start':
          return 'self-start'
        case 'center':
          return 'self-center'
        case 'end':
          return 'self-end'
      } return ''
    }
  },
  watch: {
    '$store.state.data.windowWidth' () {
      this.getContainerWidth()
      if (this.blok.slider_mode === 'slider' || this.blok.slider_mode === 'carousel') {
        this.sliderKey++
      }
    },
    fullWidth () { if (this.sliderIndex > 0) { this.sliderIndex = 0 } }
  },
  async mounted () {
    await this.getContainerWidth()
    if (this.blok.slider_mode === 'slider' || this.blok.slider_mode === 'carousel') {
      this.sliderKey++
      if (this.blok.auto_play) {
        this.autoPlay()
      }
    }
  },
  beforeUpdate () {
    this.getContainerWidth()
  },
  beforeDestroy () {
    this.clearAll()
  },
  methods: {
    setPrevious () {
      if (this.blok.slider_mode === 'slider') {
        if (-((this.containerWidth + this.spaceFix) * this.sliderIndex) + this.containerWidth <= 1) { this.sliderIndex-- } else {
          this.sliderIndex = this.elements.length - this.maxElements
          if (this.blok.auto_play) {
            this.clearAutoPlay()
          }
        }
      } else if (this.blok.slider_mode === 'carousel') {
        if (this.currentSlide > 0) { this.currentSlide-- } else {
          this.currentSlide = (this.elements.length - 1)
          if (this.blok.auto_play) {
            this.clearAutoPlay()
          }
        }
        this.transitionEnter = 'enter-right'
        this.transitionLeave = 'leave-right'
      }
    },
    setNext () {
      if (this.blok.slider_mode === 'slider') {
        if (-((this.containerWidth + this.spaceFix) * this.sliderIndex) - this.$refs.sliderBox.clientWidth >= -((this.containerWidth + this.spaceFix) * (this.elements.length - 1))) { this.sliderIndex++ } else {
          this.sliderIndex = 0
          if (this.blok.auto_play) {
            this.clearAutoPlay()
          }
        }
      } else if (this.blok.slider_mode === 'carousel') {
        if ((this.elements.length - 1) > this.currentSlide) { this.currentSlide++ } else {
          this.currentSlide = 0
          if (this.blok.auto_play) {
            this.clearAutoPlay()
          }
        }
        this.transitionEnter = 'enter-left'
        this.transitionLeave = 'leave-left'
      }
    },
    next () {
      if (this.blok.auto_play) {
        this.setNext()
        this.clearAutoPlay()
        this.autoPlay()
      } else {
        this.setNext()
      }
    },
    previous () {
      if (this.blok.auto_play) {
        this.setPrevious()
        this.clearAutoPlay()
        this.autoPlay()
      } else {
        this.setPrevious()
      }
    },
    changeDot (input) {
      if (this.blok.auto_play) {
        this.clearAutoPlay()
        this.autoPlay()
      }
      this.currentSlide = input - 1
      this.transitionEnter = ''
      this.transitionLeave = ''
    },
    autoPlay () {
      this.setAutoPlay = setTimeout(this.next, this.blok.slider_time ? this.blok.slider_time : '5000')
    },
    clearAutoPlay () {
      clearTimeout(this.setAutoPlay)
      this.setAutoPlay = 0
    },
    getContainerWidth () {
      const containerSelect = this.blok.body.length > 1 && (this.blok.slider_mode === 'slider' || this.blok.slider_mode === 'carousel') ? this.$refs.sliderBox.clientWidth : this.$el.clientWidth
      if (this.sliderMode || this.carouselMode || this.containerMode) {
        this.$nextTick(function () {
          this.fullWidth = containerSelect
          this.containerWidth = containerSelect / this.maxElements - (this.spaceFix / this.maxElements) * (this.maxElements - 1)
        })
      } else {
        this.fullWidth = containerSelect
        this.containerWidth = containerSelect / this.maxElements - (this.spaceFix / this.maxElements) * (this.maxElements - 1)
      }
    },
    focusContainer (element) {
      if (!this.focusDisable) {
        this.$nextTick(function () {
          element.focus({ preventScroll: true })
        })
      }
    },
    clearAll () {
      this.focusDisable = true
      this.transitionEnter = ''
      this.transitionLeave = ''
      if ((this.blok.slider_mode === 'slider' || this.blok.slider_mode === 'carousel') && this.blok.auto_play) {
        this.clearAutoPlay()
      }
    }
  }
}
</script>
<style scoped>
.parent-cover > .container-content > .container-components {
  position: relative;
  top: 10px;
  margin-top: -20px;
}
.hidden{
  display: flex !important;
  opacity: 0;
  pointer-events: none;
  cursor: none;
}
.show {
  opacity: 1;
}
.show > *{
  position: relative;
  z-index: 11;
}
.hidden.leave-right{
  animation: moveLeaveRight .5s cubic-bezier(0.77, 0, 0.175, 1);
}
.hidden.leave-left{
  animation: moveLeaveLeft .5s cubic-bezier(0.77, 0, 0.175, 1);
}
.show.enter-right{
  animation: moveEnterRight .5s cubic-bezier(0.77, 0, 0.175, 1);
}
.show.enter-left{
  animation: moveEnterLeft .5s cubic-bezier(0.77, 0, 0.175, 1);
}
@keyframes moveEnterRight {
 from {
  transform: translateX(-100%);
  }
  to {
  transform: translateX(0);
  }
}
@keyframes moveEnterLeft {
 from {
  transform: translateX(100%);
  }
  to {
  transform: translateX(0);
  }
}
@keyframes moveLeaveRight {
 from {
  transform: translateX(0);
  }
  to {
  transform: translateX(100%);
  }
}
@keyframes moveLeaveLeft {
 from {
  transform: translateX(0);
  }
  to {
  transform: translateX(-100%);
  }
}

.slider-box .slider .slider-slide {
  transform: translate3d(0, 0, 0);
}
.dot-desktop .dot-text{
  opacity: 0;
  pointer-events: none;
  transform: translate(-10.5px, -25px);
  transition: opacity .2s ease;
}
.dot-desktop:hover .dot-text{
  opacity: 1;
}
</style>
```
