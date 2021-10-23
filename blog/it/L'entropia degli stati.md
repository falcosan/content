Chi programma sa cosa vuole dire manipolare dati, spiegandolo brevemente significa manipolare un certo valore attraverso processi matematici (come una funzione per esempio) per definire un secondo valore. Replicando questo processo n volte e inserendo tutto in un insieme organizzato e ben strutturato, si crea un programma. In generale, questo è il modo standard di programmare, ma a volte manca qualcosa: la consapevolezza dell'entropia.

Faccio un esempio in sequenza temporale:

##### Premessa:

* Dev è un buon sviluppatore.

<br>

##### Processo:

 1. Dev fa un po' di brainstorming pensando alla visione finale del suo progetto definendo tutti i suoi obiettivi.
 2. Dev inizia a programmare e diventa consapevole di ciò che dovrà fare in pratica per far funzionare il tutto.
 3. Dev finisce di programmare e rilascia la sua prima versione della sua applicazione.
 4. Dev è felice.
 5. Avendo fatto tutto bene, molte persone iniziano ad usare l'applicazione di Dev.
 6. Il lavoro di Dev non è finito, deve continuare a migliorare sfruttando il feedback degli utenti e l'entusiasmo per il successo del progetto.
 7. Dev è riuscito nel suo intento, la sua applicazione diventa super popolare e attira persone da altre piattaforme simili a quella creata da lui (vince sulla concorrenza).
 8. Dev essendo un amante dell'open source, il suo codice è pubblico e alcuni collaboratori iniziano a presentare codice per correggere o aggiungere funzionalità (utile, ma difficile da gestire oltre un certo volume).
 9. Dev non può controllare le persone e le loro idee alle volte contrastanti una con l'altra.
10. La pressione sociale è insostenibile e Dev, influenzato da tutto questo, è costretto a rivedere la visione finale del suo progetto e sostituirla con una visione democratica.

<br>

Non bisogna necessariamente avere una opinione sul fatto che cambiare i propri piani sia giusto o sia sbagliato, penso che sia relativo. La questione è un'altra, con questo esempio, il pensiero che vorrei condividere è quanto sia importante conoscere e controllare l'entropia. Quel grande sviluppatore che è Dev è riuscito a raggiungere i suoi obiettivi, però, da un punto specifico del processo, Dev si trova costretto a cambiare qualcosa a causa dell'entropia, la variabile che lui non ha considerato. Ma cos'è l'entropia in questo ambito? Nel modo più semplice possibile, l'entropia può essere spiegata come una misura del caos che rimane invariata o aumenta nel tempo.

![Img](https://a.storyblok.com/f/106240/1191x731/add4813309/explication-entropy.png)

Guardando il disegno qui sopra mi pongo una domanda: c'è un modo per catturare le variabili Z, S e X e quindi calcolarle e gestirle?

Per arrivare ad una possibile risposta, ho prima pensato di rispondermi attraverso un contesto più piccolo con meno variabili di quelle presenti nella situazione di Dev. Da grande utilizzatore del framework Vue.js, mi sono fermato a riflettere sullo store di questo framework, Vuex.

Per coloro che non sanno di cosa sto parlando, Vuex, lo store di Vue, è un insieme di variabili definite globalmente, attraverso il quale tali variabili possono essere modificate o semplicemente lette.

È molto facile manipolare i dati con Vuex, ma è altrettanto rischioso poiché tali dati sono accessibili da qualsiasi componente/pagina/plugin... Bisogna avere la lungimiranza di gestire correttamente le varie manipolazioni dei dati mantenendo l'entropia zero. In questo caso, per gestire l'entropia è necessario definire in ogni componente/pagina/plugin una copia del dato globale con una variabile interna, cosicché tutte le operazioni effettuate sulla nuova variabile rimarranno nel contesto in cui quest'ultima è stata definita. Questa strategia non è sempre valida, se la modifica dei dati globali avvenuta nel componente Header deve essere ascoltata dal componente Footer, allora non ci facciamo nulla con la variabile interna.

<br>

OK .. estrapolando dall'esempio di Vuex più o meno riesco a capire che il modo migliore per gestire l'entropia è l'astrazione.

Ora come faccio ad applicare il concetto di astrazione alla situazione di Dev?

Provando ad arrivarci con le associazioni: se il nostro Dev è il negozio Vuex, i contributori sono i componenti/pagine/plugin e i feedback e le idee degli utenti dell'applicazione Dev sono le operazioni fatte sui dati globali, definire la "variabile interna" significherebbe rappresentare questo processo: creare varie versioni beta dell’applicazione di Dev dove ciascuna di esse adotta una delle idee dei contributori. Queste versioni parallele, formatesi dall’ insoddisfazione della visione originale del prodotto di Dev, vengono conseguentemente testate da alcuni beta tester. I beta tester in questione sono composti da gruppi di persone selezionate in base all’idea condivisa di come, secondo loro, debba essere la filosofia dell’applicazione di Dev. Infine, la versione che riscuote più gradimento da parte del pubblico, viene scelta come release 2.0 dell’applicazione di Dev.

Questa rappresentazione, pur essendo utopica e ignorante circa i limiti del reale, è la mia risposta all’applicazione dell’astrazione per il controllo dell’entropia.

---

Se l'articolo ti è piaciuto, mettigli un mi piace su **[dev.to](https://dev.to/falcosan/the-entropy-of-states-5gbi)**.