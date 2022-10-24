Those who program know what it means to manipulate data, explaining it briefly means to manipulate a certain value through mathematical processes (such as a function for example) to define a second value. If this process is replicated many times, inserted as a set and structured in the best way, then a program will be created. Generally, this is the standard way to program, but sometimes something is missing: the consciousness of entropy.

Here is an example in temporal sequence:

##### Background:

- Dev is a good developer.

<br>

##### Process:

 1. Dev does some brainstorming thinking about the final vision of his project defining all his goals.
 2. Dev starts programming and becomes aware of what he will need to do in practice to make it all work.
 3. Dev finishes programming and releases his first version of his application.
 4. Dev is happy.
 5. Having done everything right, many people start using Dev's application.
 6. Dev's work is not finished, he needs to keep on improving by taking advantage of users' feedback and enthusiasm for the success of the project.
 7. Dev has succeeded, his application becomes super popular and attracts people from other platforms similar to the one created by him (he wins over the competition).
 8. Dev is an open source lover, his code is public and some contributors start submitting codes to fix or add features (useful, but difficult to manage beyond a certain volume).
 9. Dev can't control people and their “sometimes” conflicting ideas.
10. The social pressure is unsustainable and Dev, influenced by all this, is forced to revise the final vision of his project and replace it with a democratic vision.

<br>

It’s not necessary to have an opinion about whether to change your plans is right or wrong, I think it's relative. The question is another, with this example, what I would like to share is how important it is to know and control the entropy. As a great developer, Dev has managed to do what we all desire, to achieve our goals. As I described, from a specific point in the process, entropy starts to be relevant, a variable that Dev had not considered. But what is entropy in this area? In the simplest possible way, entropy can be explained as a measure of chaos that remains unchanged or increases over time.

![Img](https://a.storyblok.com/f/106240/1191x731/add4813309/explication-entropy.png)

By checking this sketch I ask myself a question: is there a better way to capture the variables Z, S, and X and consequently manage them?

To arrive to a possible answer, I first thought about answering myself through a smaller context, with fewer variables than those present in Dev's situation. As a great user of the Vue.js framework, I stopped to reflect on the store of this framework, Vuex.

For those who don't know what I'm talking about, Vuex, Vue's store, is a set of globally defined variables, through which these variables can be changed or simply read.

It is very easy to manipulate the data with Vuex but it is also risky because such data is accessible from any component/page/plugin... You must have the foresight to manage the various manipulations of the data correctly while maintaining zero entropy. In this case, to manage entropy it is necessary to define in each component a copy of the global data with an internal variable, so all the operations carried out on the new variable will remain in the context in which the latter was defined. This strategy is not always valid, if the modification of global data occurred in the Header component must be listened to by the Footer component, then we do nothing with the internal variable.

<br>

OK .. extrapolating from the Vuex example I more or less achieve to understand that the best way to manage entropy is the abstraction.

Now how do I apply the concept of abstraction to Dev's situation?

Trying to get there with associations: if our Dev is the Vuex store, the contributors are the components/pages/plugins, and the feedback and ideas of the users of the Dev's application are the operations done on the global data, defining the "internal variable" would mean representing this process: creating various beta versions of Dev's application where each of them adopts one of the contributors' ideas.  These parallel versions, formed from dissatisfaction with the original vision of Dev's product, are consequently tested by some beta testers. These beta testers are composed of groups of people selected on the basis of a shared idea of what they think the philosophy of Dev's application should be. In the end, the version that is most popular with the public is chosen as Dev's application release 2.0.

This representation, while utopian and ignorant of the limits of reality, is my response to the application of abstraction for entropy control.

---

If you appreciated the article, give it a like on [**dev.to**](https://dev.to/falcosan/the-entropy-of-states-5gbi).