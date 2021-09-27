Those who program know what it means to manipulate data, explaining it briefly means to manipulate a certain value through mathematical processes (such as a function for example), to define a second value. Replicating this process n times and inserting everything in a set, organizing and structuring in the best way this set, a program is created. Generally, this is the standard way to program something, but sometimes something is missing: the consciousness of entropy.

I make an example in temporal sequence:

##### Background:

* Dev is a good developer.

<br>

##### Process:

 1. Dev does some brainstorming thinking about the final vision of his project defining all his goals.
 2. Dev starts programming and becomes aware of what he will need to do in practice to make it all work.
 3. Dev finishes programming and releases his first version of his application into production.
 4. Dev is happy.
 5. Having done everything right, many people start using Dev's application.
 6. Dev's work is not finished, we need to keep on improving more and more by taking advantage of users' feedback and enthusiasm for the success of the project.
 7. Dev has succeeded in his intent, his application becomes super popular and attracts people from other platforms similar to the one created by him (he wins over the competition).
 8. Dev being a lover of open source, his code is public and some contributors start submitting code to fix or add features (useful, but difficult to manage beyond a certain volume).
 9. Dev can't control people and their sometimes conflicting ideas.
10. The social pressure is unsustainable and Dev, influenced by all this, is forced to revise the final vision of his project and replace it with a democratic vision.

<br>

There doesn't have to be a stance on whether changing your plans is right or wrong, I think it's relative. The question is another, with this example, the thought I would like to share is how important it is to know and control entropy. That great developer that Dev is, has managed to do what we all desire, achieve our goals. As I described, from a specific point in the process, entropy starts to be relevant, a variable that Dev had not considered. But what is entropy in this area? In the simplest possible way, entropy can be explained as a measure of chaos that remains unchanged or increases over time.

![Img](https://a.storyblok.com/f/106240/1191x731/add4813309/explication-entropy.png)

With the sketch above I ask myself a question: is there a better way to capture the variables Z, S, and X and consequently manage them?

To arrive at a possible answer, I first thought about answering myself through a smaller context, with fewer variables than those present in Dev's situation. As a great user of the Vue.js framework, I stopped to reflect on the store of this framework (Vuex).

For those who don't know what I'm talking about, Vuex, Vue's store, is a set of globally defined variables, through which these variables can be changed or simply read.

It is very easy to manipulate the data with Vuex but it is just as risky because such data is accessible from any component/page/plugin... You must have the foresight to manage the various manipulations of the data correctly while maintaining zero entropy. In this case, to manage entropy it is necessary to define in each component a copy of the global data with an internal variable, so all the operations carried out on the new variable will remain in the context in which the latter was defined. This strategy is not always valid, if the modification of global data occurred in the Header component must be listened to by the Footer component, then we do nothing with the internal variable.

<br>

OK .. extrapolating from the Vuex example I more or less achieve to understand that the best way to manage entropy is the abstraction.

Now how do I apply the concept of abstraction to Dev's situation?

Let's try to get there with associations: if our Dev is the Vuex store, the contributors are the components/pages/plugins, and the operations done on the global data are the feedback and ideas of the users of the Dev application, define the "internal variable" would mean ...

I'm thinking about it.