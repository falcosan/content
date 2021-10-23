Los que desarrollan saben lo que significa manipular datos, explicándolo brevemente significa manipular un determinado valor a través de procesos matemáticos (como una función por ejemplo) para definir un segundo valor. Replicando este proceso X veces y insertando todo en un conjunto estructurado en la mejor manera, se crea un programa. En general esta es la forma estándar de programar, pero a veces falta algo: la conciencia de la entropía.

Hago un ejemplo en secuencia temporal:

##### Antecedentes:

* Dev es un buen desarrollador.

<br>

##### Proceso:

 1. Dev hace un brainstorming pensando en la visión final de su proyecto definiendo todos sus objetivos.
 2. Dev comienza a programar y toma conciencia de lo que tendrá que hacer en la práctica para que todo funcione.
 3. Dev termina de programar y lanza la primera versión de su aplicación.
 4. Dev está contento.
 5. Habiendo hecho todo bien, mucha gente empieza a usar la aplicación de Dev.
 6. El trabajo de Dev no ha terminado, hay que seguir a mejorar aprovechando del feedback y del entusiasmo de los usuarios para el éxito del proyecto.
 7. Dev ha conseguido su propósito, su aplicación se hace súper popular y atrae a gente de otras plataformas similares a la creada por el (gana a la competencia).
 8. Como Dev es un amante del open source, su código es público y algunos colaboradores empiezan a enviar código para corregir o añadir funcionalidades (útil, pero difícil de gestionar a partir de cierto volumen).
 9. Dev no puede controlar a la gente y sus ideas a veces conflictivas una con la otra.
10. La presión social es insostenible y Dev, influenciado por todo esto, se ve obligado a revisar la visión final de su proyecto y sustituirla por una visión democrática.

<br>

No se tiene que tener necesariamente una opinión si cambiar los planes está bien o está mal, creo eso que es relativo. La cuestión es otra, con este ejemplo, la reflexión que me gustaría compartir es la importantancia del conocer y controlar la entropía. El gran desarrollador que es Dev ha conseguido alcanzar sus objetivos, sin embargo, a partir de un punto concreto del proceso, Dev se ve obligado a cambiar sus planes debido a la entropía, la variable que el no considerò. Pero, ¿qué es la entropía en este ámbito? De la forma más sencilla posible, la entropía puede explicarse como una medida del caos que permanece inalterable o aumenta con el tiempo.

![Img](https://a.storyblok.com/f/106240/1191x731/add4813309/explication-entropy.png)

Con este dibujito me planteo una pregunta: ¿hay una forma de captar las variables Z, S y X y, de consecuencia, gestionarlas?

Para llegar a una posible respuesta, primero pensé en responderme a través de un contexto más pequeño, con menos variables que las presentes en la situación de Dev. Como gran usuario del framework Vue.js, me paré a reflexionar sobre lo store de este framework, Vuex.

Para los que no sepan de qué estoy hablando, Vuex, el store de Vue, es un conjunto de variables definidas globalmente, a través de las cuales se pueden modificar estas variables o simplemente leerlas.

Es muy fácil manipular los datos con Vuex pero es también arriesgado porque estos valores son accesibles desde cualquier componente/página/plugin... Hay que tener la previsión de gestionar correctamente las distintas manipulaciones de los datos manteniendo la entropía cero. En este caso, para gestionar la entropía es necesario definir en cada componente una copia de los datos globales con una variable interna, así que todas las operaciones realizadas sobre la nueva variable permanecerán en el contexto en el que se definió esta última. Esta estrategia no siempre es válida, si la modificación de los datos globales ocurrida en el componente Header debe ser escuchada por el componente Footer, entonces no hacemos nada con la variable interna.

<br>

BIEN... extrapolando el ejemplo de Vuex más o menos logro entender que la mejor forma de gestionar la entropía es la abstracción.

Ahora, ¿cómo aplico el concepto de abstracción a la situación de Dev?

Intentando llegar a ello con las asociaciones: si nuestro Dev es lo store Vuex, los contribuyentes son los componentes/páginas/plugins y los comentarios y las ideas de los usuarios de la aplicación de Dev son las operaciones realizadas sobre los datos globales, definir la "variable interna" significaría representar este proceso: crear varias versiones beta de la aplicación de Dev donde cada una de ellas adopte una de las ideas de los contribuidores. Estas versiones paralelas, formadas por las insatisfacción con la visión original del producto por parte de Dev, son testeadas por una serie de beta tester. Los beta tester en cuestión consisten en grupos de personas seleccionadas sobre la base de una idea compartida de lo que, según ellos, debería ser la filosofía de la aplicación de Dev.  Al final, se elige la versión más apreciada por el público como release 2.0 de la aplicación de Dev.

Esta representación, aunque utópica e ignorante de los límites de la realidad, es mi respuesta a la aplicación de la abstracción para controlar la entropía.

---

Si te gustó el articulo, dale un me gusta en **[dev.to](https://dev.to/falcosan/the-entropy-of-states-5gbi)**.